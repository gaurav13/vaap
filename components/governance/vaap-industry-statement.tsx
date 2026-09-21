import { Handshake } from "lucide-react"

export function VAAPIndustryStatement() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-5 pb-16 lg:px-8 lg:pb-20">
        <div className="rounded-2xl bg-navy p-8 sm:p-10 lg:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-green ring-1 ring-inset ring-white/15">
              <Handshake className="size-7" />
            </span>
            <div>
              <p className="text-pretty text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Regulators regulate. Industry builds. <span className="text-green">VAAP organizes the industry voice.</span>
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70">
                VAAP does not replace PVARA or any government authority. VAAP&apos;s role is industry representation,
                collaboration, education and ecosystem development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
