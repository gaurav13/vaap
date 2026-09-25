import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { randomUUID } from "node:crypto"

const FILE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
  ["application/pdf", "pdf"],
])

export const MAX_PAGE_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_PDF_BYTES = 20 * 1024 * 1024

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not set.`)
  return value
}

function spacesClient() {
  return new S3Client({
    region: requiredEnv("SPACES_REGION"),
    endpoint: requiredEnv("SPACES_ENDPOINT"),
    credentials: {
      accessKeyId: requiredEnv("SPACES_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("SPACES_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: false,
  })
}

export function publicSpaceUrl(key: string) {
  const bucket = requiredEnv("SPACES_BUCKET")
  const region = requiredEnv("SPACES_REGION")
  const configured = process.env.SPACES_CDN_URL?.trim().replace(/\/$/, "")
  const base = configured || `https://${bucket}.${region}.cdn.digitaloceanspaces.com`
  return `${base}/${key}`
}

const IMAGE_FOLDERS = new Set(["pages", "news", "articles", "events", "publications", "governance"])

export const DOCUMENT_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.ms-powerpoint", "ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["text/csv", "csv"],
  ["text/plain", "txt"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
])
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
const DOCUMENT_EXTENSIONS = new Set(DOCUMENT_TYPES.values())
const EXTENSION_MIME = new Map([...DOCUMENT_TYPES].map(([mime, ext]) => [ext, mime]))

export async function uploadProposalDocument(file: { bytes: Uint8Array; contentType: string; fileName: string }) {
  const nameExt = file.fileName.toLowerCase().split(".").pop() ?? ""
  const extension = DOCUMENT_TYPES.get(file.contentType) ?? (DOCUMENT_EXTENSIONS.has(nameExt) ? nameExt : undefined)
  if (!extension) throw new Error("Upload a PDF, Word, Excel, PowerPoint, CSV, text, JPG, or PNG file.")
  if (file.bytes.byteLength === 0) throw new Error("That file is empty.")
  if (file.bytes.byteLength > MAX_DOCUMENT_BYTES) throw new Error("File is too large (max 20MB).")

  const contentType = EXTENSION_MIME.get(extension) ?? "application/octet-stream"
  const key = `governance-documents/${randomUUID()}.${extension}`
  await spacesClient().send(
    new PutObjectCommand({
      Bucket: requiredEnv("SPACES_BUCKET"),
      Key: key,
      Body: file.bytes,
      ContentType: contentType,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000",
    }),
  )
  return { url: publicSpaceUrl(key), extension, contentType }
}

export async function uploadPageImage(file: {
  bytes: Uint8Array
  contentType: string
  folder?: string
  fileName?: string
}) {
  const contentType = file.contentType || "application/octet-stream"
  const namedPdf = file.fileName?.toLowerCase().endsWith(".pdf")
  const extension =
    FILE_TYPES.get(contentType) ?? (namedPdf && contentType === "application/octet-stream" ? "pdf" : undefined)
  if (!extension) throw new Error("Upload a JPEG, PNG, WebP, GIF, AVIF image, or a PDF.")
  if (extension === "pdf" && file.folder !== "publications") {
    throw new Error("Upload a JPEG, PNG, WebP, GIF, or AVIF image.")
  }
  if (file.bytes.byteLength === 0) throw new Error("That file is empty.")
  const maxBytes = extension === "pdf" ? MAX_PDF_BYTES : MAX_PAGE_IMAGE_BYTES
  if (file.bytes.byteLength > maxBytes) {
    throw new Error(extension === "pdf" ? "PDF is too large (max 20MB)." : "Image is too large (max 8MB).")
  }

  const folder = IMAGE_FOLDERS.has(file.folder ?? "") ? file.folder : "pages"
  const bucket = requiredEnv("SPACES_BUCKET")
  const key = `${folder}/${randomUUID()}.${extension}`

  await spacesClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.bytes,
      ContentType: extension === "pdf" ? "application/pdf" : file.contentType,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000",
    }),
  )

  return publicSpaceUrl(key)
}
