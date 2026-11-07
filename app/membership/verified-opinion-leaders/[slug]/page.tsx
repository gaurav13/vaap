import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Award,
  CalendarCheck,
  ChevronDown,
  ExternalLink,
  Handshake,
  Mail,
  MapPin,
  Megaphone,
  Network,
  Newspaper,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react"
import { ExpertiseChips, KolVerifiedSeal, ScallopedCheck } from "@/components/kol/kol-hero-parts"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PlatformIcon } from "@/components/kol/kol-ui"
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

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-line-light px-5 py-6 last:border-b-0 sm:px-8 sm:py-8">
      <h2 className="flex items-center gap-3 font-serif text-lg font-bold text-heading sm:text-xl">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="min-w-0 text-[0.95rem] leading-relaxed text-body [&_a]:break-words [&_a]:font-medium [&_a]:text-green [&_a]:underline-offset-2 [&_a:hover]:underline">
      <RichContent value={text} />
    </div>
  )
}

export default async function KolProfilePage({ params }: Props) {
  const { slug } = await params
  const kol = await getPublicKolBySlug(slug)
  if (!kol) notFound()
  const name = kol.professionalName || kol.fullName
  const location = [kol.city, kol.country].filter(Boolean).join(", ")
  const referralCode = await getActiveKolReferralCode(kol.memberId)
  const total = totalFollowers(kol)
  const stats = [
    { Icon: Users, label: "Total Followers", value: formatCount(total) },
    { Icon: Megaphone, label: "Monthly Reach", value: kol.monthlyReach > 0 ? formatCount(kol.monthlyReach) : "—" },
    { Icon: Network, label: "Platforms", value: String(kol.platforms.length) },
    { Icon: CalendarCheck, label: "Verified Since", value: formatDate(kol.verifiedAt) },
  ]

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
            className="absolute inset-0 -z-10 size-full object-cover object-right-bottom opacity-50 lg:opacity-100"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-surface/90 via-surface/60 to-transparent lg:via-surface/30"
            aria-hidden="true"
          />
          <div className="vaap-container relative flex flex-col gap-4 py-5 sm:gap-6 sm:py-7 lg:py-9">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/membership/verified-opinion-leaders"
                className="inline-flex items-center gap-2 text-sm font-semibold text-heading transition-colors hover:text-green sm:text-base"
              >
                <ArrowLeft className="size-4 sm:size-5" aria-hidden="true" />
                All Verified KOLs
              </Link>
              <KolVerifiedSeal id="kol-laurel-mobile" className="-my-3 size-20 sm:hidden" />
            </div>

            <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between xl:gap-10">
              <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
                <div className="flex items-center gap-4 sm:gap-7">
                  <div className="size-24 shrink-0 rounded-2xl bg-card p-1 shadow-xl shadow-heading/10 ring-1 ring-line-light sm:size-36 sm:rounded-3xl sm:p-1.5">
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

                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-initial sm:gap-3">
                    <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-card/80 py-1 pl-1 pr-3 text-xs font-semibold text-heading shadow-lg shadow-heading/5 ring-1 ring-line-light/60 backdrop-blur sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-5 sm:text-base">
                      <ScallopedCheck className="size-5 sm:size-8" />
                      Verified Opinion Leader
                    </p>
                    <h1 className="flex items-center gap-2 font-sans text-2xl font-bold leading-tight tracking-tight text-heading sm:gap-3 sm:text-4xl lg:text-5xl xl:text-[2.5rem] 2xl:text-5xl">
                      <span className="min-w-0 text-balance text-[30px]">{name}</span>
                      <ScallopedCheck className="size-7 shrink-0 sm:size-10" />
                      <span className="sr-only">(verified)</span>
                    </h1>
                    {(kol.title || kol.organization || location) && (
 <div className="relative flex flex-col gap-1.5 border-l-2 border-heading/15 pl-3 sm:gap-2.5 sm:pl-5">
  <span className="absolute -left-0.5 top-0 h-6 w-0.5 bg-green sm:h-8" aria-hidden="true" />
  {(kol.title || kol.organization) && (
  <p className="text-sm font-semibold leading-snug text-heading sm:text-xl">
                            {[kol.title, kol.organization].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {location && (
  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-2 sm:gap-2 sm:text-base">
  <MapPin className="size-3.5 sm:size-[18px]" aria-hidden="true" />
                            {location}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="hidden shrink-0 items-center gap-6 sm:flex lg:gap-8">
                    <span className="h-28 w-px bg-heading/15" aria-hidden="true" />
                    <KolVerifiedSeal className="size-32 lg:size-36 xl:size-32 2xl:size-36" />
                  </div>
                </div>

                <ExpertiseChips topics={kol.expertise} />
              </div>

              {referralCode && (
                <div className="w-full shrink-0 sm:max-w-xl xl:w-[26rem] xl:max-w-none">
                  <KolReferralCard code={referralCode} url={referralUrl(referralCode)} firstName={name} />
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="vaap-container flex flex-col gap-6 py-8 sm:gap-8 sm:py-12">
          <dl className="grid grid-cols-2 rounded-2xl border border-line-light bg-card py-2 shadow-sm lg:grid-cols-4 lg:py-7">
            {stats.map(({ Icon, label, value }, i) => (
              <div
                key={label}
                className={[
                  "flex min-w-0 flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:py-0",
                  i % 2 === 0 ? "border-r border-line-light lg:border-r-0" : "",
                  i >= 2 ? "border-t border-line-light lg:border-t-0" : "",
                  i > 0 ? "lg:border-l lg:border-line-light" : "",
                ].join(" ")}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-green sm:size-12">
                  <Icon className="size-5 sm:size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <dt className="order-2 text-sm leading-snug text-body">{label}</dt>
                  <dd className="order-1 text-xl font-bold leading-tight text-heading sm:text-2xl">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
            <article className="flex min-w-0 flex-col rounded-2xl border border-line-light bg-card shadow-sm lg:col-span-2">
              {kol.bio && (
                <Section icon={UserRound} title="About">
                  <Paragraphs text={kol.bio} />
                </Section>
              )}
              {kol.expertise.length > 0 && (
                <Section icon={Sparkles} title="Areas of expertise">
                  <ul className="flex flex-wrap gap-2">
                    {kol.expertise.map((e) => (
                      <li
                        key={e}
                        className="rounded-full border border-green/15 bg-mint px-3.5 py-1.5 text-sm font-medium text-green"
                      >
                        {e}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {kol.achievements && (
                <Section icon={Award} title="Achievements & awards">
                  <Paragraphs text={kol.achievements} />
                </Section>
              )}
              {kol.mediaAppearances && (
                <Section icon={Newspaper} title="Media appearances">
                  <Paragraphs text={kol.mediaAppearances} />
                </Section>
              )}
              {kol.collaborations && (
                <Section icon={Handshake} title="Previous collaborations">
                  <Paragraphs text={kol.collaborations} />
                </Section>
              )}
            </article>

            <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              <section
                className="flex flex-col overflow-hidden rounded-2xl border border-line-light bg-card shadow-sm"
                aria-labelledby="reach-heading"
              >
                <div className="relative isolate flex items-center justify-between gap-4 overflow-hidden bg-black px-5 py-6 sm:px-7">
                  <span
                    className="absolute -bottom-24 -right-16 -z-10 size-40 rounded-full border-t-[6px] border-green-light/50"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-light">Audience</p>
                    <h2 id="reach-heading" className="font-sans text-2xl font-bold leading-tight text-card">
                      Social Reach
                    </h2>
                  </div>
                  <span className="h-12 w-px shrink-0 bg-card/20" aria-hidden="true" />
                  <div className="flex items-center gap-3">
                    <Users className="size-7 shrink-0 text-green-light" aria-hidden="true" />
                    <p className="flex flex-col items-end">
                      <span className="font-sans text-3xl font-bold leading-none tracking-tight text-card">
                        {formatCount(total)}
                      </span>
                      <span className="mt-1 text-xs font-medium text-card/75">Total Followers</span>
                    </p>
                  </div>
                </div>
                <ul className="flex flex-col px-5 pt-2 sm:px-7">
                  {kol.platforms.map((p, i) => {
                    const followers = Number(p.followers)
                    return (
                      <li
                        key={`${p.platform}-${i}`}
                        className="flex items-center gap-4 border-b border-line-light py-3.5 last:border-b-0"
                      >
                        <PlatformIcon platform={p.platform} className="size-10 rounded-xl" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-heading transition-colors hover:text-green"
                          >
                            <span className="truncate">{platformLabel(p.platform)}</span>
                            <ExternalLink className="size-4 shrink-0 text-muted-2" aria-hidden="true" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                          {p.engagement > 0 && (
                            <span className="text-xs text-muted-2">{p.engagement}% engagement</span>
                          )}
                        </div>
                        <span className="text-lg font-bold tabular-nums text-heading">{formatCount(followers)}</span>
                      </li>
                    )
                  })}
                </ul>
                <div className="px-4 pb-5 pt-3 sm:px-5">
                  <div className="flex items-center gap-3 rounded-xl bg-mint/70 px-4 py-3">
                    <ShieldCheck className="size-5 shrink-0 text-green" aria-hidden="true" />
                    <p className="text-xs leading-relaxed text-body sm:text-sm">
                      Verified by VAAP on {formatDate(kol.verifiedAt)}
                      {kol.expiresAt ? ` · Valid until ${formatDate(kol.expiresAt)}` : ""}
                    </p>
                  </div>
                </div>
              </section>

              <section
                className="flex flex-col gap-4 rounded-2xl border border-line-light bg-card p-5 shadow-sm sm:p-6"
                aria-labelledby="collab-heading"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
                    <Mail className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <h2 id="collab-heading" className="font-serif text-xl font-bold text-heading">
                      Work with {name.split(" ")[0]}
                    </h2>
                    <p className="text-xs text-muted-2">Brand partnerships, events and campaigns</p>
                  </div>
                </div>
                {kol.collabInterests && (
                  <details className="group rounded-xl bg-surface px-4 py-3 text-sm text-body">
                    <summary className="cursor-pointer list-none font-semibold text-heading marker:hidden">
                      <span className="flex items-center justify-between gap-2">
                        Collaboration interests
                        <ChevronDown className="size-4 text-green transition-transform group-open:rotate-180" aria-hidden="true" />
                      </span>
                    </summary>
                    <p className="mt-2 whitespace-pre-line leading-relaxed">{kol.collabInterests}</p>
                  </details>
                )}
                <CollaborationForm slug={kol.slug} name={name} />
              </section>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
