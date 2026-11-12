import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getLeadershipStudio } from "@/app/actions/leadership"
import { LeadershipStudio } from "@/components/admin/leadership/studio"

export const metadata = { title: "Leadership Profile Studio | VAAP Admin" }

export default async function LeadershipStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getLeadershipStudio(Number(id))
  if (!data) notFound()

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <Link href="/admin/leadership" className="inline-flex w-fit items-center gap-1 text-sm text-muted-2 hover:text-green">
        <ChevronLeft className="size-4" aria-hidden="true" /> Leadership
      </Link>
      <LeadershipStudio data={data} />
    </div>
  )
}
