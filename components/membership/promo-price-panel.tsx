import { Tag } from "lucide-react"
import { formatPKR, type PublicPromotion } from "@/lib/promotions-shared"
import { PromoCountdown } from "@/components/membership/promo-countdown"

export function PromoPricePanel({ promotion, className = "mt-6" }: { promotion: PublicPromotion; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
          <Tag className="size-3.5" aria-hidden />
          {promotion.name}
          <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] text-white">{promotion.label}</span>
        </p>
        {promotion.description && <p className="mt-1 text-sm leading-relaxed text-body">{promotion.description}</p>}
        {promotion.showCountdown && <PromoCountdown endsAt={promotion.endsAt} className="mt-2" />}
      </div>
      <div className="shrink-0 sm:text-right">
        <p className="text-xs text-muted-foreground">
          <span className="sr-only">Standard price </span>
          <s>{formatPKR(promotion.basePkr)}</s>
        </p>
        <p className="font-serif text-2xl font-bold leading-tight text-heading">
          <span className="sr-only">Promotional price </span>
          {formatPKR(promotion.finalPkr)}
        </p>
        <p className="text-xs font-semibold text-green">You save {formatPKR(promotion.discountPkr)}</p>
      </div>
    </div>
  )
}
