import { asc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { membershipPlans } from "@/lib/db/schema"
import { currentOperator, isSuperAdminActor } from "@/lib/rbac"
import { listPromotions, recordPromotionExpirations } from "@/app/actions/promotions"
import { feeToNumber } from "@/lib/promotions-shared"
import { PromotionManager, type AdminPromotion } from "@/components/admin/promotion-manager"

export default async function AdminMembershipPromotionsPage() {
  const actor = await currentOperator()
  if (!isSuperAdminActor(actor)) redirect("/admin")

  await recordPromotionExpirations()
  const [rows, plans] = await Promise.all([
    listPromotions(),
    db
      .select({
        id: membershipPlans.id,
        title: membershipPlans.title,
        admissionFee: membershipPlans.admissionFee,
        annualFee: membershipPlans.annualFee,
      })
      .from(membershipPlans)
      .orderBy(asc(membershipPlans.sortOrder)),
  ])

  const promotions: AdminPromotion[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    planIds: row.planIds,
    discountType: row.discountType as AdminPromotion["discountType"],
    discountValue: row.discountValue,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timeZone: row.timeZone,
    status: row.status,
    showCountdown: row.showCountdown,
    showBadge: row.showBadge,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">Membership Promotions</h1>
        <p className="mt-1 max-w-3xl leading-relaxed text-muted-2">
          Schedule time-limited discounts on membership plans. Prices update automatically when a promotion starts and
          return to standard pricing the moment it ends. Payments already in progress keep their price for up to 30
          minutes.
        </p>
      </div>
      <PromotionManager
        promotions={promotions}
        plans={plans.map((p) => ({ id: p.id, title: p.title, basePkr: feeToNumber(p.admissionFee) + feeToNumber(p.annualFee) }))}
      />
    </div>
  )
}
