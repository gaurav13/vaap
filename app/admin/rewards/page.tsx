import { getRewardsQueue } from "@/app/actions/admin-referrals"
import { RewardsManager } from "@/components/admin/rewards-manager"

export const dynamic = "force-dynamic"

export default async function AdminRewardsPage() {
  const { rewards, payments } = await getRewardsQueue()
  return <RewardsManager rewards={rewards} payments={payments} />
}
