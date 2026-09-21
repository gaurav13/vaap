import { Target, Eye } from "lucide-react"

const ITEMS = [
  {
    icon: Target,
    title: "Our Mission",
    desc: "To strengthen Pakistan's virtual asset ecosystem through collaboration, education, responsible innovation, and industry representation.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    desc: "A trusted, inclusive, and globally connected digital asset ecosystem for Pakistan.",
  },
]

export function MissionVision() {
  return (
    <section className="bg-surface">
      <div className="vaap-container grid gap-5 py-12 sm:grid-cols-2 lg:py-16">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-5 rounded-2xl border border-line bg-card p-7 shadow-sm"
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-mint text-green">
              <Icon className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-heading">{title}</h2>
              <p className="mt-2 leading-relaxed text-body">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
