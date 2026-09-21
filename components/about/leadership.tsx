import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

type Profile = {
  id: number
  name: string
  position: string
  organization: string
  bio: string
  photo: string | null
  linkedin: string | null
  kind: string
}

export function Leadership({ profiles }: { profiles: Profile[] }) {
  // The Chairman is the profile whose Type is "Chairman" (fallback to the
  // first), and the Executive Committee is everyone else, in admin sort order.
  const chairman = profiles.find((p) => p.kind === "Chairman") ?? profiles[0] ?? null
  const committee = profiles.filter((p) => p.id !== chairman?.id)

  return (
    <section className="bg-background">
      <div className="vaap-container py-14 lg:py-20">
        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-green" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-green">Our Leadership</span>
        </div>

        {/* Chairman */}
        <h2 className="mt-5 fluid-h2 font-bold text-heading">Chairman</h2>
        {chairman ? (
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[13rem_1fr] lg:grid-cols-[15rem_1fr] lg:gap-12">
            <div className="relative aspect-[4/5] w-52 max-w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-surface md:w-full">
              <Image
                src={chairman.photo || "/placeholder.svg?height=300&width=240&query=chairman%20portrait"}
                alt={`${chairman.name}, ${chairman.position || "Chairman"} of VAAP`}
                fill
                sizes="(max-width: 768px) 208px, 240px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 pt-1">
              <Link href={`/team/${chairman.id}`} className="group inline-block">
                <h3 className="text-3xl font-bold text-heading transition-colors group-hover:text-green">
                  {chairman.name}
                </h3>
              </Link>
              <p className="mt-1.5 text-lg font-semibold text-green">{chairman.position || "Chairman, VAAP"}</p>
              {chairman.organization ? (
                <p className="mt-1 text-sm text-muted-2">{chairman.organization}</p>
              ) : null}
              {chairman.bio ? <RichBio html={chairman.bio} /> : null}
              <div className="mt-4 flex items-center gap-4">
                {chairman.linkedin ? (
                  <SocialLink href={chairman.linkedin} label={`${chairman.name} LinkedIn profile`} />
                ) : null}
                <Link
                  href={`/team/${chairman.id}`}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
                >
                  View full profile
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-body">
            Leadership profiles will appear here once added in the admin area.
          </p>
        )}

        {/* Executive Committee */}
        {committee.length > 0 ? (
          <>
            <div className="mt-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="h-px w-8 bg-green" aria-hidden />
                <h2 className="fluid-h3 font-bold text-heading">Executive Committee</h2>
              </div>
              <Link
                href="/governance"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-green transition-colors hover:text-green-hover"
              >
                View Governance
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {committee.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/team/${m.id}`}
                    className="group block h-full rounded-2xl border border-line bg-card p-4 text-center shadow-sm transition-all hover:border-green-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
                  >
                    <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl bg-surface">
                      <Image
                        src={m.photo || "/placeholder.svg?height=200&width=200&query=committee%20member%20portrait"}
                        alt={`${m.name} portrait`}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                        className="object-cover"
                      />
                    </div>
                    <h4 className="mt-4 font-bold text-heading group-hover:text-green">{m.name}</h4>
                    {m.position ? <p className="mt-1 text-sm font-semibold text-heading">{m.position}</p> : null}
                    {m.organization ? <p className="mt-0.5 text-sm text-muted-2">{m.organization}</p> : null}
                    <span className="mt-3 inline-block text-xs font-semibold text-green opacity-0 transition-opacity group-hover:opacity-100">
                      View profile
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  )
}

function RichBio({ html }: { html: string }) {
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(html)

  // Clean up markup pasted from rich-text editors: drop framework attributes
  // (data-*, class, style, id, dir) so only semantic tags and text remain.
  const cleaned = looksLikeHtml
    ? html.replace(/\s(?:data-[\w-]+|class|style|id|dir)="[^"]*"/gi, "")
    : html
        .split(/\n{2,}/)
        .map((p) => `<p>${p.trim()}</p>`)
        .join("")

  return (
    <div
      className="mt-5 max-w-3xl space-y-4 text-pretty leading-relaxed text-body [&_a]:font-medium [&_a]:text-green [&_a]:underline [&_p]:leading-relaxed"
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  )
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="mt-4 inline-flex size-8 items-center justify-center rounded-md bg-green text-primary-foreground transition-colors hover:bg-green-hover"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
      </svg>
    </Link>
  )
}
