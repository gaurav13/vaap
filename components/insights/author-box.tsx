import Image from "next/image"
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
      className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-muted/40 p-4 sm:p-5"
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-mint ring-2 ring-background">
        {photo ? (
          <Image src={photo || "/placeholder.svg"} alt={authorName} fill sizes="56px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-base font-bold text-green" aria-hidden="true">
            {initials(authorName)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">Written by</span>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold text-heading">{authorName}</span>
          <span className="truncate text-xs font-medium text-green">{role}</span>
        </p>
        <p className="text-sm leading-relaxed text-body text-pretty">{bio}</p>
      </div>
    </aside>
  )
}
