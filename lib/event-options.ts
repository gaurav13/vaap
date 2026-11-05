export const EVENT_CATEGORIES = [
  "Conference",
  "Workshop",
  "Roundtable",
  "Webinar",
  "Meetup",
  "Hackathon",
  "Training",
] as const

export const EVENT_CITIES = [
  "Islamabad",
  "Lahore",
  "Karachi",
  "Rawalpindi",
  "Peshawar",
  "Quetta",
  "Faisalabad",
  "Multan",
  "Online",
  "International",
] as const

export const EVENT_FORMATS = ["In-Person", "Hybrid", "Online", "By Invitation"] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]
export type EventCity = (typeof EVENT_CITIES)[number]
export type EventFormat = (typeof EVENT_FORMATS)[number]

export function pickOption<T extends readonly string[]>(options: T, value: unknown): T[number] | "" {
  const v = String(value ?? "").trim()
  return (options as readonly string[]).includes(v) ? (v as T[number]) : ""
}

const CATEGORY_COVERS: Record<string, string> = {
  Conference: "/images/events/cover-conference.png",
  Workshop: "/images/events/cover-workshop.png",
  Hackathon: "/images/events/cover-workshop.png",
  Training: "/images/events/cover-workshop.png",
  Roundtable: "/images/events/cover-roundtable.png",
}

export function eventCover(coverImage: string | null | undefined, category: string | null | undefined) {
  if (coverImage) return coverImage
  return CATEGORY_COVERS[category ?? ""] ?? "/images/events/cover-meetup.png"
}
