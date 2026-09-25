import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSession, isAdmin } from "@/lib/session"
import { getXrplNetwork } from "@/lib/xrpl-network"
import { XrplSetupWizard } from "@/components/governance/xrpl-setup-wizard"

export const dynamic = "force-dynamic"
export const metadata = { title: "XRPL Setup | Admin" }

export default async function XrplSetupPage() {
  const session = await getSession()
  if (!isAdmin(session?.user?.role)) redirect("/admin/governance")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/admin/governance" className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-green">
          <ArrowLeft className="size-4" /> Proposals &amp; Voting
        </Link>
        <h1 className="text-2xl font-bold text-heading text-balance">XRP Ledger setup</h1>
        <p className="text-sm leading-relaxed text-muted-2 text-pretty">
          Create the account that records vote results on the XRP Ledger. No outside wallet app is needed.
        </p>
      </div>
      <XrplSetupWizard currentNetwork={getXrplNetwork()} configured={Boolean(process.env.XRPL_GOVERNANCE_SEED)} />
    </div>
  )
}
