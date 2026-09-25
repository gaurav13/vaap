"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  History,
  Info,
  KeyRound,
  Loader2,
  Lock,
  PlayCircle,
  RefreshCw,
  Rocket,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react"
import {
  activateMainnet,
  activateSavedMainnet,
  activateTestnet,
  createGovernanceWallet,
  runXrplQueueNow,
} from "@/app/actions/xrpl-setup"

type Status = {
  network: "mainnet" | "testnet"
  ready: boolean
  address: string | null
  balanceXrp: number | null
  message: string
}

type Account = { address: string; source: "vars" | "saved"; createdAt: string | null }

type Tx = {
  hash: string
  type: string
  direction: "in" | "out" | "self"
  amountXrp: number | null
  feeXrp: number | null
  result: string
  date: string | null
  counterparty: string | null
}

type Details = {
  connected: boolean
  activated: boolean
  balanceXrp: number | null
  reserveXrp: number
  transactions: Tx[]
  error: string | null
}

type Feedback = { ok: boolean; text: string } | null
type ActionResult = { ok: boolean; message?: string; error?: string }

const explorerBase = (network: string) => `https://${network === "mainnet" ? "livenet" : "testnet"}.xrpl.org`
const explorerAccount = (network: string, address: string) => `${explorerBase(network)}/accounts/${address}`
const explorerTx = (network: string, hash: string) => `${explorerBase(network)}/transactions/${hash}`

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function short(value: string) {
  return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  return {
    copied,
    copy: async (value: string) => {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    },
  }
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const { copied, copy } = useCopy()
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
          onClick={() => copy(value)}
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

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <p role="status" className={`text-sm leading-relaxed ${feedback.ok ? "text-green" : "text-destructive"}`}>
      {feedback.text}
    </p>
  )
}

function Card({ title, icon, children, id }: { title: string; icon: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-line bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-heading">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  const dot = tone === "good" ? "bg-green" : tone === "warn" ? "bg-amber-500" : tone === "bad" ? "bg-destructive" : null
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-background p-3">
      <span className="text-xs font-medium text-muted-2">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-heading">
        {dot && <span className={`size-2 rounded-full ${dot}`} aria-hidden />}
        {value}
      </span>
    </div>
  )
}

const actionBtn =
  "inline-flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-sm font-semibold text-heading hover:bg-mint disabled:opacity-60"

const gateVariants = {
  primary: "bg-green text-white hover:bg-green-hover border border-green",
  outline: "border border-green bg-card text-green hover:bg-mint",
  neutral: "border border-line bg-background text-heading hover:bg-mint",
  danger: "border border-destructive bg-card text-destructive hover:bg-destructive/5",
} as const

function InfoGate({
  label,
  icon,
  title,
  points,
  acceptLabel = "Accept and continue",
  onAccept,
  disabled,
  disabledReason,
  busy,
  variant = "neutral",
}: {
  label: string
  icon?: React.ReactNode
  title: string
  points: string[]
  acceptLabel?: string
  onAccept: () => void
  disabled?: boolean
  disabledReason?: string
  busy?: boolean
  variant?: keyof typeof gateVariants
}) {
  const [open, setOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const close = () => {
    setOpen(false)
    setAgreed(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled || busy}
        title={disabled ? disabledReason : undefined}
        onClick={() => setOpen(true)}
        className={`inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${gateVariants[variant]}`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
        {label}
      </button>
    )
  }

  const danger = variant === "danger"
  return (
    <div
      role="region"
      aria-label={title}
      className={`flex w-full basis-full flex-col gap-3 rounded-xl border p-4 ${danger ? "border-destructive/40 bg-destructive/5" : "border-green/30 bg-mint"}`}
    >
      <h3 className="flex items-center gap-2 text-sm font-bold text-heading">
        <Info className={`size-4 shrink-0 ${danger ? "text-destructive" : "text-green"}`} />
        {title}
      </h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-9 text-sm leading-relaxed text-heading">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <label className="flex items-start gap-2 text-sm text-heading">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-4 accent-green"
        />
        <span className="leading-relaxed">I&apos;ve read this and understand what will happen.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!agreed || busy}
          onClick={() => {
            onAccept()
            close()
          }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${danger ? gateVariants.danger : gateVariants.primary}`}
        >
          <Check className="size-4" /> {acceptLabel}
        </button>
        <button type="button" onClick={close} className={actionBtn}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function GovernanceAccountCard({
  account,
  details,
  pending,
  onRefresh,
}: {
  account: Account
  details: Details | null
  pending: boolean
  onRefresh: () => void
}) {
  const { copied, copy } = useCopy()
  const last = details?.transactions[0] ?? null
  const funded = details?.activated && (details.balanceXrp ?? 0) >= 2

  return (
    <Card title="VAAP Governance Account" icon={<Lock className="size-5 text-green" />}>
      <div className="flex flex-col gap-2 rounded-xl border border-green/30 bg-mint p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">XRPL address (public)</span>
        <code className="break-all font-mono text-base font-semibold text-heading">{account.address}</code>
        <p className="text-xs leading-relaxed text-muted-2">
          This is the permanent account. Send XRP to this same address any time you need to top it up.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(account.address)} className={actionBtn}>
          {copied ? <Check className="size-4 text-green" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy Address"}
        </button>
        <a
          href={explorerAccount("mainnet", account.address)}
          target="_blank"
          rel="noopener noreferrer"
          className={actionBtn}
        >
          <ExternalLink className="size-4" /> View on XRPL Explorer
        </a>
        <button type="button" onClick={onRefresh} disabled={pending} className={actionBtn}>
          <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} /> Refresh Balance
        </button>
        <a href="#transactions" className={actionBtn}>
          <History className="size-4" /> Transaction History
        </a>
        <a href="#wallet-settings" className={actionBtn}>
          <Settings className="size-4" /> Wallet Settings
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Network" value="Mainnet" />
        <Stat
          label="XRP balance"
          value={details?.balanceXrp !== null && details?.balanceXrp !== undefined ? `${details.balanceXrp} XRP` : "0 XRP"}
        />
        <Stat
          label="Activation"
          value={!details?.connected ? "Unknown" : funded ? "Funded" : details.activated ? "Low balance" : "Not funded yet"}
          tone={!details?.connected ? undefined : funded ? "good" : "warn"}
        />
        <Stat
          label="Connection"
          value={details?.connected ? "Connected" : "Unreachable"}
          tone={details?.connected ? "good" : "bad"}
        />
        <Stat label="Last transaction" value={last ? formatDate(last.date) : "None yet"} />
        <Stat label="Reserve (locked)" value={`${details?.reserveXrp ?? 1} XRP`} />
      </div>

      {details?.connected && !details.activated && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-heading">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
          Send at least 2 XRP (5–10 recommended) to the address above from an exchange. Choose the XRP Ledger network and
          leave the destination tag empty. Then press Refresh Balance.
        </p>
      )}
      {details?.error && <p className="text-sm text-destructive">{details.error}</p>}
    </Card>
  )
}

function TransactionHistory({ details }: { details: Details | null }) {
  const txs = details?.transactions ?? []
  return (
    <Card id="transactions" title="Transaction history" icon={<History className="size-5 text-green" />}>
      {txs.length === 0 ? (
        <p className="text-sm text-muted-2">No transactions yet. Funding and vote records will appear here.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {txs.map((tx) => (
            <li key={tx.hash} className="flex items-center gap-3 py-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${tx.direction === "in" ? "bg-mint text-green" : "bg-background text-heading"}`}
              >
                {tx.direction === "in" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-heading">
                  {tx.direction === "in" ? "Received" : tx.direction === "self" ? "Vote record" : "Sent"}
                  <span className="font-normal text-muted-2"> · {tx.type}</span>
                </span>
                <span className="truncate text-xs text-muted-2">
                  {formatDate(tx.date)}
                  {tx.counterparty && tx.direction !== "self" ? ` · ${short(tx.counterparty)}` : ""}
                  {tx.result && tx.result !== "tesSUCCESS" ? ` · ${tx.result}` : ""}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                {tx.amountXrp !== null && tx.direction !== "self" && (
                  <span className={`text-sm font-semibold ${tx.direction === "in" ? "text-green" : "text-heading"}`}>
                    {tx.direction === "in" ? "+" : "−"}
                    {tx.amountXrp} XRP
                  </span>
                )}
                <a
                  href={explorerTx("mainnet", tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-green hover:underline"
                >
                  View <ExternalLink className="size-3" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function WalletSettings({
  account,
  pinned,
  pending,
  run,
}: {
  account: Account
  pinned: boolean
  pending: boolean
  run: (action: () => Promise<ActionResult>, set: (f: Feedback) => void) => void
}) {
  const [seed, setSeed] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)

  return (
    <Card id="wallet-settings" title="Wallet settings" icon={<Settings className="size-5 text-green" />}>
      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-2">Signing key stored in</dt>
          <dd className="font-semibold text-heading">
            {account.source === "vars" ? "Vercel Vars (XRPL_GOVERNANCE_SEED)" : "Server, encrypted (AES-256)"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-2">Account created</dt>
          <dd className="font-semibold text-heading">{formatDate(account.createdAt)}</dd>
        </div>
      </dl>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-2">
        <KeyRound className="mt-0.5 size-4 shrink-0" />
        The secret seed is never shown again after setup and is never sent to the browser.
      </p>

      {account.source === "vars" ? (
        <p className="text-sm leading-relaxed text-muted-2">
          To change this account, update <code className="font-mono">XRPL_GOVERNANCE_SEED</code> in Settings → Vars.
        </p>
      ) : (
        !pinned && (
          <details className="rounded-xl border border-destructive/30 bg-background p-4">
            <summary className="cursor-pointer text-sm font-semibold text-destructive">Replace Governance Wallet</summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-heading">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
                Only do this if the secret was lost or leaked. New vote records will come from the new account. Move any
                remaining XRP out of the old account first. Past records stay valid.
              </p>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Secret seed of the new, funded account (s…)"
                aria-label="New secret seed"
                className="rounded-lg border border-line bg-card px-3 py-2 font-mono text-sm text-heading outline-none focus:border-green"
              />
              <label className="flex flex-col gap-1.5 text-sm text-heading">
                <span>
                  Type <strong>REPLACE</strong> to confirm
                </span>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-40 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-green"
                  aria-label="Type REPLACE to confirm"
                />
              </label>
              <InfoGate
                label="Replace wallet"
                variant="danger"
                title="Before you replace the governance wallet"
                points={[
                  "All new vote records will be signed by the new account from now on.",
                  "The old account will no longer be used. Move any XRP left in it out first — the app cannot do this for you.",
                  "Records already on the ledger stay valid and verifiable.",
                  "The new account must already be funded with at least 2 XRP, or recording will fail.",
                ]}
                acceptLabel="Replace wallet"
                disabled={!seed.trim() || confirmText !== "REPLACE"}
                disabledReason="Enter the new seed and type REPLACE first"
                busy={pending}
                onAccept={() => run(() => activateMainnet(seed, true), setFeedback)}
              />
              <FeedbackLine feedback={feedback} />
            </div>
          </details>
        )
      )}
    </Card>
  )
}

function CreateAccount({
  pinned,
  pending,
  run,
  onCreated,
}: {
  pinned: boolean
  pending: boolean
  run: (action: () => Promise<ActionResult>, set: (f: Feedback) => void) => void
  onCreated: (seed: string) => void
}) {
  const [creating, startCreate] = useTransition()
  const router = useRouter()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [existingSeed, setExistingSeed] = useState("")
  const [existingFeedback, setExistingFeedback] = useState<Feedback>(null)

  return (
    <Card title="Create the VAAP Governance Account" icon={<Wallet className="size-5 text-green" />}>
      <p className="text-sm leading-relaxed text-muted-2">
        This is done once. The account is saved securely on the server straight away, so it stays here after you leave
        the page and you can fund it whenever you&apos;re ready.
      </p>
      <InfoGate
        label="Create governance account"
        icon={<Wallet className="size-4" />}
        variant="primary"
        title="Before you create the governance account"
        points={[
          "A new XRP Ledger account is created once and becomes the permanent VAAP Governance Account.",
          "Its secret seed is shown only one time, right after creation. You must write it down and keep it offline.",
          "The account is empty at first. It only works after you send it at least 2 XRP (5–10 recommended).",
          "1 XRP stays locked by the XRP Ledger as a reserve and can't be spent.",
        ]}
        acceptLabel="Create account"
        busy={creating}
        onAccept={() =>
          startCreate(async () => {
            const res = await createGovernanceWallet()
            if (res.ok) {
              onCreated(res.seed)
              router.refresh()
            } else setFeedback({ ok: false, text: res.error })
          })
        }
      />
      <FeedbackLine feedback={feedback} />

      <details className="rounded-xl border border-line bg-background p-4">
        <summary className="cursor-pointer text-sm font-semibold text-heading">I already have a funded account</summary>
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={existingSeed}
            onChange={(e) => setExistingSeed(e.target.value)}
            placeholder="Secret seed (s…)"
            aria-label="Existing secret seed"
            className="rounded-lg border border-line bg-card px-3 py-2 font-mono text-sm text-heading outline-none focus:border-green"
          />
          <InfoGate
            label="Save and go live"
            icon={<Rocket className="size-4" />}
            variant="primary"
            title="Before you save this account and go live"
            points={[
              "This account becomes the permanent VAAP Governance Account and is stored encrypted on the server.",
              "Voting results will start being recorded on the XRP Ledger Mainnet, which is public and permanent.",
              "Each record costs a tiny fee (about 0.00001 XRP), paid from this account.",
              "Use a dedicated account only. Don't use your payment wallet or an exchange account.",
            ]}
            acceptLabel="Save and go live"
            disabled={pinned || !existingSeed.trim()}
            disabledReason={pinned ? "The network is fixed in Vars" : "Paste the secret seed first"}
            busy={pending}
            onAccept={() => run(() => activateMainnet(existingSeed), setExistingFeedback)}
          />
          <FeedbackLine feedback={existingFeedback} />
        </div>
      </details>
    </Card>
  )
}

function SeedBackup({ seed, onDone }: { seed: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false)
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-heading">
        <KeyRound className="size-5 text-amber-700" /> Back up the secret seed now
      </h2>
      <p className="text-sm leading-relaxed text-heading">
        The account is saved. This is the only time the secret seed will be shown. Write it down and keep it somewhere
        safe offline. It&apos;s the only way to recover the account if the server key is ever lost.
      </p>
      <CopyField label="Secret seed (private)" value={seed} secret />
      <label className="flex items-start gap-2 text-sm text-heading">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5 size-4 accent-green"
        />
        <span className="leading-relaxed">I&apos;ve saved the secret seed offline.</span>
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={onDone}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-hover disabled:opacity-50"
      >
        <Check className="size-4" /> Done, hide the seed
      </button>
    </section>
  )
}

export function XrplSetupWizard({
  status,
  pinned,
  account,
  details,
}: {
  status: Status
  pinned: boolean
  account: Account | null
  details: Details | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [newSeed, setNewSeed] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [queueFeedback, setQueueFeedback] = useState<Feedback>(null)

  function run(action: () => Promise<ActionResult>, set: (f: Feedback) => void) {
    startTransition(async () => {
      const res = await action()
      set({ ok: res.ok, text: res.ok ? (res.message ?? "Done") : (res.error ?? "Something went wrong") })
      if (res.ok) router.refresh()
    })
  }

  const live = status.network === "mainnet"
  const canGoLive = details?.activated && (details.balanceXrp ?? 0) >= 2

  return (
    <div className="flex flex-col gap-4">
      <section
        className={`flex flex-col gap-3 rounded-2xl border p-5 ${status.ready ? "border-green/30 bg-mint" : "border-amber-300 bg-amber-50"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className={`size-5 ${status.ready ? "text-green" : "text-amber-700"}`} />
          <h2 className="text-base font-bold text-heading">
            {status.ready ? "Voting is being recorded on the XRP Ledger" : "XRP Ledger needs attention"}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${live ? "bg-green text-white" : "bg-card text-heading"}`}
          >
            Recording on {live ? "Mainnet" : "Testnet"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-2">{status.message}</p>
        <div className="flex flex-wrap items-center gap-3">
          <InfoGate
            label="Record waiting results now"
            icon={<PlayCircle className="size-4" />}
            variant="outline"
            title="Before you record waiting results"
            points={[
              `Every result in the queue will be written to the XRP Ledger ${live ? "Mainnet" : "Testnet"} right now instead of waiting for the scheduled job.`,
              "Records written to the ledger are public and can't be edited or deleted.",
              live
                ? "Each record costs a tiny fee (about 0.00001 XRP) from the governance account."
                : "Testnet uses free test XRP, so nothing real is spent.",
              "Results that fail are kept in the queue and retried automatically.",
            ]}
            acceptLabel="Record now"
            busy={pending}
            onAccept={() => run(runXrplQueueNow, setQueueFeedback)}
          />
          {account && !live && !pinned && (
            <InfoGate
              label="Go live on Mainnet"
              icon={<Rocket className="size-4" />}
              variant="primary"
              title="Before you go live on Mainnet"
              points={[
                "From now on, every closed proposal and vote record is written to the real XRP Ledger Mainnet.",
                "Mainnet records are public, permanent and can be checked by anyone on the XRPL Explorer.",
                "Fees are paid in real XRP from the VAAP Governance Account. Keep it topped up above 2 XRP.",
                "Records already made on Testnet stay on Testnet. They are not copied to Mainnet.",
              ]}
              acceptLabel="Go live"
              disabled={!canGoLive}
              disabledReason="Fund the governance account with at least 2 XRP first"
              busy={pending}
              onAccept={() => run(activateSavedMainnet, setFeedback)}
            />
          )}
          {live && !pinned && (
            <InfoGate
              label="Switch back to Testnet"
              title="Before you switch back to Testnet"
              points={[
                "New results will be recorded on Testnet, which is for testing only and has no real value.",
                "Members' votes will no longer be anchored on the real ledger until you go live again.",
                "Records already on Mainnet stay there and remain valid.",
                "The VAAP Governance Account and its XRP are not changed.",
              ]}
              acceptLabel="Switch to Testnet"
              busy={pending}
              onAccept={() => run(activateTestnet, setFeedback)}
            />
          )}
        </div>
        <FeedbackLine feedback={queueFeedback} />
        <FeedbackLine feedback={feedback} />
        {pinned && (
          <p className="text-sm leading-relaxed text-muted-2">
            The network is fixed by <code className="font-mono">XRPL_NETWORK</code> in Vars.
          </p>
        )}
      </section>

      {newSeed && <SeedBackup seed={newSeed} onDone={() => setNewSeed(null)} />}

      {account ? (
        <>
          <GovernanceAccountCard
            account={account}
            details={details}
            pending={pending}
            onRefresh={() => startTransition(() => router.refresh())}
          />
          <TransactionHistory details={details} />
          <WalletSettings account={account} pinned={pinned} pending={pending} run={run} />
        </>
      ) : (
        <CreateAccount pinned={pinned} pending={pending} run={run} onCreated={setNewSeed} />
      )}

      {!live && status.address && (
        <details className="rounded-2xl border border-line bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold text-heading">
            Testnet rehearsal account (free test XRP)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-muted-2">
              Until you go live, results are recorded on Testnet with this separate test account. It is not the VAAP
              Governance Account and holds no real XRP.
            </p>
            <CopyField label="Testnet address" value={status.address} />
            <a
              href={explorerAccount("testnet", status.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-green hover:underline"
            >
              View on testnet explorer <ExternalLink className="size-3.5" />
            </a>
          </div>
        </details>
      )}
    </div>
  )
}
