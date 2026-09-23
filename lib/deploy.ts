import { spawn } from "node:child_process"
import { constants, closeSync, copyFileSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs"
import path from "node:path"

const LOCK_PATH = "/tmp/vaap-deploy.lock"
const DEFAULT_DIR = "/var/www/vaap"
const DEFAULT_APP = "vaap"
const TIMEOUT_MS = 15 * 60 * 1000
const STEP_TOTAL = 6

export type DeployEvent =
  | { type: "step"; index: number; total: number; name: string }
  | { type: "log"; stream: "stdout" | "stderr"; text: string }
  | { type: "done"; ok: boolean; message: string }

function deployDir() {
  const dir = path.resolve(process.env.DEPLOY_DIR || DEFAULT_DIR)
  if (!dir.startsWith("/")) {
    throw new Error("DEPLOY_DIR must be an absolute path")
  }
  return dir
}

function redact(text: string) {
  return text.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgresql://[redacted]")
}

function pidAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function acquireDeployLock(): boolean {
  try {
    const fd = openSync(LOCK_PATH, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600)
    writeSync(fd, String(process.pid))
    closeSync(fd)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "EEXIST") throw error
    try {
      const pid = Number(readFileSync(LOCK_PATH, "utf8"))
      if (!pidAlive(pid)) {
        unlinkSync(LOCK_PATH)
        return acquireDeployLock()
      }
    } catch {
      return false
    }
    return false
  }
}

export function releaseDeployLock() {
  try {
    const pid = Number(readFileSync(LOCK_PATH, "utf8"))
    if (pid === process.pid) unlinkSync(LOCK_PATH)
  } catch {
    // already released
  }
}

function consume(stream: "stdout" | "stderr", chunk: string, emit: (event: DeployEvent) => void, stepIndex: { current: number }) {
  for (const line of chunk.split("\n")) {
    if (!line) continue
    if (line.startsWith("::step::")) {
      stepIndex.current += 1
      emit({
        type: "step",
        index: stepIndex.current,
        total: STEP_TOTAL,
        name: line.slice("::step::".length),
      })
      continue
    }
    emit({ type: "log", stream, text: `${line}\n` })
  }
}

export async function runDeploy(emit: (event: DeployEvent) => void) {
  const cwd = deployDir()
  const source = path.join(cwd, "scripts", "deploy.sh")
  const runtime = "/tmp/vaap-deploy-run.sh"
  try {
    copyFileSync(source, runtime)
  } catch {
    throw new Error(`Deploy script not found at ${source}`)
  }

  const app = process.env.PM2_APP || DEFAULT_APP
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  const stepIndex = { current: 0 }

  await new Promise<void>((resolve, reject) => {
    const child = spawn("bash", [runtime], {
      cwd,
      env: { ...process.env, DEPLOY_DIR: cwd, SKIP_PM2_RESTART: "1", PM2_APP: app },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      signal,
    })

    const buffers = { stdout: "", stderr: "" }
    const take = (stream: "stdout" | "stderr", chunk: Buffer) => {
      buffers[stream] += redact(chunk.toString("utf8"))
      const lines = buffers[stream].split("\n")
      buffers[stream] = lines.pop() ?? ""
      consume(stream, lines.join("\n"), emit, stepIndex)
    }

    child.stdout.on("data", (chunk: Buffer) => take("stdout", chunk))
    child.stderr.on("data", (chunk: Buffer) => take("stderr", chunk))
    child.on("error", (error) => {
      reject(signal.aborted ? new Error("Deploy timed out") : error)
    })
    child.on("close", (code) => {
      if (buffers.stdout) consume("stdout", buffers.stdout, emit, stepIndex)
      if (buffers.stderr) consume("stderr", buffers.stderr, emit, stepIndex)
      if (signal.aborted) reject(new Error("Deploy timed out"))
      else if (code === 0) resolve()
      else reject(new Error(`Deploy script failed (exit ${code ?? "unknown"})`))
    })
  })

  emit({ type: "step", index: STEP_TOTAL, total: STEP_TOTAL, name: "Restart application" })
  emit({ type: "log", stream: "stdout", text: `$ pm2 restart ${app}\n` })
  emit({
    type: "done",
    ok: true,
    message: "Schema synced and build finished. PM2 is restarting the app.",
  })

  // Restart after the response is flushed. Detach so PM2 can recycle this process.
  const timer = setTimeout(() => {
    const child = spawn("pm2", ["restart", app], {
      cwd,
      env: process.env,
      detached: true,
      stdio: "ignore",
      shell: false,
    })
    child.unref()
  }, 750)
  timer.unref()
}
