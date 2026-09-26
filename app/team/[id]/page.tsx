import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { leadership } from "@/lib/db/schema"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { ProfileSocials } from "@/components/profiles/profile-socials"
import { plainTextToHtml, sanitizeRichHtml } from "@/lib/html"

async function getProfile(id: number) {
  const rows = await db.select().from(leadership).where(eq(leadership.id, id)).limit(1)
  const row = rows[0]
  if (!row || !row.published) return null
  return row
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getProfile(Number(id))
  if (!profile) return { title: "Profile | VAAP" }
  return {
    title: `${profile.name}${profile.position ? ` — ${profile.position}` : ""} | VAAP`,
    description: profile.position || `${profile.name} at VAAP`,
  }
}

function RichBio({ html }: { html: string }) {
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(html)
  const cleaned = looksLikeHtml ? sanitizeRichHtml(html) : plainTextToHtml(html)
  return (
    <div
      className="mt-6 max-w-2xl space-y-4 text-pretty leading-relaxed text-body [&_a]:font-medium [&_a]:text-green [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-heading [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-heading [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  )
}

export default async function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) notFound()

  const [profile, user] = await Promise.all([getProfile(numericId), getHeaderUser()])
  if (!profile) notFound()

  const backHref = profile.kind === "Chairman" || profile.kind === "message" ? "/about" : "/governance"

  return (
    <>
      <SiteHeaderServer active="About" user={user} />
      <main>
        <div className="vaap-container py-12 lg:py-16">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 transition-colors hover:text-green"
          >
            <ArrowLeft className="size-4" /> Back to leadership
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[16rem_1fr] lg:gap-12">
            <div>
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line bg-surface">
                <Image
                  src={profile.photo || "/placeholder.svg?height=400&width=320&query=portrait"}
                  alt={`${profile.name} portrait`}
                  fill
                  sizes="(max-width: 768px) 100vw, 256px"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="min-w-0">
              {profile.kind ? (
                <span className="inline-flex rounded-md bg-mint px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-green">
                  {profile.kind === "message" ? "Leadership" : profile.kind}
                </span>
              ) : null}
              <h1 className="mt-4 text-3xl font-bold text-heading lg:text-4xl">{profile.name}</h1>
              {profile.position ? (
                <p className="mt-2 text-lg font-semibold text-green">{profile.position}</p>
              ) : null}
              {profile.organization ? <p className="mt-1 text-muted-2">{profile.organization}</p> : null}
              {profile.responsibility ? (
                <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-body">{profile.responsibility}</p>
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

              {profile.bio ? <RichBio html={profile.bio} /> : null}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
