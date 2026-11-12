import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Quote } from "lucide-react"
import { ProfileSocials } from "@/components/profiles/profile-socials"
import { RichContent } from "@/components/rich-content"
import { sectionForKind, type ProfileContent } from "@/lib/leadership"

export function LeadershipProfileView({ profile, preview = false }: { profile: ProfileContent; preview?: boolean }) {
  const section = sectionForKind(profile.kind)
  const badge = profile.kind === "Advisory Committee Members" ? "Advisory Board" : profile.kind === "Industry Advisor Members" ? "Industry Advisor" : profile.kind
  const subtitle = [profile.title, profile.organization].filter(Boolean).join(", ")

  return (
    <article className={preview ? "" : "vaap-container py-12 lg:py-16"}>
      {preview ? null : (
        <Link
          href="/about#leadership"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 transition-colors hover:text-green"
        >
          <ArrowLeft className="size-4" /> Back to leadership
        </Link>
      )}

      <div className={`${preview ? "" : "mt-8 "}grid grid-cols-1 gap-8 md:grid-cols-[16rem_1fr] lg:gap-12`}>
        <div className="relative aspect-[4/5] w-full max-w-64 overflow-hidden rounded-2xl border border-line bg-surface">
          <Image
            src={profile.photo || "/placeholder.svg?height=400&width=320&query=portrait"}
            alt={`${profile.name || "Leader"} portrait`}
            fill
            sizes="(max-width: 768px) 100vw, 256px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
            {section.label}
            {badge && badge !== section.label ? (
              <span className="ml-2 inline-flex rounded-md bg-mint px-2 py-0.5 text-green">{badge === "message" ? "Leadership" : badge}</span>
            ) : null}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-heading text-balance lg:text-4xl">{profile.name}</h1>
          {profile.position ? <p className="mt-2 text-lg font-semibold text-green">{profile.position}</p> : null}
          {subtitle ? <p className="mt-1 text-muted-2">{subtitle}</p> : null}
          {profile.summary ? (
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-body">{profile.summary}</p>
          ) : null}

          <div className="mt-6">
            <ProfileSocials
              name={profile.name}
              socials={{
                linkedin: profile.linkedin,
                x: profile.x,
                facebook: profile.facebook,
                instagram: profile.instagram,
                website: profile.website,
                email: profile.email,
              }}
            />
          </div>

          {profile.responsibility || profile.portfolio ? (
            <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
              {profile.responsibility ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Responsibilities</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-body">{profile.responsibility}</dd>
                </div>
              ) : null}
              {profile.portfolio ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Portfolio</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-body">{profile.portfolio}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {profile.bio ? (
            <section aria-labelledby="bio-heading" className="mt-8">
              <h2 id="bio-heading" className="text-lg font-bold text-heading">
                Biography
              </h2>
              <RichContent value={profile.bio} className="mt-3 max-w-2xl" />
            </section>
          ) : null}

          {profile.message ? (
            <figure className="mt-8 max-w-2xl border-l-2 border-green pl-5">
              <Quote className="size-5 text-green" aria-hidden />
              <blockquote className="mt-2 text-pretty leading-relaxed text-body">{profile.message}</blockquote>
              <figcaption className="mt-2 text-sm font-semibold text-heading">
                {profile.name}
                <span className="sr-only">, message to the VAAP community</span>
              </figcaption>
            </figure>
          ) : null}
        </div>
      </div>
    </article>
  )
}
