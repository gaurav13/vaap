import {
  ArrowRight,
  Building2,
  GraduationCap,
  Globe,
  Rocket,
  Users,
  UsersRound,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const GROUPS: { icon: LucideIcon; label: string }[] = [
  { icon: Building2, label: 'Corporate Members' },
  { icon: Globe, label: 'International Members' },
  { icon: Rocket, label: 'Startup Members' },
  { icon: Users, label: 'Associate & Professional Members' },
  { icon: GraduationCap, label: 'Student Members' },
  { icon: Video, label: 'Media & Influencer Members' },
  { icon: UsersRound, label: 'Verified Community Members' },
]

export function WhoWeRepresent() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="fluid-h2 font-bold text-heading">
            Who We Represent
          </h2>
          <p className="mt-3 max-w-2xl text-body">
            VAAP brings together a diverse community working towards a stronger
            and more inclusive virtual asset ecosystem in Pakistan.
          </p>
        </div>
        <a
          href="#"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-green transition-colors hover:text-green-hover"
        >
          View All Membership Categories <ArrowRight className="size-4" />
        </a>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        {GROUPS.map(({ icon: Icon, label }) => (
          <a
            key={label}
            href="#"
            className="group flex flex-col items-center gap-4 rounded-xl border border-line bg-card p-5 text-center transition-all hover:-translate-y-1 hover:border-green-border hover:shadow-[0_16px_36px_-20px_rgba(0,168,107,0.5)]"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-mint text-green transition-colors group-hover:bg-green group-hover:text-white">
              <Icon className="size-6" />
            </span>
            <span className="text-sm font-semibold leading-snug text-heading">
              {label}
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
