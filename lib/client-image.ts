/**
 * The live site sits behind an nginx proxy that rejects request bodies over 1MB,
 * so images are re-encoded in the browser to stay safely under that limit.
 */
export const UPLOAD_BYTE_LIMIT = 900_000

const SIZE_ERROR = "This image is too large to upload. Please use a smaller image (under 1MB)."

type PrepareOptions = {
  maxBytes?: number
  maxDimension?: number
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

function renamed(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "") || "image"
  return `${base}.${ext}`
}

export async function prepareImageForUpload(file: File, options: PrepareOptions = {}): Promise<File> {
  const maxBytes = options.maxBytes ?? UPLOAD_BYTE_LIMIT
  const maxDimension = options.maxDimension ?? 2400

  if (file.type === "image/gif") {
    if (file.size > maxBytes) throw new Error("Animated GIFs must be under 1MB. Please use a smaller GIF or a JPG/PNG.")
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    if (file.size <= maxBytes) return file
    throw new Error(SIZE_ERROR)
  }

  const fitsDimensions = Math.max(bitmap.width, bitmap.height) <= maxDimension
  if (file.size <= maxBytes && fitsDimensions) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    throw new Error(SIZE_ERROR)
  }

  let dimension = maxDimension
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      for (const quality of [0.86, 0.76, 0.66]) {
        const blob = await canvasToBlob(canvas, "image/webp", quality)
        if (blob && blob.type === "image/webp" && blob.size <= maxBytes) {
          return new File([blob], renamed(file.name, "webp"), { type: "image/webp" })
        }
        const jpeg = await canvasToBlob(canvas, "image/jpeg", quality)
        if (jpeg && jpeg.size <= maxBytes) {
          return new File([jpeg], renamed(file.name, "jpg"), { type: "image/jpeg" })
        }
      }
      dimension = Math.round(dimension * 0.75)
    }
  } finally {
    bitmap.close()
  }

  throw new Error(SIZE_ERROR)
}

/** Posts an image to an upload route and returns the stored URL. */
export async function postImageUpload(endpoint: string, file: File, fields: Record<string, string> = {}) {
  const prepared = await prepareImageForUpload(file)
  const body = new FormData()
  body.set("file", prepared)
  for (const [key, value] of Object.entries(fields)) body.set(key, value)

  const response = await fetch(endpoint, { method: "POST", body })
  if (response.status === 413) throw new Error(SIZE_ERROR)
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || `Image upload failed (error ${response.status}). Please try again.`)
  }
  return payload.url
}

/** Reads an image as a data URL, shrunk to stay within the request limit. */
export async function readImageAsDataUrl(file: File, maxBytes: number, maxDimension: number) {
  const prepared = await prepareImageForUpload(file, { maxBytes, maxDimension })
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read the image."))
    reader.readAsDataURL(prepared)
  })
}
