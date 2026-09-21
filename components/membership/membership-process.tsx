import { ArrowRight, FileText, Search, ShieldCheck, Users, type LucideIcon } from "lucide-react"

type Step = {
  icon: LucideIcon
  step: string
  title: string
  desc: string
  label: string
}

const STEPS: Step[] = [
  {
    icon: FileText,
    step: "01",
    title: "Select Membership Type",
    desc: "Choose the category that fits your profile and organization.",
    label: "Find the Right Fit",
  },
  {
    icon: Search,
    step: "02",
    title: "Submit Application",
    desc: "Complete the online form with required documents.",
    label: "Quick & Secure",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Review & Approval",
    desc: "Our team reviews your application and verifies the information.",
    label: "Transparent Process",
  },
  {
    icon: Users,
    step: "04",
    title: "Welcome to VAAP",
    desc: "Gain access to member benefits and industry initiatives.",
    label: "Be Part of the Change",
  },
]

export function MembershipProcess() {
  return (
    <section id="process" className="scroll-mt-24">
      <div className="relative overflow-hidden bg-background">
        {/* faint Faisal mosque + mountains at bottom-right */}
        <img
          src="/images/hero-islamabad.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 hidden w-[38%] max-w-xl select-none opacity-15 [mask-image:linear-gradient(to_top_left,black,transparent_70%)] lg:block"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-8 md:grid-cols-[1.7fr_1fr] md:items-start">
            {/* Heading */}
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold" aria-hidden />
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">How to Join</p>
              </div>
              <h2 className="mt-4 font-serif text-[clamp(1.75rem,1.15rem+1.9vw,3rem)] font-bold leading-tight text-heading text-balance">
                A Simple Membership Process
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-body text-pretty">
                Join in just a few steps and start contributing to a stronger digital asset ecosystem.
              </p>
            </div>

            {/* Right decorative column — desktop only */}
            <div className="relative hidden flex-col items-end gap-6 text-right md:flex">
              <span
                className="pointer-events-none absolute -top-10 right-0 select-none font-serif text-[9rem] font-bold leading-none text-gold/[0.07]"
                aria-hidden
              >
                VAAP
              </span>
              <div className="relative flex items-start gap-4 lg:flex-row-reverse">
                <p className="font-sans text-sm font-semibold uppercase leading-relaxed tracking-[0.22em] text-heading">
                  People.
                  <br />
                  Policy.
                  <br />
                  Innovation.
                  <br />A Stronger
                  <br />
                  Pakistan.
                </p>
                <span className="mt-1 h-32 w-px shrink-0 bg-gold" aria-hidden />
              </div>
              <p className="relative text-xs font-semibold uppercase tracking-[0.24em] text-gold/80">
                A United Industry
                <br />
                For a Digital Pakistan
              </p>
            </div>
          </div>

          <ol className="relative mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, step, title, desc, label }, i) => (
              <li key={step} className="relative flex">
                {/* gold circular arrow connector (desktop, between cards) */}
                {i < STEPS.length - 1 && (
                  <span
                    className="absolute -right-8 top-[52px] z-20 hidden size-9 items-center justify-center rounded-full border border-gold/40 bg-card text-gold shadow-sm lg:flex"
                    aria-hidden
                  >
                    <ArrowRight className="size-4" />
                  </span>
                )}

                <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-border/60 hover:shadow-xl">
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      {/* ringed green icon badge */}
                      <span className="relative flex size-16 items-center justify-center rounded-full bg-card ring-1 ring-green/15 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.25)]">
                        <span className="flex size-12 items-center justify-center rounded-full bg-green text-white transition-transform duration-300 group-hover:scale-105">
                          <Icon className="size-6" strokeWidth={1.9} />
                        </span>
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-serif text-4xl font-bold text-gold">{step}</span>
                        <span className="mt-1 h-0.5 w-8 rounded-full bg-gold/60" aria-hidden />
                      </div>
                    </div>
                    <h3 className="mt-6 font-serif text-xl font-bold leading-tight text-heading">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-body">{desc}</p>
                  </div>

                  {/* mint footer strip */}
                  <div className="flex items-center justify-between gap-3 border-t border-green/10 bg-green/[0.06] px-6 py-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-green">{label}</span>
                    <ArrowRight className="size-4 shrink-0 text-gold transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* bottom tagline */}
          <div className="mt-12 flex items-center justify-center gap-4 lg:mt-14">
            <span className="h-px w-10 bg-gold/40 sm:w-24" aria-hidden />
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-green/70 sm:text-xs sm:tracking-[0.28em]">
              Together for a Stronger Digital Pakistan
            </p>
            <span className="h-px w-10 bg-gold/40 sm:w-24" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  )
}
