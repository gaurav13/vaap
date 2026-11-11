import "server-only"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

// SOCIAL_CREDENTIALS_KEY lets credentials survive a BETTER_AUTH_SECRET rotation; otherwise the auth secret is used.
function key() {
  const secret = process.env.SOCIAL_CREDENTIALS_KEY || process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("Server encryption key is not configured.")
  return createHash("sha256").update(`vaap-social-credentials:${secret}`).digest()
}

export function encryptCredentials(value: Record<string, string>) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":")
}

export function decryptCredentials(stored: string): Record<string, string> {
  if (!stored) return {}
  const [version, iv, tag, data] = stored.split(":")
  if (version !== "v1" || !iv || !tag || !data) return {}
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"))
    decipher.setAuthTag(Buffer.from(tag, "base64"))
    const plain = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")
    const parsed = JSON.parse(plain)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    // Wrong key (e.g. rotated secret) or tampered data: treat as not connected.
    return {}
  }
}
