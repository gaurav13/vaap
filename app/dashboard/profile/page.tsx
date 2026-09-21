import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getMyMembership } from "@/app/actions/cms"
import { PageHeading } from "@/components/member/page-heading"
import { ProfileForm } from "@/components/member/profile-form"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user
  const membership = await getMyMembership(user.id)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading title="My Profile" description="Manage your personal details, organization, and industry information." />
      <div className="rounded-2xl border border-line bg-card p-6">
        <ProfileForm
          name={user.name ?? ""}
          email={user.email}
          image={user.image ?? ""}
          organization={membership?.organization ?? ""}
          ntn={membership?.ntn ?? ""}
          designation={membership?.designation ?? ""}
          phone={membership?.phone ?? ""}
          linkedin={membership?.linkedin ?? ""}
          website={membership?.website ?? ""}
          city={membership?.city ?? ""}
          bio={membership?.bio ?? ""}
          assetType={membership?.assetType ?? ""}
        />
      </div>
    </div>
  )
}
