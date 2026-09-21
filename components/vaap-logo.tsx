import Image from 'next/image'
import { cn } from '@/lib/utils'

export function VaapLogo({
  className,
  onDark = false,
  height = 48,
}: {
  className?: string
  onDark?: boolean
  height?: number
}) {
  const width = Math.round(height * 3.22)
  return (
    <span
      className={cn(
        'inline-flex items-center',
        onDark && 'rounded-lg bg-white px-3 py-2 shadow-sm',
        className,
      )}
    >
      <Image
        src="/vaap-logo.png"
        alt="VAAP — Virtual Assets Association of Pakistan"
        width={width}
        height={height}
        priority
        sizes="(max-width: 768px) 320px, 460px"
        className="w-auto object-contain"
        style={{ height }}
      />
    </span>
  )
}
