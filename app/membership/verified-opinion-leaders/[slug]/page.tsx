import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, MapPin, UserRound } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PlatformIcon, VerifiedBadge } from "@/components/kol/kol-ui"
import { CollaborationForm } from "@/components/kol/collaboration-form"
import { getPublicKolBySlug, totalFollowers } from "@/lib/kol"
import { formatCount, formatDate, platformLabel } from "@/lib/kol-shared"
import { seoMetadata } from "@/lib/seo"
import { kolSubject } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const kol = await getPublicKolBySlug(slug)
  if (!kol) return { title: "Opinion Leader" }
  return seoMetadata(kolSubject(kol))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-bold text-heading">{title}</h2>
      {children}
    </section>
  )
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-base leading-relaxed text-body">
      {text
        .split(/\n+/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="text-pretty">
            {p}
          </p>
        ))}
    </div>
  )
}

export default async function KolProfilePage({ params }: Props) {
  const { slug } = await params
  const kol = await getPublicKolBySlug(slug)
  if (!kol) notFound()
  const name = kol.professionalName || kol.fullName
  const location = [kol.city, kol.country].filter(Boolean).join(", ")

  return (
    <>
      <SeoJsonLd subject={kolSubject(kol)} />
      <SiteHeaderServer />
      <main className="bg-surface">
        <section className="bg-navy-dark">
          <div className="vaap-container flex flex-col gap-8 py-10 md:py-14">
            <Link href="/membership/verified-opinion-leaders" className="inline-flex items-center gap-2 self-start text-sm text-card/75 hover:text-card">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All opinion leaders
            </Link>
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="size-32 shrink-0 overflow-hidden rounded-2xl border-4 border-card/10 bg-navy md:size-40">
                {kol.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={kol.photo} alt={`Portrait of ${name}`} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-card/50">
                    <UserRound className="size-14" aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green-light">
                  Verified Opinion Leader
                </span>
                <h1 className="flex flex-wrap items-center gap-2 font-serif text-3xl font-bold text-card text-balance md:text-5xl">
                  {name}
                  <VerifiedBadge className="[&_svg]:size-7" />
                </h1>
                <p className="text-lg text-card/85">{[kol.title, kol.organization].filter(Boolean).join(", ")}</p>
                {location && (
                  <p className="flex items-center gap-1.5 text-sm text-card/70">
                    <MapPin className="size-4" aria-hidden="true" />
                    {location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="vaap-container grid gap-8 py-10 lg:grid-cols-3">
          <div className="flex flex-col gap-8 rounded-2xl bg-card p-6 md:p-8 lg:col-span-2">
            {kol.bio && (
              <Section title="About">
                <Paragraphs text={kol.bio} />
              </Section>
            )}
            {kol.expertise.length > 0 && (
              <Section title="Areas of expertise">
                <ul className="flex flex-wrap gap-2">
                  {kol.expertise.map((e) => (
                    <li key={e} className="rounded-full bg-mint px-3 py-1 text-sm font-medium text-green">
                      {e}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {kol.achievements && (
              <Section title="Achievements & awards">
                <Paragraphs text={kol.achievements} />
              </Section>
            )}
            {kol.mediaAppearances && (
              <Section title="Media appearances">
                <Paragraphs text={kol.mediaAppearances} />
              </Section>
            )}
            {kol.collaborations && (
              <Section title="Previous collaborations">
                <Paragraphs text={kol.collaborations} />
              </Section>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-2xl bg-card p-6" aria-labelledby="reach-heading">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="reach-heading" className="font-serif text-xl font-bold text-heading">
                  Social reach
                </h2>
                <span className="text-sm font-semibold text-green">{formatCount(totalFollowers(kol))} total</span>
              </div>
              <ul className="flex flex-col divide-y divide-line-light">
                {kol.platforms.map((p, i) => (
                  <li key={`${p.platform}-${i}`} className="flex items-center gap-3 py-3">
                    <PlatformIcon platform={p.platform} className="size-8" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-heading hover:text-green"
                      >
                        {platformLabel(p.platform)}
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                      {p.engagement > 0 && <span className="text-xs text-muted-2">{p.engagement}% engagement</span>}
                    </div>
                    <span className="text-base font-bold text-heading">{formatCount(Number(p.followers))}</span>
                  </li>
                ))}
              </ul>
              {kol.monthlyReach > 0 && (
                <p className="rounded-lg bg-surface px-3 py-2 text-sm text-body">
                  Estimated monthly reach: <strong className="text-heading">{formatCount(kol.monthlyReach)}</strong>
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted-2">
                Verified by VAAP on {formatDate(kol.verifiedAt)}
                {kol.expiresAt ? ` · valid until ${formatDate(kol.expiresAt)}` : ""}
                {kol.statsUpdatedAt ? ` · stats updated ${formatDate(kol.statsUpdatedAt)}` : ""}
              </p>
            </section>

            <section className="flex flex-col gap-4 rounded-2xl bg-card p-6" aria-labelledby="collab-heading">
              <h2 id="collab-heading" className="font-serif text-xl font-bold text-heading">
                Work with {name.split(" ")[0]}
              </h2>
              {kol.collabInterests && <p className="text-sm leading-relaxed text-body">{kol.collabInterests}</p>}
              <CollaborationForm slug={kol.slug} name={name} />
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
