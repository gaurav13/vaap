export const APPLICATION_FILTERS = ["all", "incomplete", "pending", "unpaid", "approved", "rejected", "archived"] as const

export type ApplicationFilter = (typeof APPLICATION_FILTERS)[number]

export function parseApplicationFilter(value: string | undefined): ApplicationFilter {
  return APPLICATION_FILTERS.find((f) => f === value) ?? "all"
}
