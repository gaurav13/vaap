import { richTextToPlain } from "@/lib/rich-text-plain"
import Image from "next/image"
import { Landmark } from "lucide-react"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { members, staffProfiles, user } from "@/lib/db/schema"

const BIO_LIMIT = 80

function clip(text: string, limit = BIO_LIMIT) {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:-]+$/, "")}…`
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

async function getAuthorProfile(authorId: string | null) {
  if (!authorId) return null
  const [[account], [staff], [member]] = await Promise.all([
    db.select({ image: user.image }).from(user).where(eq(user.id, authorId)).limit(1),
    db
      .select({ position: staffProfiles.position, bio: staffProfiles.bio, photo: staffProfiles.photo })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, authorId))
      .limit(1),
    db
      .select({
        designation: members.designation,
        organization: members.organization,
        bio: members.bio,
        authorBio: members.authorBio,
      })
      .from(members)
      .where(eq(members.userId, authorId))
      .limit(1),
  ])
  return { account, staff, member }
}

export async function AuthorBox({
  authorId,
  authorName,
  authorRole,
}: {
  authorId: string | null
  authorName: string
  authorRole: string
}) {
  const profile = await getAuthorProfile(authorId).catch(() => null)

  const photo = profile?.staff?.photo || profile?.account?.image || null
  const title = [profile?.staff?.position || profile?.member?.designation, profile?.member?.organization]
    .filter(Boolean)
    .join(" · ")
  const role = title || (authorRole && authorRole !== "member" ? authorRole : "VAAP Contributor")
  const bio = clip(
    profile?.member?.authorBio ||
      profile?.staff?.bio ||
      profile?.member?.bio ||
      "Contributor to VAAP insights on Pakistan's virtual asset and digital economy.",
  )

  return (
    <aside
      aria-label="About the author"
      className="flex items-center gap-4 rounded-3xl border border-line bg-gradient-to-r from-card to-mint/60 p-4 shadow-sm sm:gap-6 sm:p-6"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-mint ring-2 ring-green ring-offset-2 ring-offset-card sm:size-20">
        {photo ? (
          <Image src={photo || "/placeholder.svg"} alt={authorName} fill sizes="80px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-lg font-bold text-green" aria-hidden="true">
            {initials(authorName)}
          </span>
        )}
      </div>
      <span className="hidden h-16 w-px self-center bg-green/40 sm:block" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-green">Written by</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-xl font-bold text-heading sm:text-2xl">{authorName}</span>
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green sm:text-sm">
            <Landmark className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{role}</span>
          </span>
        </div>
        <p className="text-sm leading-relaxed text-body text-pretty sm:text-base">{richTextToPlain(bio)}</p>
      </div>
    </aside>
  )
}
