// Convert DB rows (which may contain Date objects) into plain, client-safe
// objects for passing from Server Components into Client Components.
export function serializeRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      out[key] = value instanceof Date ? value.toISOString() : value
    }
    return out as T & { id: number }
  })
}
