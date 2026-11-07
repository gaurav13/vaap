import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getSession } from "@/lib/session"
import { getSeoGlobals } from "@/lib/seo/config"
import { SeoGlobalsForm } from "@/components/admin/seo/seo-globals-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Global SEO", robots: { index: false, follow: false } }

export default async function SeoSettingsPage() {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin/seo")
  const globals = await getSeoGlobals()

  return (
    <div>
      <Link href="/admin/seo" className="inline-flex items-center gap-1 text-sm font-medium text-green hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> SEO
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-heading">Global SEO settings</h1>
      <p className="mt-1 text-muted-2">Site-wide defaults, organization details, verification codes and crawler rules.</p>
      <SeoGlobalsForm initial={globals} />
    </div>
  )
}
