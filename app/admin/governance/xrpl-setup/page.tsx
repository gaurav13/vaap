import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSession, isAdmin } from "@/lib/session"
import { getXrplStatus } from "@/lib/xrpl"
import { getGovernanceAccountInfo, isNetworkPinnedByEnv } from "@/lib/xrpl-config"
import { getAccountDetails } from "@/lib/xrpl-account"
import { XrplSetupWizard } from "@/components/governance/xrpl-setup-wizard"

export const dynamic = "force-dynamic"
export const metadata = { title: "XRPL Governance Account | Admin" }

export default async function XrplSetupPage() {
  const session = await getSession()
  if (!isAdmin(session?.user?.role)) redirect("/admin/governance")

  const [status, account] = await Promise.all([getXrplStatus(), getGovernanceAccountInfo()])
  const details = account ? await getAccountDetails("mainnet", account.address) : null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/admin/governance" className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-green">
          <ArrowLeft className="size-4" /> Proposals &amp; Voting
        </Link>
        <h1 className="text-2xl font-bold text-heading text-balance">XRPL Governance Account</h1>
        <p className="text-sm leading-relaxed text-muted-2 text-pretty">
          VAAP&apos;s one permanent XRP Ledger account. Every closed vote is recorded from this account.
        </p>
      </div>
      <XrplSetupWizard
        status={{
          network: status.network,
          ready: status.ready,
          address: status.address,
          balanceXrp: status.balanceXrp,
          message: status.message,
        }}
        pinned={isNetworkPinnedByEnv()}
        account={account}
        details={details}
      />
    </div>
  )
}
