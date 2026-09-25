"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  PlayCircle,
  RefreshCw,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react"
import { activateMainnet, activateSavedMainnet, activateTestnet, runXrplQueueNow } from "@/app/actions/xrpl-setup"

type Status = {
  network: "mainnet" | "testnet"
  ready: boolean
  address: string | null
  balanceXrp: number | null
  message: string
}

type Generated = { address: string; seed: string }
type Feedback = { ok: boolean; text: string } | null

function explorerAccount(network: string, address: string) {
  return `https://${network === "mainnet" ? "livenet" : "testnet"}.xrpl.org/accounts/${address}`
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [shown, setShown] = useState(!secret)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-heading">
          {shown ? value : "•".repeat(Math.min(value.length, 32))}
        </code>
        {secret && (
          <button type="button" onClick={() => setShown((s) => !s)} className="text-xs font-medium text-green hover:underline">
            {shown ? "Hide" : "Show"}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-heading hover:bg-mint"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-3.5 text-green" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green text-sm font-bold text-white">
          {n}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 className="text-base font-bold text-heading">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <p role="status" className={`text-sm leading-relaxed ${feedback.ok ? "text-green" : "text-destructive"}`}>
      {feedback.text}
    </p>
  )
}

export function XrplSetupWizard({
  status,
  pinned,
  savedMainnetAddress,
}: {
  status: Status
  pinned: boolean
  savedMainnetAddress: string | null
}) {
  const router = useRouter()
  const [replaceSeed, setReplaceSeed] = useState("")
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [replaceFeedback, setReplaceFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()
  const [wallet, setWallet] = useState<Generated | null>(null)
  const [seedInput, setSeedInput] = useState("")
  const [saved, setSaved] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [queueFeedback, setQueueFeedback] = useState<Feedback>(null)

  async function generate() {
    const { Wallet: XrplWallet } = await import("xrpl")
    const w = XrplWallet.generate()
    setWallet({ address: w.classicAddress, seed: w.seed as string })
    setSeedInput(w.seed as string)
    setSaved(false)
    setFeedback(null)
  }

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>, set: (f: Feedback) => void) {
    startTransition(async () => {
      const res = await action()
      set({ ok: res.ok, text: res.ok ? (res.message ?? "Done") : (res.error ?? "Something went wrong") })
      if (res.ok) router.refresh()
    })
  }

  const live = status.network === "mainnet"

  return (
    <div className="flex flex-col gap-4">
      <section
        className={`flex flex-col gap-3 rounded-2xl border p-5 ${status.ready ? "border-green/30 bg-mint" : "border-amber-300 bg-amber-50"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className={`size-5 ${status.ready ? "text-green" : "text-amber-700"}`} />
          <h2 className="text-base font-bold text-heading">
            {status.ready ? "Voting system is live on the XRP Ledger" : "XRP Ledger needs attention"}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${live ? "bg-green text-white" : "bg-card text-heading"}`}
          >
            {live ? "Mainnet" : "Testnet"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-2">{status.message}</p>
        {status.address && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-heading">
            <span>
              Account <code className="font-mono">{status.address}</code>
            </span>
            {status.balanceXrp !== null && <span>Balance {status.balanceXrp} XRP</span>}
            <a
              href={explorerAccount(status.network, status.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-green hover:underline"
            >
              View on explorer <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(runXrplQueueNow, setQueueFeedback)}
            className="inline-flex items-center gap-2 rounded-lg border border-green bg-card px-4 py-2 text-sm font-semibold text-green hover:bg-mint disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
            Record waiting results now
          </button>
          <FeedbackLine feedback={queueFeedback} />
        </div>
      </section>

      {pinned && (
        <p className="rounded-xl border border-line bg-card p-4 text-sm leading-relaxed text-muted-2">
          The network is fixed by the <code className="font-mono">XRPL_NETWORK</code> variable in Vars. Remove it there to
          manage the network from this page.
        </p>
      )}

      <Step n={1} title="Testnet: free, already working">
        <p className="text-sm leading-relaxed text-muted-2">
          On Testnet the site creates and funds its own account with free test XRP, and records every closed proposal
          automatically. Use it to rehearse a vote with members before going live.
        </p>
        {!live && status.address && (
          <div className="flex flex-col gap-3 rounded-xl border border-green/30 bg-mint p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-heading">
              <Lock className="size-4 text-green" /> Saved and locked. The same test account is reused for every record.
            </div>
            <CopyField label="Testnet account address (public)" value={status.address} />
            {status.balanceXrp !== null && (
              <p className="text-sm text-heading">Balance: {status.balanceXrp} test XRP</p>
            )}
            <a
              href={explorerAccount("testnet", status.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-green hover:underline"
            >
              View on testnet explorer <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}
        {live && !pinned && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(activateTestnet, setFeedback)}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-line bg-background px-4 py-2 text-sm font-semibold text-heading hover:bg-mint disabled:opacity-60"
            >
              Switch back to Testnet
            </button>
          </div>
        )}
      </Step>

      {savedMainnetAddress ? (
        <Step n={2} title="Your permanent mainnet account">
          <div className="flex flex-col gap-3 rounded-xl border border-green/30 bg-mint p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-heading">
              <Lock className="size-4 text-green" /> Saved and locked. This account is used for every vote record.
            </div>
            <CopyField label="Account address (public)" value={savedMainnetAddress} />
            <a
              href={explorerAccount("mainnet", savedMainnetAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-green hover:underline"
            >
              View balance on explorer <ExternalLink className="size-3.5" />
            </a>
          </div>

          {!live && !pinned && (
            <div className="flex flex-col gap-2">
              <p className="text-sm leading-relaxed text-muted-2">
                Once it holds at least 2 XRP, switch the site to mainnet using this same account.
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(activateSavedMainnet, setFeedback)}
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-hover disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                Go live with this account
              </button>
              <FeedbackLine feedback={feedback} />
            </div>
          )}

          {!pinned && (
            <details className="rounded-xl border border-line bg-background p-4">
              <summary className="cursor-pointer text-sm font-semibold text-heading">Replace account (advanced)</summary>
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-muted-2">
                  Only do this if the secret was lost or leaked. Past records stay valid on the old account.
                </p>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={replaceSeed}
                  onChange={(e) => setReplaceSeed(e.target.value)}
                  placeholder="New secret seed (s…)"
                  aria-label="New secret seed"
                  className="rounded-lg border border-line bg-card px-3 py-2 font-mono text-sm text-heading outline-none focus:border-green"
                />
                <label className="flex items-start gap-2 text-sm text-heading">
                  <input
                    type="checkbox"
                    checked={confirmReplace}
                    onChange={(e) => setConfirmReplace(e.target.checked)}
                    className="mt-0.5 size-4 accent-green"
                  />
                  <span className="leading-relaxed">I understand this changes the account used for new records.</span>
                </label>
                <button
                  type="button"
                  disabled={pending || !replaceSeed.trim() || !confirmReplace}
                  onClick={() => run(() => activateMainnet(replaceSeed, true), setReplaceFeedback)}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  Replace account
                </button>
                <FeedbackLine feedback={replaceFeedback} />
              </div>
            </details>
          )}
        </Step>
      ) : (
      <>
      <Step n={2} title="Create the mainnet account">
        <p className="text-sm leading-relaxed text-muted-2">
          This makes a brand-new XRPL account in your browser. Don&apos;t reuse the membership payment wallet.
        </p>
        <button
          type="button"
          onClick={generate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-hover"
        >
          {wallet ? <RefreshCw className="size-4" /> : <Wallet className="size-4" />}
          {wallet ? "Generate a different one" : "Generate XRPL account"}
        </button>
        {wallet && (
          <div className="flex flex-col gap-3">
            <CopyField label="Account address (public, starts with r)" value={wallet.address} />
            <CopyField label="Secret seed (private, starts with s)" value={wallet.seed} secret />
            <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-heading">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
                className="mt-0.5 size-4 accent-green"
              />
              <span className="leading-relaxed">
                I&apos;ve saved the secret seed offline (for example on paper in a safe). Anyone with it controls the
                account, and it can&apos;t be recovered if lost.
              </span>
            </label>
          </div>
        )}
      </Step>

      <Step n={3} title="Send real XRP to the account">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-2">
          <li>
            Buy about <strong>5–10 XRP</strong> on an exchange you already use.
          </li>
          <li>
            Choose <strong>Withdraw → XRP</strong> on the <strong>XRP Ledger</strong> network and paste the account address
            from step 2. Leave the destination tag empty; it&apos;s your own account.
          </li>
          <li>1 XRP stays locked as the account reserve. Each record costs about 0.00001 XRP, so this lasts for years.</li>
        </ol>
        {wallet && (
          <a
            href={explorerAccount("mainnet", wallet.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-green hover:underline"
          >
            Check whether the XRP has arrived <ExternalLink className="size-3.5" />
          </a>
        )}
      </Step>

      <Step n={4} title="Go live on mainnet">
        <p className="text-sm leading-relaxed text-muted-2">
          This checks the account is funded, then stores the seed encrypted on the server so the site can sign records.
          If you already have an account, paste its seed below.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">Secret seed</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="s…"
            className="rounded-lg border border-line bg-background px-3 py-2 font-mono text-sm text-heading outline-none focus:border-green"
          />
        </label>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={pending || pinned || !seedInput.trim() || (wallet !== null && !saved)}
            onClick={() => run(() => activateMainnet(seedInput), setFeedback)}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-hover disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Verify and go live
          </button>
          {wallet && !saved && (
            <p className="flex items-center gap-1.5 text-xs text-muted-2">
              <TriangleAlert className="size-3.5" /> Confirm you&apos;ve saved the seed in step 2 first.
            </p>
          )}
          <FeedbackLine feedback={feedback} />
        </div>
      </Step>
      </>
      )}
    </div>
  )
}
