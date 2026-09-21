import { BookOpen, Building2, Handshake, Lightbulb, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Building2,
    title: 'Industry Representation',
    text: "Supporting the voice of Pakistan's virtual asset industry.",
  },
  {
    icon: BookOpen,
    title: 'Education & Awareness',
    text: 'Building a better-informed ecosystem.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    text: 'Supporting startups and emerging technologies.',
  },
  {
    icon: Handshake,
    title: 'Collaboration',
    text: 'Connecting local and international stakeholders.',
  },
  {
    icon: ShieldCheck,
    title: 'Responsible Ecosystem',
    text: 'Promoting responsible industry development.',
  },
]

export function Pillars() {
  return (
    <section className="relative z-10 mx-auto -mt-14 max-w-7xl px-5 lg:px-8">
      <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_20px_50px_-24px_rgba(16,42,54,0.35)] lg:p-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint text-green">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-heading">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-2">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
