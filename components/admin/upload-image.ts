export async function uploadPageImageFile(
  file: File,
  folder: "pages" | "news" | "articles" | "events" | "publications" = "pages",
): Promise<string> {
  const body = new FormData()
  body.set("file", file)
  body.set("folder", folder)
  const response = await fetch("/api/admin/upload", { method: "POST", body })
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Image upload failed.")
  }
  return payload.url
}
