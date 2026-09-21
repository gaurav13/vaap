import Link from "next/link"
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarDays,
  FileCheck2,
  FileText,
  Home,
  IdCard,
  Settings,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react"

type GuideItem = {
  label: string
  href: string
  icon: LucideIcon
  what: string
  connects: string
}

type GuideGroup = {
  group: string
  blurb: string
  items: GuideItem[]
}

const GUIDE: GuideGroup[] = [
  {
    group: "Getting started",
    blurb: "Your home base and personal record inside the VAAP portal.",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
        what: "Your overview screen. Shows your membership status at a glance, your validity date, and quick shortcuts to the most-used pages.",
        connects:
          "Pulls live data from your Membership record and links straight into Membership, Voting Status and Events.",
      },
      {
        label: "My Profile",
        href: "/dashboard/profile",
        icon: User,
        what: "View and update your personal and organisation details, contact information and profile photo.",
        connects:
          "The name and details here are the same ones printed on your certificate and shown on the public verification page — keep them accurate.",
      },
    ],
  },
  {
    group: "Membership",
    blurb: "Everything tied to your official VAAP standing.",
    items: [
      {
        label: "Membership",
        href: "/dashboard/membership",
        icon: IdCard,
        what: "Your membership category, unique Membership ID, join date and validity. Membership runs for a fixed term of 1 year (365 days) from your registration date. From here you download your official certificate PDF and request a renewal.",
        connects:
          "The Download certificate button generates a PDF with your name, ID, validity and a unique QR code. That QR opens the Verify Membership page so anyone can confirm your certificate is genuine.",
      },
      {
        label: "Voting Status",
        href: "/dashboard/voting",
        icon: ShieldCheck,
        what: "Shows whether you are currently eligible to vote in VAAP elections and the criteria you need to meet.",
        connects:
          "Eligibility is calculated from your Membership — you must hold an active membership in good standing within its 365-day validity period.",
      },
      {
        label: "My Applications",
        href: "/dashboard/applications",
        icon: FileCheck2,
        what: "Track the status of any application you have submitted — membership, renewals or category changes — from pending to approved.",
        connects:
          "When an application is approved by the VAAP team, your Membership record and validity date update automatically.",
      },
      {
        label: "Verify Membership",
        href: "/membership/verify",
        icon: BadgeCheck,
        what: "A public page that confirms a membership is real and active. Enter a Membership ID, or scan the QR code on any certificate, to see the member's status and standing.",
        connects:
          "This is the same page your certificate QR code points to, so third parties can verify you without logging in.",
      },
    ],
  },
  {
    group: "Explore",
    blurb: "Programs, learning and opportunities across the VAAP community.",
    items: [
      {
        label: "Events",
        href: "/dashboard/events",
        icon: CalendarDays,
        what: "Browse upcoming VAAP events, register to attend, and submit your own event for the community.",
        connects:
          "Event access and submissions are tied to your active membership standing.",
      },
      {
        label: "Knowledge & Resources",
        href: "/dashboard/resources",
        icon: BookOpen,
        what: "A library of guides, publications and educational material on virtual assets and compliance.",
        connects: "Open to all members; some items may be reserved for specific membership categories.",
      },
      {
        label: "Opportunities",
        href: "/dashboard/opportunities",
        icon: Briefcase,
        what: "Jobs, partnerships and collaboration opportunities shared within the VAAP network.",
        connects: "Available to members in good standing.",
      },
      {
        label: "Documents",
        href: "/dashboard/documents",
        icon: FileText,
        what: "Official documents and downloads related to your membership and the association.",
        connects: "Your certificate and membership records are also reachable from the Membership page.",
      },
    ],
  },
  {
    group: "Account",
    blurb: "Help and control over your account.",
    items: [
      {
        label: "Support",
        href: "/dashboard/support",
        icon: FileText,
        what: "You are here. Message the VAAP team, browse frequently asked questions, and read this guide.",
        connects: "Messages you send reach the team using your account name and email automatically.",
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        what: "Manage your account preferences, change your password and control notifications.",
        connects: "Security changes here apply to how you sign in to the whole portal.",
      },
    ],
  },
]

export function MemberGuide() {
  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-heading">
            <BookOpen className="size-4 text-green" /> Member guide
          </h2>
          <p className="mb-1 mt-1 text-sm text-muted-2">
            A quick tour of every section of your dashboard — what each does and how it connects. Click any feature to
            open it.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-7">
        {GUIDE.map((group) => (
          <section key={group.group}>
            <div className="mb-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-green">{group.group}</h3>
              <p className="mt-0.5 text-xs text-muted-2">{group.blurb}</p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex h-full flex-col rounded-xl border border-line bg-muted/30 p-4 transition-colors hover:border-green/40 hover:bg-mint"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-green group-hover:bg-white">
                          <Icon className="size-4" />
                        </span>
                        <span className="flex items-center gap-1 text-sm font-bold text-heading">
                          {item.label}
                          <ArrowUpRight className="size-3.5 text-muted-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-green" />
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-body">{item.what}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-2">
                        <span className="font-semibold text-heading">Connects to: </span>
                        {item.connects}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
