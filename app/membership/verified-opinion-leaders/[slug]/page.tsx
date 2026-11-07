import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Check, ExternalLink, MapPin, UserRound } from "lucide-react"
import { ExpertiseChips, KolVerifiedSeal } from "@/components/kol/kol-hero-parts"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PlatformIcon, VerifiedBadge } from "@/components/kol/kol-ui"
import { CollaborationForm } from "@/components/kol/collaboration-form"
import { KolReferralCard } from "@/components/kol/kol-referral-card"
import { getActiveKolReferralCode, getPublicKolBySlug, totalFollowers } from "@/lib/kol"
import { referralUrl } from "@/lib/referral"
import { formatCount, formatDate, platformLabel } from "@/lib/kol-shared"
import { seoMetadata } from "@/lib/seo"
import { kolSubject } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"
import { RichContent } from "@/components/rich-content"

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
  return <RichContent value={text} />

}

export default async function KolProfilePage({ params }: Props) {
  const { slug } = await params
  const kol = await getPublicKolBySlug(slug)
  if (!kol) notFound()
  const name = kol.professionalName || kol.fullName
  const location = [kol.city, kol.country].filter(Boolean).join(", ")
  const referralCode = await getActiveKolReferralCode(kol.memberId)

  return (
    <>
      <SeoJsonLd subject={kolSubject(kol)} />
      <SiteHeaderServer />
      <main className="bg-surface">
        <section className="relative isolate overflow-hidden border-b border-line-light bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/kol-profile-hero-bg.png"
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover object-right-bottom opacity-40 lg:opacity-100"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-surface via-surface/85 to-transparent lg:via-surface/60"
            aria-hidden="true"
          />
          <div className="vaap-container relative flex flex-col gap-6 py-6 sm:gap-8 sm:py-10 lg:py-14">
            <Link
              href="/membership/verified-opinion-leaders"
              className="inline-flex items-center gap-2 self-start text-sm font-medium text-body transition-colors hover:text-green"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              All Verified KOLs
            </Link>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
              <div className="flex min-w-0 flex-1 flex-col gap-6 sm:gap-7">
                <div className="flex items-start gap-4 sm:items-center sm:gap-6">
                  <div className="size-20 shrink-0 rounded-2xl bg-card p-1 shadow-xl shadow-heading/10 ring-1 ring-line-light sm:size-32 sm:rounded-3xl sm:p-1.5 lg:size-36">
                    <div className="size-full overflow-hidden rounded-xl bg-mint sm:rounded-[1.25rem]">
                      {kol.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={kol.photo} alt={`Portrait of ${name}`} className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-green/50">
                          <UserRound className="size-10 sm:size-14" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
                    <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-green shadow-sm ring-1 ring-green/15 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm">
                      <span className="flex size-4 items-center justify-center rounded-full bg-green text-card sm:size-5">
                        <Check className="size-2.5 sm:size-3" strokeWidth={3.5} aria-hidden="true" />
                      </span>
                      Verified Opinion Leader
                    </p>
                    <h1 className="flex flex-wrap items-center gap-2 font-serif text-2xl font-bold leading-tight tracking-tight text-heading text-balance sm:text-4xl lg:text-[2.5rem] 2xl:text-5xl">
                      {name}
                      <VerifiedBadge className="[&_svg]:size-6 sm:[&_svg]:size-9" />
                    </h1>
                    {(kol.title || kol.organization) && (
                      <p className="border-l-2 border-green/60 pl-3 text-sm leading-relaxed text-heading/80 sm:border-l-[3px] sm:pl-4 sm:text-lg">
                        {[kol.title, kol.organization].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {location && (
                      <p className="flex items-center gap-1.5 text-xs text-body sm:text-sm">
                        <MapPin className="size-3.5 text-green sm:size-4" aria-hidden="true" />
                        {location}
                      </p>
                    )}
                  </div>

                  <div className="hidden shrink-0 items-center gap-5 xl:flex">
                    <span className="h-24 w-px bg-line-light" aria-hidden="true" />
                    <KolVerifiedSeal className="size-28 2xl:size-36" />
                  </div>
                </div>

                <ExpertiseChips topics={kol.expertise} />
              </div>

              {referralCode && (
                <div className="w-full shrink-0 lg:w-[26rem]">
                  <KolReferralCard code={referralCode} url={referralUrl(referralCode)} firstName={name} />
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="vaap-container grid grid-cols-1 gap-8 py-10 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-8 rounded-2xl bg-card p-6 md:p-8 lg:col-span-2">
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
