import { formatCount, sumFollowers } from "@/lib/kol-shared"

export function ReachTotal({ platforms }: { platforms: { followers?: number | string | null }[] }) {
  const total = sumFollowers(platforms)
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-heading">Monthly reach</p>
      <p className="text-2xl font-semibold text-heading" aria-live="polite">
        {formatCount(total)}{" "}
        <span className="text-sm font-normal text-body">({total.toLocaleString()} followers)</span>
      </p>
      <p className="text-xs leading-relaxed text-body">Calculated automatically from the follower counts of all listed accounts.</p>
    </div>
  )
}
