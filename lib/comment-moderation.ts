export const COMMENT_COOLDOWN_MS = 60 * 60 * 1000
export const COMMENT_DAILY_LIMIT = 5
export const COMMENT_WINDOW_MS = 24 * 60 * 60 * 1000

export const COMMUNITY_RULES = [
  "Plain text only. Images, attachments, and formatting are not allowed.",
  "No links or website addresses of any kind.",
  "Do not share email addresses, phone numbers, or other personal or contact information.",
  "No abusive, hateful, threatening, or offensive language. Be respectful to all members.",
  "Stay on topic and discuss the proposal itself.",
  `You may post one comment per hour, up to ${COMMENT_DAILY_LIMIT} comments in 24 hours.`,
] as const

const ABUSIVE_TERMS = [
  "fuck", "fucking", "fucker", "shit", "bitch", "bastard", "asshole", "dick", "cunt", "whore", "slut",
  "motherfucker", "retard", "idiot", "stupid", "moron", "scammer", "chutiya", "chutia", "harami",
  "kutta", "kutti", "kamina", "kameena", "gandu", "bhenchod", "behenchod", "madarchod", "randi", "ullu ka pattha",
]

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" }

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/(.)\1{2,}/g, "$1$1")
}

const HTML_TAG = /<\s*\/?\s*[a-z][^>]*>/i
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/
const DATA_URI = /data:[a-z]+\/[a-z0-9.+-]+;base64,/i
const URL_PATTERN =
  /(https?:\/\/|ftp:\/\/|www\.)\S+|\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|io|co|pk|info|biz|xyz|app|dev|me|ly|gg|tv|link|site|online|store|us|uk|in|ae|ai)(\/\S*)?\b/i
const EMAIL_PATTERN = /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\sat\s)\s*[a-z0-9.-]+\s*(\.|\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}/i
const PHONE_PATTERN = /(\+?\d[\d\s().-]{8,}\d)/
const CNIC_PATTERN = /\b\d{5}-?\d{7}-?\d\b/
const CONTACT_APPS = /\b(whats\s?app|telegram|signal|wechat|dm me|inbox me|contact me at|call me)\b/i

export function validateCommentText(raw: string): string | null {
  const text = raw.trim()
  if (text.length < 2) return "Write a comment before posting."
  if (HTML_TAG.test(text) || MARKDOWN_IMAGE.test(text) || DATA_URI.test(text)) {
    return "Only plain text is allowed. Images and HTML are not permitted."
  }
  if (EMAIL_PATTERN.test(text)) return "Sharing email addresses is not allowed."
  if (URL_PATTERN.test(text)) return "Links and website addresses are not allowed."
  if (CNIC_PATTERN.test(text) || PHONE_PATTERN.test(text) || CONTACT_APPS.test(text)) {
    return "Sharing phone numbers, IDs, or contact details is not allowed."
  }
  const normalized = normalize(text)
  const abusive = ABUSIVE_TERMS.some((term) =>
    new RegExp(`(^|[^a-z])${term.replace(/\s+/g, "\\s+")}([^a-z]|$)`, "i").test(normalized),
  )
  if (abusive) return "Your comment contains abusive or offensive language. Please keep it respectful."
  return null
}

export function formatWait(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} hour${hours === 1 ? "" : "s"}${rest ? ` ${rest} min` : ""}`
}
