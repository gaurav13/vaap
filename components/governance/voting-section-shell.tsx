import Link from "next/link"
import { BookOpen, CalendarDays, CheckCircle2, ChevronRight, ShieldCheck, Vote } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { VOTING_MENU } from "@/lib/site-settings"

const TAB_ICONS: Record<string, typeof Vote> = {
  "/voting/active": Vote,
  "/voting/upcoming": CalendarDays,
  "/voting/results": CheckCircle2,
  "/voting/guidelines": BookOpen,
}

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
      <main className="bg-mint-2/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:py-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-2">
            <Link href="/" className="hover:text-green">
              Home
            </Link>
            <ChevronRight className="size-4" aria-hidden />
            <Link href="/voting" className="hover:text-green">
              Voting
            </Link>
            <ChevronRight className="size-4" aria-hidden />
            <span className="font-medium text-heading">{title}</span>
          </nav>

          <header className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-r from-gold-tint via-background to-mint">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
              <img src="/images/support-faisal-mosque.png" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-gold-tint via-gold-tint/40 to-transparent" />
            </div>
            <div className="relative max-w-xl p-6 sm:p-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-tint px-3 py-1 text-xs font-semibold text-green">
                <ShieldCheck className="size-3.5" aria-hidden /> VAAP Voting
              </p>
              <h1 className="mt-4 text-balance font-serif text-4xl font-bold leading-tight text-heading">{title}</h1>
              <p className="mt-3 text-pretty leading-relaxed text-muted-2">{description}</p>
            </div>
          </header>

          <section className="overflow-hidden rounded-3xl border border-line bg-card">
            <nav aria-label="Voting sections" className="flex gap-2 overflow-x-auto border-b border-line px-4 pt-3 sm:px-6">
              {tabs.map((tab) => {
                const active = tab.href === currentHref
                const Icon = TAB_ICONS[tab.href] ?? Vote
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                      active ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden />
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 sm:p-6">{children}</div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

export function EmptyVotingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-gold/40 bg-gold-tint/50 px-6 py-10">
      <CalendarDays className="size-8 shrink-0 text-gold" aria-hidden />
      <p className="text-sm font-medium text-heading">{message}</p>
    </div>
  )
}
