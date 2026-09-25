import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSession, isAdmin } from "@/lib/session"
import { getXrplStatus } from "@/lib/xrpl"
import { isNetworkPinnedByEnv } from "@/lib/xrpl-config"
import { XrplSetupWizard } from "@/components/governance/xrpl-setup-wizard"

export const dynamic = "force-dynamic"
export const metadata = { title: "XRPL Setup | Admin" }

export default async function XrplSetupPage() {
  const session = await getSession()
  if (!isAdmin(session?.user?.role)) redirect("/admin/governance")

  const status = await getXrplStatus()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/admin/governance" className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-green">
          <ArrowLeft className="size-4" /> Proposals &amp; Voting
        </Link>
        <h1 className="text-2xl font-bold text-heading text-balance">XRP Ledger setup</h1>
        <p className="text-sm leading-relaxed text-muted-2 text-pretty">
          Choose where vote results are recorded and activate it here. No outside wallet app or Vars are needed.
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
      />
    </div>
  )
}
