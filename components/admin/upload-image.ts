import { postImageUpload } from "@/lib/client-image"

export async function uploadPageImageFile(
  file: File,
  folder: "pages" | "news" | "articles" | "events" | "publications" | "governance" | "media-coverage" = "pages",
): Promise<string> {
  return postImageUpload("/api/admin/upload", file, { folder })
}
