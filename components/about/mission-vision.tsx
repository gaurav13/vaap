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
    <section id="mission" className="scroll-mt-24 bg-surface">
      <div className="vaap-container grid grid-cols-1 gap-4 py-10 sm:grid-cols-2 sm:gap-5 lg:py-16">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <article
            key={title}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-card p-5 shadow-sm sm:p-7"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-green sm:size-10">
                <Icon className="size-4 sm:size-5" aria-hidden="true" />
              </span>
              <h2 className="text-lg font-bold text-heading sm:text-xl">{title}</h2>
            </div>
            <p className="text-pretty text-[15px] leading-relaxed text-body sm:text-base">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
