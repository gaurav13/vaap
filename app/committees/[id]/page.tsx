import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { committees } from "@/lib/db/schema"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { ProfileSocials } from "@/components/profiles/profile-socials"

async function getCommittee(id: number) {
  const rows = await db.select().from(committees).where(eq(committees.id, id)).limit(1)
  const row = rows[0]
  if (!row || !row.published) return null
  return row
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const committee = await getCommittee(Number(id))
  if (!committee) return { title: "Committee | VAAP" }
  return {
    title: `${committee.name} | VAAP`,
    description: committee.description || `${committee.name} at VAAP`,
  }
}

export default async function CommitteeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) notFound()

  const [committee, user] = await Promise.all([getCommittee(numericId), getHeaderUser()])
  if (!committee) notFound()

  const headName = committee.headName || "To be announced"

  return (
    <>
      <SiteHeaderServer active="Governance" user={user} />
      <main>
        <div className="vaap-container py-12 lg:py-16">
          <Link
            href="/committees"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 transition-colors hover:text-green"
          >
            <ArrowLeft className="size-4" /> All committees
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[16rem_1fr] lg:gap-12">
            <div>
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-mint">
                {committee.headPhoto ? (
                  <Image
                    src={committee.headPhoto || "/placeholder.svg"}
                    alt={`${headName} portrait`}
                    fill
                    sizes="(max-width: 768px) 100vw, 256px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-5xl font-bold text-green/40">
                    {headName.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <span className="inline-flex rounded-md bg-mint px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-green">
                {committee.name}
              </span>
              <h1 className="mt-4 text-3xl font-bold text-heading lg:text-4xl">{headName}</h1>
              {committee.headTitle ? (
                <p className="mt-2 text-lg font-semibold text-green">{committee.headTitle}</p>
              ) : null}

              <div className="mt-6">
                <ProfileSocials
                  name={headName}
                  socials={{
                    linkedin: committee.headLinkedin,
                    x: committee.headX,
                    facebook: committee.headFacebook,
                    instagram: committee.headInstagram,
                    website: committee.headWebsite,
                    email: committee.headEmail,
                  }}
                />
              </div>

              {committee.description ? (
                <div className="mt-8">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">About the committee</h2>
                  <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-body">{committee.description}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
