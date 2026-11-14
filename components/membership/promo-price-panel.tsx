import { Tag, type LucideIcon } from "lucide-react"
import { formatPKR, type PublicPromotion } from "@/lib/promotions-shared"
import { PromoCountdown } from "@/components/membership/promo-countdown"

/** Annual Fee card variant shown while a promotion is live: badges, struck-through price, offer price, countdown. */
export function PromoFeeCard({
  promotion,
  label,
  icon: Icon,
  className = "",
}: {
  promotion: PublicPromotion
  label: string
  icon: LucideIcon
  className?: string
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-gold/50 bg-gold/5 p-4 ${className}`}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-medium leading-tight text-body">{label}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <Tag className="size-3" aria-hidden />
            {promotion.name}
          </span>
          <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
            {promotion.label}
          </span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-sm text-muted-foreground">
            <span className="sr-only">Standard price </span>
            <s>{formatPKR(promotion.basePkr)}</s>
          </span>
          <span className="font-serif text-2xl font-bold leading-tight text-heading">
            <span className="sr-only">Offer price </span>
            {formatPKR(promotion.finalPkr)}
          </span>
          <span className="text-xs font-semibold text-green">Save {formatPKR(promotion.discountPkr)}</span>
        </p>
        {promotion.showCountdown && <PromoCountdown endsAt={promotion.endsAt} />}
      </div>
    </div>
  )
}
