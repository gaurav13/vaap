import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { desc, eq } from "drizzle-orm"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { emailTemplates, emailTemplateVersions } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { getTemplateDefinition } from "@/lib/email-templates/registry"
import { appBaseUrl, emailSupportAddress, withDefaults } from "@/lib/email-templates/service"
import { EmailTemplateEditor } from "@/components/admin/email-template-editor"

export default async function EditEmailTemplatePage({ params }: { params: Promise<{ key: string }> }) {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin")

  const { key: rawKey } = await params
  const key = decodeURIComponent(rawKey)
  const def = getTemplateDefinition(key)
  if (!def) notFound()

  let row: typeof emailTemplates.$inferSelect | undefined
  let versions: (typeof emailTemplateVersions.$inferSelect)[] = []
  try {
    ;[[row], versions] = await Promise.all([
      db.select().from(emailTemplates).where(eq(emailTemplates.key, key)).limit(1),
      db
        .select()
        .from(emailTemplateVersions)
        .where(eq(emailTemplateVersions.templateKey, key))
        .orderBy(desc(emailTemplateVersions.version))
        .limit(25),
    ])
  } catch {
    // fall back to defaults
  }

  const live = withDefaults(key, row?.publishedContent)
  const draft = row?.draftContent ? withDefaults(key, row.draftContent) : null

  return (
    <div>
      <Link href="/admin/emails" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All templates
      </Link>
      <h1 className="mt-3 font-serif text-2xl font-bold text-heading">{def.name}</h1>
      <p className="mt-1 max-w-3xl text-pretty leading-relaxed text-muted-2">
        {def.trigger} · Sent to {def.recipient.toLowerCase()}
      </p>

      <EmailTemplateEditor
        templateKey={key}
        defaults={def.defaults}
        live={live}
        draft={draft}
        variables={def.variables}
        baseUrl={appBaseUrl()}
        supportEmail={emailSupportAddress}
        meta={{
          publishedVersion: row?.publishedVersion ?? 0,
          publishedAt: row?.publishedAt?.toISOString() ?? null,
          publishedBy: row?.publishedBy ?? null,
          draftUpdatedAt: row?.draftUpdatedAt?.toISOString() ?? null,
          draftUpdatedBy: row?.draftUpdatedBy ?? null,
        }}
        versions={versions.map((v) => ({
          id: v.id,
          version: v.version,
          publishedBy: v.publishedBy,
          createdAt: v.createdAt.toISOString(),
          subject: v.content.subject,
        }))}
        adminEmail={session.user.email}
      />
    </div>
  )
}
