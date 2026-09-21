import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { PageHeading } from "@/components/member/page-heading"
import { ChangePasswordForm, NotificationToggles } from "@/components/member/settings-form"

export default async function SettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading title="Settings" description="Manage your account security and notification preferences." />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-line bg-card p-6">
          <h2 className="text-base font-bold text-heading">Account</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-2">Name</dt>
              <dd className="mt-0.5 font-semibold text-heading">{user.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-2">Email</dt>
              <dd className="mt-0.5 truncate font-semibold text-heading">{user.email}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-card p-6">
          <h2 className="text-base font-bold text-heading">Change password</h2>
          <p className="mb-4 mt-1 text-sm text-muted-2">
            Use a strong password of at least 8 characters. Other sessions will be signed out.
          </p>
          <ChangePasswordForm />
        </section>

        <section className="rounded-2xl border border-line bg-card p-6">
          <h2 className="text-base font-bold text-heading">Notifications</h2>
          <p className="mt-1 text-sm text-muted-2">Choose which updates you want to receive by email.</p>
          <div className="mt-4">
            <NotificationToggles />
          </div>
        </section>
      </div>
    </div>
  )
}
