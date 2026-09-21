import { Lightbulb, MessageSquare, TrendingUp, Users } from "lucide-react"

const CARDS = [
  {
    n: "01",
    icon: Users,
    title: "One Industry Voice",
    desc: "Bringing companies, startups and professionals together around shared industry priorities.",
  },
  {
    n: "02",
    icon: MessageSquare,
    title: "Constructive Engagement",
    desc: "Creating an organized channel for industry dialogue with relevant institutions and stakeholders.",
  },
  {
    n: "03",
    icon: Lightbulb,
    title: "Knowledge & Insight",
    desc: "Turning practical market experience into research, education, feedback and industry understanding.",
  },
  {
    n: "04",
    icon: TrendingUp,
    title: "Responsible Growth",
    desc: "Supporting professional standards, innovation, awareness and international collaboration.",
  },
]

export function WhyAssociationMatters() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <h2 className="text-pretty text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          Why an Industry Association Matters
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-body">
          Regulation establishes rules and oversight. An industry association gives businesses, professionals and
          ecosystem participants an organized platform to collaborate, share practical experience and contribute to
          industry development.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="rounded-xl border border-line bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-green">{n}</span>
                <Icon className="size-6 text-green" />
              </div>
              <h3 className="mt-4 font-bold text-heading">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-body">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
