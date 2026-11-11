import "server-only"
import { generateText, Output } from "ai"
import { z } from "zod"
import { classifyAiError, resolveModel } from "@/lib/ai-assistant/provider"
import { PLATFORMS, categoryLabel, type CategoryRules } from "@/lib/social-agent/config"

const CAPTION_MODEL = "openai/gpt-4.1-mini"

const GUIDANCE: Record<string, string> = {
  linkedin: "Professional, 80-150 words, short paragraphs, 3-5 hashtags at the end.",
  facebook: "Warm and informative, 50-110 words, 2-4 hashtags.",
  instagram: "Engaging opening line, 40-90 words, line breaks, 5-10 hashtags at the end. Mention 'link in bio' instead of a URL.",
  x: "One concise post, maximum 240 characters including the link and 1-2 hashtags.",
  tiktok: "Short, energetic, 20-50 words, 3-6 hashtags, suited to a short video.",
  youtube: "A title line (max 90 characters), a blank line, then a 50-100 word description with the link.",
}

/** Writes one caption per selected platform from the approved record. Facts come only from the record fields. */
export async function generateCaptions(opts: {
  category: string
  fields: Record<string, string>
  url: string
  platforms: string[]
  rules: Pick<CategoryRules, "captionRules" | "hashtags">
}): Promise<{ captions: Record<string, string>; error?: string }> {
  const platforms = PLATFORMS.filter((p) => opts.platforms.includes(p.key))
  if (platforms.length === 0) return { captions: {} }
  const facts = Object.entries(opts.fields)
    .filter(([k, v]) => v && !/photo|image|logo/i.test(k))
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n")

  try {
    const { model } = await resolveModel(CAPTION_MODEL)
    const { output } = await generateText({
      model,
      maxOutputTokens: 2500,
      output: Output.object({
        schema: z.object(Object.fromEntries(platforms.map((p) => [p.key, z.string()])) as Record<string, z.ZodString>),
      }),
      prompt: `You write official social media captions for VAAP (Virtual Asset Industry Alliance of Pakistan).

Announcement category: ${categoryLabel(opts.category)}
Approved website record:
${facts}
Link: ${opts.url}

Rules:
- Use only the facts above. Never invent names, numbers, dates, quotes or claims.
- English, professional and accurate. No emojis unless the category rules ask for them.
- Include the link where the platform allows links in captions.
- Preferred hashtags: ${opts.rules.hashtags || "#VAAP"}
${opts.rules.captionRules ? `- Category rules from the Super Admin: ${opts.rules.captionRules}` : ""}

Write a caption for each platform:
${platforms.map((p) => `- ${p.key}: ${GUIDANCE[p.key]}`).join("\n")}`,
    })
    const captions: Record<string, string> = {}
    for (const p of platforms) {
      const text = String((output as Record<string, string>)[p.key] ?? "").trim()
      captions[p.key] = text.length > p.captionLimit ? `${text.slice(0, p.captionLimit - 1).trimEnd()}…` : text
    }
    return { captions }
  } catch (error) {
    const info = classifyAiError(error)
    console.log("[v0] social caption generation failed:", info.code, info.detail)
    return { captions: {}, error: info.userMessage }
  }
}
