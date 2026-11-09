// Canonical public origin for anything a user shares outside the site
// (referral links, invite links). Never derived from the current request or
// window.location, so links copied from localhost or a preview deployment
// still point at production.
export const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vaap.org.pk").trim().replace(/\/+$/, "")
