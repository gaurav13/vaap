import { redirect } from "next/navigation"

type Params = { slug: string[] }

// Legacy /p/<slug> URLs now live at clean URLs (/<slug> or /<parent>/<slug>).
// Permanently redirect so old links keep working.
export default async function LegacyCmsPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  redirect(`/${slug.join("/")}`)
}
