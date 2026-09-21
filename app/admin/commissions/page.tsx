import { getCommissionRules } from "@/app/actions/admin-referrals"
import { CommissionManager } from "@/components/admin/commission-manager"

export const dynamic = "force-dynamic"

export default async function AdminCommissionsPage() {
  const rules = await getCommissionRules()
  return <CommissionManager rules={rules} />
}
