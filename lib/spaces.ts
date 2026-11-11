import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
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

const IMAGE_FOLDERS = new Set(["pages", "news", "articles", "events", "publications", "governance", "kol", "media-coverage"])
// Folders that also accept SVG logos (sanitised, served with an image content type).
const SVG_FOLDERS = new Set(["media-coverage"])
const MAX_SVG_BYTES = 512 * 1024

/**
 * Skips an optional XML declaration, comments and an SVG doctype, then checks for
 * the `<svg` root. Done with indexOf scanning rather than one regex so crafted
 * input cannot trigger catastrophic backtracking.
 */
function startsWithSvgRoot(text: string): boolean {
  let rest = text.replace(/^\uFEFF/, "").trimStart()
  const skipPast = (terminator: string) => {
    const end = rest.indexOf(terminator)
    if (end === -1) return false
    rest = rest.slice(end + terminator.length).trimStart()
    return true
  }
  if (rest.startsWith("<?xml") && !skipPast(">")) return false
  while (rest.startsWith("<!--")) {
    if (!skipPast("-->")) return false
  }
  if (rest.slice(0, 13).toLowerCase() === "<!doctype svg" && !skipPast(">")) return false
  return /^<svg[\s>]/i.test(rest)
}

/** Returns the SVG text when it is a plain, script-free vector image; null otherwise. */
function safeSvgText(bytes: Uint8Array): string | null {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SVG_BYTES) return null
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return null
  }
  if (!startsWithSvgRoot(text)) return null
  const lower = text.toLowerCase()
  const forbidden = [
    /<script/,
    /<foreignobject/,
    /<iframe/,
    /<embed/,
    /<object/,
    /<!entity/,
    /\son[a-z]+\s*=/,
    /javascript:/,
    /data:text\/html/,
    /(?:xlink:)?href\s*=\s*["']\s*(?!#|data:image\/)/,
  ]
  return forbidden.some((pattern) => pattern.test(lower)) ? null : text
}

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

// Private uploads (KOL verification evidence). Stored without a public ACL and
// only ever streamed back through an authorised route.
export async function uploadPrivateDocument(file: { bytes: Uint8Array; fileName: string; folder: string }) {
  const detected = sniffedType(file.bytes)
  const extension = detected ? FILE_TYPES.get(detected) : undefined
  if (!detected || !extension) throw new Error("Upload a PDF or an image (JPEG, PNG, WebP).")
  if (file.bytes.byteLength === 0) throw new Error("That file is empty.")
  if (file.bytes.byteLength > MAX_PDF_BYTES) throw new Error("File is too large (max 20MB).")
  const key = `${file.folder}/${randomUUID()}.${extension}`
  await spacesClient().send(
    new PutObjectCommand({
      Bucket: requiredEnv("SPACES_BUCKET"),
      Key: key,
      Body: file.bytes,
      ContentType: detected,
      ACL: "private",
    }),
  )
  return { key, contentType: detected }
}

export async function getPrivateObject(key: string) {
  const res = await spacesClient().send(new GetObjectCommand({ Bucket: requiredEnv("SPACES_BUCKET"), Key: key }))
  if (!res.Body) throw new Error("File not found")
  return { bytes: await res.Body.transformToByteArray(), contentType: res.ContentType ?? "application/octet-stream" }
}

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

function startsWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

function sniffedType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png"
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif"
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp"
  }
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(...bytes.slice(8, 12))
    if (brand === "avif" || brand === "avis") return "image/avif"
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf"
  return null
}

export async function uploadPageImage(file: {
  bytes: Uint8Array
  contentType: string
  folder?: string
  fileName?: string
}) {
  if (SVG_FOLDERS.has(file.folder ?? "") && !sniffedType(file.bytes)) {
    if (!safeSvgText(file.bytes)) {
      throw new Error("Upload a PNG, JPG, WebP, or a plain SVG logo (no scripts or external links, max 512KB).")
    }
    const svgKey = `${file.folder}/${randomUUID()}.svg`
    await spacesClient().send(
      new PutObjectCommand({
        Bucket: requiredEnv("SPACES_BUCKET"),
        Key: svgKey,
        Body: file.bytes,
        ContentType: "image/svg+xml",
        ContentDisposition: "inline",
        ACL: "public-read",
        CacheControl: "public, max-age=31536000",
      }),
    )
    return publicSpaceUrl(svgKey)
  }

  const detected = sniffedType(file.bytes)
  const extension = detected ? FILE_TYPES.get(detected) : undefined
  if (!detected || !extension) throw new Error("Upload a JPEG, PNG, WebP, GIF, AVIF image, or a PDF.")
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
      ContentType: detected,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000",
    }),
  )

  return publicSpaceUrl(key)
}
