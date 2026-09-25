import Link from "next/link"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { VOTING_MENU } from "@/lib/site-settings"

export async function VotingSectionShell({
  currentHref,
  title,
  description,
  children,
}: {
  currentHref: string
  title: string
  description: string
  children: React.ReactNode
}) {
  const user = await getHeaderUser()
  const tabs = VOTING_MENU.children ?? []

  return (
    <>
      <SiteHeaderServer active="Voting" user={user} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-green">VAAP Voting</p>
          <h1 className="mt-2 text-balance text-3xl font-bold text-heading sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-2">{description}</p>
        </header>

        <nav aria-label="Voting sections" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-4">
          {tabs.map((tab) => {
            const active = tab.href === currentHref
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-green text-white" : "border border-line bg-background text-heading hover:bg-card"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {children}
      </main>
      <SiteFooter />
    </>
  )
}

export function EmptyVotingState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-sm text-muted-2">
      {message}
    </p>
  )
}
