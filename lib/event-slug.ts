export function slugifyEventTitle(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "")
  return base || "event"
}

export function eventPath(event: { id: number; slug?: string | null }) {
  return `/events/${event.slug || event.id}`
}
