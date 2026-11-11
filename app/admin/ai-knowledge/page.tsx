import { desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiKnowledgeSources } from "@/lib/db/schema"
import { KNOWLEDGE_CATEGORIES } from "@/lib/ai-assistant/knowledge"
import { AiKnowledgeManager } from "@/components/admin/ai-knowledge-manager"

export const metadata = { title: "AI Knowledge Center | VAAP Admin" }

export default async function AdminAiKnowledgePage() {
  const rows = await db
    .select({
      id: aiKnowledgeSources.id,
      title: aiKnowledgeSources.title,
      kind: aiKnowledgeSources.kind,
      category: aiKnowledgeSources.category,
      sourceUrl: aiKnowledgeSources.sourceUrl,
      fileName: aiKnowledgeSources.fileName,
      charCount: aiKnowledgeSources.charCount,
      chunkCount: aiKnowledgeSources.chunkCount,
      active: aiKnowledgeSources.active,
      updatedAt: aiKnowledgeSources.updatedAt,
    })
    .from(aiKnowledgeSources)
    .orderBy(desc(aiKnowledgeSources.updatedAt))

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-2xl font-bold text-heading">AI Knowledge Center</h1>
      <p className="mt-1 text-pretty text-muted-2">
        Documents, web pages and notes the VAAP AI Assistant uses to answer questions.
      </p>
      <AiKnowledgeManager
        categories={KNOWLEDGE_CATEGORIES}
        sources={rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))}
      />
    </div>
  )
}
