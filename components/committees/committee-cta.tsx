import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function CommitteeCta() {
  return (
    <section className="bg-mint">
      <div className="vaap-container py-16 lg:py-20">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl font-bold text-heading lg:text-4xl">Get Involved</h2>
            <p className="mt-3 leading-relaxed text-muted-2">
              Join a committee and contribute to a stronger virtual asset ecosystem in Pakistan.
            </p>
          </div>
          <Link
            href="/membership"
            className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3.5 font-semibold text-white transition-colors hover:bg-green-dark"
          >
            Apply for Committee Participation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
