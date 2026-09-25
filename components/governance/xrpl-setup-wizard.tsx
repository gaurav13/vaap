"use client"

import { useState } from "react"
import { Check, Copy, KeyRound, Loader2, RefreshCw, Wallet, Droplets, ExternalLink, TriangleAlert } from "lucide-react"

type Generated = { address: string; seed: string }

function randomSecret(length = 48) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
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

export function XrplSetupWizard({ currentNetwork, configured }: { currentNetwork: string; configured: boolean }) {
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet")
  const [wallet, setWallet] = useState<Generated | null>(null)
  const [generating, setGenerating] = useState(false)
  const [cronSecret, setCronSecret] = useState(() => randomSecret())
  const [funding, setFunding] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [fundMsg, setFundMsg] = useState("")

  async function generate() {
    setGenerating(true)
    setFunding("idle")
    try {
      const { Wallet } = await import("xrpl")
      const w = Wallet.generate()
      setWallet({ address: w.classicAddress, seed: w.seed as string })
    } finally {
      setGenerating(false)
    }
  }

  async function fundTestnet() {
    if (!wallet) return
    setFunding("loading")
    try {
      const res = await fetch("https://faucet.altnet.rippletest.net/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: wallet.address }),
      })
      if (!res.ok) throw new Error(`Faucet returned ${res.status}`)
      const data = await res.json()
      setFunding("done")
      setFundMsg(`Funded with ${data?.amount ?? "test"} XRP. It can take ~10 seconds to show on the explorer.`)
    } catch {
      setFunding("error")
      setFundMsg("The test faucet didn't respond. Try again in a minute, or paste the address into xrpl.org's faucet page.")
    }
  }

  const explorerHost = network === "mainnet" ? "livenet.xrpl.org" : "testnet.xrpl.org"

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-2xl border p-4 text-sm ${configured ? "border-green/30 bg-mint" : "border-amber-300 bg-amber-50"}`}>
        <p className="text-heading">
          Current status: <strong>{configured ? "Wallet configured" : "Not configured yet"}</strong> on{" "}
          <strong>{currentNetwork === "mainnet" ? "Mainnet" : "Testnet"}</strong>.
        </p>
      </div>

      <Step n={1} title="Choose a network">
        <p className="text-sm leading-relaxed text-muted-2">
          Start with <strong>Testnet</strong>: it uses free play-money XRP so you can check everything works. Switch to
          Mainnet when you&apos;re ready to go live.
        </p>
        <div role="radiogroup" aria-label="Network" className="flex flex-wrap gap-2">
          {(["testnet", "mainnet"] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={network === n}
              onClick={() => {
                setNetwork(n)
                setWallet(null)
                setFunding("idle")
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                network === n ? "border-green bg-green text-white" : "border-line bg-background text-heading hover:bg-mint"
              }`}
            >
              {n === "testnet" ? "Testnet (free, for trying out)" : "Mainnet (real XRP)"}
            </button>
          ))}
        </div>
      </Step>

      <Step n={2} title="Create the XRPL account (address + seed)">
        <p className="text-sm leading-relaxed text-muted-2">
          This creates a brand-new XRPL account <strong>inside your browser</strong>. The secret seed is never sent to
          our server or anyone else. The same seed works on Testnet and Mainnet, but make a separate one for each.
        </p>
        <div>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-hover disabled:opacity-60"
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : wallet ? <RefreshCw className="size-4" /> : <Wallet className="size-4" />}
            {wallet ? "Generate a different one" : "Generate XRPL account"}
          </button>
        </div>

        {wallet && (
          <div className="flex flex-col gap-3">
            <CopyField label="Account address (public, starts with r)" value={wallet.address} />
            <CopyField label="Secret seed (private, starts with s)" value={wallet.seed} secret />
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-heading">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <p className="leading-relaxed">
                Save the seed now, for example written on paper in a safe place. It disappears when you leave this page and
                can&apos;t be recovered. Anyone with the seed controls the account.
              </p>
            </div>
          </div>
        )}
      </Step>

      <Step n={3} title={network === "testnet" ? "Add free test XRP" : "Fund the account with real XRP"}>
        {network === "testnet" ? (
          <>
            <p className="text-sm leading-relaxed text-muted-2">
              A new account only exists on the ledger once it holds XRP. On Testnet this is free.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={fundTestnet}
                disabled={!wallet || funding === "loading" || funding === "done"}
                className="inline-flex items-center gap-2 rounded-lg border border-green px-4 py-2.5 text-sm font-semibold text-green hover:bg-mint disabled:opacity-50"
              >
                {funding === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Droplets className="size-4" />}
                {funding === "done" ? "Funded" : "Get free test XRP"}
              </button>
              {!wallet && <span className="text-xs text-muted-2">Generate the account first.</span>}
            </div>
            {fundMsg && (
              <p className={`text-sm ${funding === "error" ? "text-destructive" : "text-green"}`} role="status">
                {fundMsg}
              </p>
            )}
          </>
        ) : (
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-2">
            <li>
              Buy about <strong>5–10 XRP</strong> on an exchange you already use (for example Binance, Kraken, Bitstamp or a
              local Pakistani exchange that supports XRP withdrawals).
            </li>
            <li>
              Choose <strong>Withdraw → XRP</strong>, network <strong>XRP Ledger (XRP)</strong>, and paste the account
              address from step 2.
            </li>
            <li>
              If the exchange asks for a <strong>destination tag / memo</strong>, leave it empty or tick &quot;no tag&quot;
              — it&apos;s your own account.
            </li>
            <li>
              Send it. 1 XRP is locked as the account reserve; each vote record costs about 0.00001 XRP, so 5–10 XRP lasts
              years.
            </li>
          </ol>
        )}
        {wallet && (
          <a
            href={`https://${explorerHost}/accounts/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-green hover:underline"
          >
            Check the balance on the explorer <ExternalLink className="size-3.5" />
          </a>
        )}
      </Step>

      <Step n={4} title="Create the background-job password">
        <p className="text-sm leading-relaxed text-muted-2">
          This random password stops strangers from triggering the anchoring job. You never need to type it again.
        </p>
        <CopyField label="CRON_SECRET" value={cronSecret} secret />
        <div>
          <button
            type="button"
            onClick={() => setCronSecret(randomSecret())}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-green hover:underline"
          >
            <RefreshCw className="size-3.5" /> Make a new one
          </button>
        </div>
      </Step>

      <Step n={5} title="Paste the three values into v0">
        <p className="text-sm leading-relaxed text-muted-2">
          In v0, open <strong>Settings (top right) → Vars</strong>, click <strong>Add</strong> for each row, then publish the
          site again.
        </p>
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-mint text-xs uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="px-3 py-2 font-mono text-heading">XRPL_NETWORK</td>
                <td className="px-3 py-2 font-mono text-heading">{network}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-heading">XRPL_GOVERNANCE_SEED</td>
                <td className="px-3 py-2 text-muted-2">the secret seed from step 2</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-heading">CRON_SECRET</td>
                <td className="px-3 py-2 text-muted-2">the password from step 4</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-2">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-green" />
          After publishing, return to Proposals &amp; Voting. The XRP Ledger panel should say &quot;Ready&quot; and show your
          address and balance.
        </p>
      </Step>
    </div>
  )
}
