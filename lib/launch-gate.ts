// Public routes that stay reachable while the site is in "Launching Soon" mode.
// Staff/admin areas and auth stay open so the launch toggle can be managed, and
// the membership application plus certificate verification must resolve before launch.
export const LAUNCH_EXEMPT_PREFIXES = [
  "/admin",
  "/dashboard",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/api",
  "/membership/apply",
  "/membership/verify",
]

export function isLaunchExempt(pathname: string): boolean {
  return LAUNCH_EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
