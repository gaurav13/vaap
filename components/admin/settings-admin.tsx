"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Bell, Check, CornerDownRight, FilePlus2, GripVertical, Megaphone, Menu, Image as ImageIcon, Link2, Monitor, Network, PanelBottom, Plus, Power, Settings2, Smartphone, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveMenu, saveSocial, saveGeneral, saveBanner, saveNewsAlert, saveCtaBanner, saveGovHero, saveGovFramework, saveMembership, saveFooter, saveSiteStatus } from "@/app/actions/settings"
import { deletePageByHref, createPageForMenu } from "@/app/actions/cms"
import type { MenuItem, SocialLinks, General, Banner, NewsAlert, CtaBanner, GovHero, GovFramework, Membership, Footer, SiteStatus } from "@/lib/site-settings"

type Tab = "status" | "menu" | "alert" | "hero" | "framework" | "membership" | "banner" | "cta" | "links" | "footer" | "general"

const TABS: { key: Tab; label: string; icon: typeof Menu }[] = [
  { key: "status", label: "Website Status", icon: Power },
  { key: "menu", label: "Menu", icon: Menu },
  { key: "alert", label: "News Alert", icon: Bell },
  { key: "hero", label: "Governance Hero", icon: Monitor },
  { key: "framework", label: "National Framework", icon: Network },
  { key: "membership", label: "Membership Header", icon: Wallet },
  { key: "banner", label: "Banners", icon: ImageIcon },
  { key: "cta", label: "CTA Banner", icon: Megaphone },
  { key: "links", label: "Icons & Links", icon: Link2 },
  { key: "footer", label: "Footer", icon: PanelBottom },
  { key: "general", label: "General", icon: Settings2 },
]

const inputCls =
  "w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20"

// Built-in routes that always exist, so admins can point a menu item at any of
// them even though they are not CMS pages.
const CORE_PAGES: MenuItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Governance", href: "/governance" },
  { label: "Committees", href: "/committees" },
  { label: "Membership", href: "/membership" },
  { label: "Apply for Membership", href: "/membership/apply" },
  { label: "Verify Membership", href: "/membership/verify" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Knowledge Hub", href: "/knowledge" },
  { label: "Community", href: "/community" },
  { label: "News", href: "/news" },
  { label: "Events", href: "/events" },
  { label: "Contact", href: "/contact" },
]

function isExternalHref(href: string) {
  return /^(https?:)?\/\//.test(href) || /^(mailto:|tel:)/.test(href)
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-body">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-2">{hint}</span>}
    </label>
  )
}

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-green">
      <Check className="size-4" /> Saved
    </span>
  )
}

export function SettingsAdmin({
  menu,
  social,
  general,
  banner,
  newsAlert,
  govHero,
  govFramework,
  membership,
  footer,
  ctaBanner,
  siteStatus,
  canManageStatus = false,
  pageOptions,
}: {
  menu: MenuItem[]
  social: SocialLinks
  general: General
  banner: Banner
  newsAlert: NewsAlert
  govHero: GovHero
  govFramework: GovFramework
  membership: Membership
  footer: Footer
  ctaBanner: CtaBanner
  siteStatus: SiteStatus
  canManageStatus?: boolean
  pageOptions: MenuItem[]
}) {
  const [tab, setTab] = useState<Tab>("status")

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
                (active ? "bg-green text-white" : "text-body hover:bg-mint hover:text-navy")
              }
            >
              <Icon className="size-4" /> {t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {tab === "status" && <WebsiteStatusEditor initial={siteStatus} canManage={canManageStatus} />}
        {tab === "menu" && <MenuEditor initial={menu} pageOptions={pageOptions} />}
        {tab === "alert" && <NewsAlertEditor initial={newsAlert} />}
        {tab === "hero" && <HeroEditor initial={govHero} />}
        {tab === "framework" && <FrameworkEditor initial={govFramework} />}
        {tab === "membership" && <MembershipEditor initial={membership} />}
        {tab === "banner" && <BannerEditor initial={banner} />}
        {tab === "cta" && <CtaBannerEditor initial={ctaBanner} />}
        {tab === "links" && <LinksEditor initial={social} />}
        {tab === "footer" && <FooterEditor initial={footer} pageOptions={pageOptions} />}
        {tab === "general" && <GeneralEditor initial={general} />}
      </div>
    </div>
  )
}

function WebsiteStatusEditor({ initial, canManage }: { initial: SiteStatus; canManage: boolean }) {
  const router = useRouter()
  const [comingSoon, setComingSoon] = useState(initial.comingSoon)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = comingSoon !== initial.comingSoon
  const live = !comingSoon

  function onToggle(next: boolean) {
    setComingSoon(next)
    setSaved(false)
    setError(null)
  }

  function onSave() {
    startTransition(async () => {
      try {
        await saveSiteStatus(comingSoon)
        setSaved(true)
        router.refresh()
      } catch {
        setError("You do not have permission to change the website status.")
      }
    })
  }

  return (
    <div className="rounded-xl border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-heading">Website status</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-2">
            Control whether the public website is live or shows a &ldquo;Launching Soon&rdquo; page to visitors. Staff and
            admins always keep full access to the site and dashboard.
          </p>
        </div>
        <span
          className={
            "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold " +
            (live ? "bg-mint text-green" : "bg-[#F4E9CE] text-[#7A5B12]")
          }
        >
          <span className={"size-2 rounded-full " + (live ? "bg-green" : "bg-[#C6A15B]")} aria-hidden />
          {live ? "Website Live" : "Coming Soon Mode"}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-line bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className={"text-sm font-semibold " + (comingSoon ? "text-muted-2" : "text-heading")}>Website Live</span>
          <button
            type="button"
            role="switch"
            aria-checked={comingSoon}
            aria-label="Toggle Coming Soon mode"
            disabled={!canManage || pending}
            onClick={() => onToggle(!comingSoon)}
            className={
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
              (comingSoon ? "bg-[#C6A15B]" : "bg-green")
            }
          >
            <span
              className={
                "inline-block size-5 transform rounded-full bg-white shadow transition-transform " +
                (comingSoon ? "translate-x-6" : "translate-x-1")
              }
            />
          </button>
          <span className={"text-sm font-semibold " + (comingSoon ? "text-heading" : "text-muted-2")}>
            Coming Soon Mode
          </span>
        </div>

        <div className="flex items-center gap-3">
          <SavedBadge show={saved && !dirty} />
          <Button onClick={onSave} disabled={!canManage || pending || !dirty}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {!canManage && (
        <p className="mt-4 rounded-lg bg-mint/60 px-4 py-3 text-sm text-navy">
          Only a Super Admin can change the website launch status.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <p className="mt-5 text-xs leading-relaxed text-muted-2">
        {comingSoon
          ? "Coming Soon mode is ON: public visitors see the Launching Soon page. Turn it off to make the full website visible to everyone."
          : "The website is live: all public pages are visible to everyone. Switch to Coming Soon mode to show the Launching Soon page instead."}
      </p>
    </div>
  )
}

function MenuEditor({ initial, pageOptions }: { initial: MenuItem[]; pageOptions: MenuItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>(initial.length ? initial : [{ label: "", href: "" }])
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [pickHref, setPickHref] = useState("")
  const [pickTarget, setPickTarget] = useState("main")

  function update(i: number, patch: Partial<MenuItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
    setSaved(false)
  }
  function remove(i: number) {
    const item = items[i]
    const linked = pageOptions.find((p) => p.href === item.href)
    if (linked) {
      const alsoDelete = window.confirm(
        `Remove "${item.label || linked.label}" from the menu?\n\nThis item links to the page "${linked.label}". Click OK to also DELETE that page permanently, or Cancel to keep the page and only remove the menu item.`,
      )
      if (alsoDelete) {
        startTransition(async () => {
          const res = await deletePageByHref(item.href)
          if (!res.ok) window.alert(res.error ?? "Could not delete the linked page.")
          router.refresh()
        })
      }
    }
    setItems((prev) => prev.filter((_, idx) => idx !== i))
    setSaved(false)
  }
  function move(i: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setSaved(false)
  }
  function add(item?: MenuItem) {
    setItems((prev) => [...prev, item ?? { label: "", href: "" }])
    setSaved(false)
  }

  // Adds a chosen existing page either to the main menu or as a sub-item under
  // a selected top-level item, then resets the picker.
  function addExistingPage() {
    const page = [...CORE_PAGES, ...pageOptions].find((p) => p.href === pickHref)
    if (!page) return
    const entry: MenuItem = { label: page.label, href: page.href }
    if (pickTarget === "main") {
      setItems((prev) => [...prev, entry])
    } else {
      const idx = Number(pickTarget)
      setItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, children: [...(it.children ?? []), entry] } : it)),
      )
    }
    setPickHref("")
    setPickTarget("main")
    setSaved(false)
  }

  // --- sub-item (child) operations -------------------------------------
  function addChild(i: number) {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? { ...it, children: [...(it.children ?? []), { label: "", href: "" }] } : it,
      ),
    )
    setSaved(false)
  }
  function updateChild(i: number, ci: number, patch: Partial<MenuItem>) {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? { ...it, children: (it.children ?? []).map((c, cIdx) => (cIdx === ci ? { ...c, ...patch } : c)) }
          : it,
      ),
    )
    setSaved(false)
  }
  function removeChild(i: number, ci: number) {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? { ...it, children: (it.children ?? []).filter((_, cIdx) => cIdx !== ci) } : it,
      ),
    )
    setSaved(false)
  }
  function moveChild(i: number, ci: number, dir: -1 | 1) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it
        const children = [...(it.children ?? [])]
        const j = ci + dir
        if (j < 0 || j >= children.length) return it
        ;[children[ci], children[j]] = [children[j], children[ci]]
        return { ...it, children }
      }),
    )
    setSaved(false)
  }

  function onSave() {
    startTransition(async () => {
      await saveMenu(items)
      setSaved(true)
      router.refresh()
    })
  }

  // Create a published page from a top-level item's label and link it, then
  // persist the whole menu so the new href sticks.
  function createTopPage(i: number) {
    const label = items[i].label
    startTransition(async () => {
      const res = await createPageForMenu(label)
      if (!res.ok) {
        window.alert(res.error)
        return
      }
      const next = items.map((it, idx) => (idx === i ? { ...it, href: res.href } : it))
      setItems(next)
      await saveMenu(next)
      setSaved(true)
      router.refresh()
    })
  }

  // Create a published sub-page nested under its parent item's href and link it.
  function createChildPage(i: number, ci: number) {
    const parentHref = items[i].href
    const label = items[i].children?.[ci]?.label ?? ""
    startTransition(async () => {
      const res = await createPageForMenu(label, parentHref)
      if (!res.ok) {
        window.alert(res.error)
        return
      }
      const next = items.map((it, idx) =>
        idx === i
          ? { ...it, children: (it.children ?? []).map((c, cIdx) => (cIdx === ci ? { ...c, href: res.href } : c)) }
          : it,
      )
      setItems(next)
      await saveMenu(next)
      setSaved(true)
      router.refresh()
    })
  }

  const pageHrefs = new Set(pageOptions.map((p) => p.href))
  const usedHrefs = new Set(items.map((i) => i.href))
  const suggestions = pageOptions.filter((p) => !usedHrefs.has(p.href))

  return (
    <div className="rounded-xl border border-line bg-card p-6">
      <h2 className="text-lg font-bold text-heading">Navigation menu</h2>
      <p className="mt-1 text-sm text-muted-2">
        These items appear in the site header and footer. Reorder, rename, or point them at any page. Add sub-items to
        create a dropdown menu under a top-level item.
      </p>

      <ul className="mt-5 flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-lg border border-line bg-background p-2.5">
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 shrink-0 text-muted-2" />
              <input
                value={item.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Label"
                className={inputCls + " flex-1"}
              />
              <input
                value={item.href}
                onChange={(e) => update(i, { href: e.target.value })}
                placeholder="/path"
                className={inputCls + " flex-1"}
              />
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-mint hover:text-navy disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-mint hover:text-navy disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" onClick={() => remove(i)} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-destructive/10 hover:text-destructive" aria-label="Remove">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="ml-6 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {item.href && pageHrefs.has(item.href) ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green">
                  <Check className="size-3.5" /> Linked to page{" "}
                  <code className="rounded bg-mint px-1 py-0.5 text-[11px] text-navy">{item.href}</code>
                </span>
              ) : isExternalHref(item.href) ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-body">
                  <Link2 className="size-3.5 text-muted-2" /> Custom URL
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => createTopPage(i)}
                  disabled={pending || !item.label.trim()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-green hover:underline disabled:opacity-40"
                >
                  <FilePlus2 className="size-3.5" /> Create &amp; link page for this item
                </button>
              )}
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-body">
                <input
                  type="checkbox"
                  checked={!!item.newTab}
                  onChange={(e) => update(i, { newTab: e.target.checked })}
                  className="size-3.5 accent-[var(--color-green)]"
                />
                Open in new tab
              </label>
            </div>

            {(item.children?.length ?? 0) > 0 && (
              <ul className="ml-6 mt-2.5 flex flex-col gap-2 border-l-2 border-line pl-4">
                {item.children!.map((child, ci) => (
                  <li key={ci} className="rounded-lg border border-line bg-card p-2">
                    <div className="flex items-center gap-2">
                      <CornerDownRight className="size-4 shrink-0 text-muted-2" />
                      <input
                        value={child.label}
                        onChange={(e) => updateChild(i, ci, { label: e.target.value })}
                        placeholder="Sub-item label"
                        className={inputCls + " flex-1"}
                      />
                      <input
                        value={child.href}
                        onChange={(e) => updateChild(i, ci, { href: e.target.value })}
                        placeholder="/path"
                        className={inputCls + " flex-1"}
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => moveChild(i, ci, -1)} disabled={ci === 0} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-mint hover:text-navy disabled:opacity-30" aria-label="Move up">
                          <ArrowUp className="size-4" />
                        </button>
                        <button type="button" onClick={() => moveChild(i, ci, 1)} disabled={ci === item.children!.length - 1} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-mint hover:text-navy disabled:opacity-30" aria-label="Move down">
                          <ArrowDown className="size-4" />
                        </button>
                        <button type="button" onClick={() => removeChild(i, ci)} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-destructive/10 hover:text-destructive" aria-label="Remove">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="ml-6 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {child.href && pageHrefs.has(child.href) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green">
                          <Check className="size-3.5" /> Linked to page{" "}
                          <code className="rounded bg-mint px-1 py-0.5 text-[11px] text-navy">{child.href}</code>
                        </span>
                      ) : isExternalHref(child.href) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-body">
                          <Link2 className="size-3.5 text-muted-2" /> Custom URL
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => createChildPage(i, ci)}
                          disabled={pending || !child.label.trim() || !item.href.trim()}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green hover:underline disabled:opacity-40"
                          title={!item.href.trim() ? "Give the parent item a path or create its page first" : undefined}
                        >
                          <FilePlus2 className="size-3.5" /> Create &amp; link page under this item
                        </button>
                      )}
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-body">
                        <input
                          type="checkbox"
                          checked={!!child.newTab}
                          onChange={(e) => updateChild(i, ci, { newTab: e.target.checked })}
                          className="size-3.5 accent-[var(--color-green)]"
                        />
                        Open in new tab
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => addChild(i)}
              className="ml-6 mt-2 inline-flex items-center gap-1.5 pl-4 text-xs font-semibold text-green hover:underline"
            >
              <Plus className="size-3.5" /> Add sub-item
            </button>
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => add()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:underline">
        <Plus className="size-4" /> Add menu item
      </button>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-2">Add an existing page to the menu</p>
        <p className="mt-1 text-xs text-muted-2">
          Pick any page and place it in the main menu or as a sub-item (dropdown) under a top-level item.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={pickHref}
            onChange={(e) => setPickHref(e.target.value)}
            className={inputCls + " sm:flex-1"}
            aria-label="Choose a page"
          >
            <option value="">Choose a page…</option>
            {CORE_PAGES.length > 0 && (
              <optgroup label="Core pages">
                {CORE_PAGES.map((p) => (
                  <option key={"core:" + p.href} value={p.href}>
                    {p.label} — {p.href}
                  </option>
                ))}
              </optgroup>
            )}
            {pageOptions.length > 0 && (
              <optgroup label="CMS pages">
                {pageOptions.map((p) => (
                  <option key={"cms:" + p.href} value={p.href}>
                    {p.label} — {p.href}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <select
            value={pickTarget}
            onChange={(e) => setPickTarget(e.target.value)}
            className={inputCls + " sm:w-64"}
            aria-label="Choose where to add it"
          >
            <option value="main">Add to main menu</option>
            {items.map((it, i) =>
              it.label.trim() ? (
                <option key={i} value={String(i)}>
                  Under: {it.label}
                </option>
              ) : null,
            )}
          </select>
          <Button type="button" variant="outline" disabled={!pickHref} onClick={addExistingPage}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-2">Add a published page</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <button
                key={p.href}
                type="button"
                onClick={() => add(p)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-background px-3 py-1.5 text-sm text-body transition-colors hover:border-green-border hover:text-navy"
              >
                <Plus className="size-3.5" /> {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save menu"}
        </Button>
        <SavedBadge show={saved} />
      </div>
    </div>
  )
}

function LinkListEditor({
  title,
  items,
  onChange,
  pageOptions,
}: {
  title: string
  items: MenuItem[]
  onChange: (next: MenuItem[]) => void
  pageOptions: MenuItem[]
}) {
  function update(i: number, patch: Partial<MenuItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...items]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <h3 className="text-sm font-bold text-heading">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg border border-line bg-background p-2">
            <GripVertical className="size-4 shrink-0 text-muted-2" />
            <input
              value={item.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Label"
              className={inputCls + " flex-1"}
            />
            <input
              value={item.href}
              onChange={(e) => update(i, { href: e.target.value })}
              placeholder="/path or https://…"
              list="footer-page-options"
              className={inputCls + " flex-1"}
            />
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-mint hover:text-navy disabled:opacity-30" aria-label="Move up">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-mint hover:text-navy disabled:opacity-30" aria-label="Move down">
                <ArrowDown className="size-4" />
              </button>
              <button type="button" onClick={() => remove(i)} className="flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-destructive/10 hover:text-destructive" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, { label: "", href: "" }])}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:underline"
      >
        <Plus className="size-4" /> Add link
      </button>
      {pageOptions.length > 0 && (
        <datalist id="footer-page-options">
          {pageOptions.map((p) => (
            <option key={p.href} value={p.href}>
              {p.label}
            </option>
          ))}
        </datalist>
      )}
    </div>
  )
}

function FooterEditor({ initial, pageOptions }: { initial: Footer; pageOptions: MenuItem[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<Footer>(initial)

  function set<K extends keyof Footer>(key: K, value: Footer[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      await saveFooter(form)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6">
      <h2 className="text-lg font-bold text-heading">Site footer</h2>
      <p className="mt-1 text-sm text-muted-2">
        The footer shown on every page — brand tagline, link columns, newsletter box, and bottom legal bar. Changes
        publish live on save.
      </p>

      <div className="mt-5 grid gap-4 rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold text-heading">Brand column</h3>
        <Field label="Tagline (serif)" hint="e.g. A Stronger Digital Pakistan">
          <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} />
        </Field>
        <Field label="Bottom brand tagline" hint="Shown bottom-right with gold rules, e.g. People • Policy • Progress">
          <input value={form.brandTagline} onChange={(e) => set("brandTagline", e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="Quick Links heading">
          <input value={form.quickLinksHeading} onChange={(e) => set("quickLinksHeading", e.target.value)} className={inputCls} />
        </Field>
        <LinkListEditor
          title="Quick Links"
          items={form.quickLinks}
          onChange={(next) => set("quickLinks", next)}
          pageOptions={pageOptions}
        />
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="Useful Resources heading">
          <input value={form.resourcesHeading} onChange={(e) => set("resourcesHeading", e.target.value)} className={inputCls} />
        </Field>
        <LinkListEditor
          title="Useful Resources"
          items={form.resources}
          onChange={(next) => set("resources", next)}
          pageOptions={pageOptions}
        />
      </div>

      <div className="mt-4 grid gap-4 rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold text-heading">Newsletter box</h3>
        <Field label="Heading">
          <input value={form.newsletterHeading} onChange={(e) => set("newsletterHeading", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={form.newsletterText} onChange={(e) => set("newsletterText", e.target.value)} rows={2} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button label">
            <input value={form.newsletterCta} onChange={(e) => set("newsletterCta", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Privacy note">
            <input value={form.privacyNote} onChange={(e) => set("privacyNote", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <LinkListEditor
          title="Bottom legal links"
          items={form.legal}
          onChange={(next) => set("legal", next)}
          pageOptions={pageOptions}
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save footer"}</Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

function CtaBannerEditor({ initial }: { initial: CtaBanner }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveCtaBanner(formData)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6" onChange={() => setSaved(false)}>
      <h2 className="text-lg font-bold text-heading">Membership CTA banner</h2>
      <p className="mt-1 text-sm text-muted-2">The large call-to-action banner shown just above the footer on every page.</p>

      <label className="mt-5 flex items-center gap-2 text-sm text-body">
        <input type="checkbox" name="enabled" defaultChecked={initial.enabled} className="size-4 accent-[var(--color-green)]" />
        Show this banner
      </label>

      <div className="mt-4 grid gap-4">
        <Field label="Eyebrow" hint="Small uppercase label above the heading">
          <input name="eyebrow" defaultValue={initial.eyebrow} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading (white part)">
            <input name="headingLine1" defaultValue={initial.headingLine1} className={inputCls} />
          </Field>
          <Field label="Heading (green highlight)">
            <input name="headingHighlight" defaultValue={initial.headingHighlight} className={inputCls} />
          </Field>
        </div>
  <Field label="Description">
  <textarea name="description" defaultValue={initial.description} rows={2} className={inputCls} />
  </Field>
  
  <Field label="Banner link" hint="Clicking anywhere on the banner goes here, e.g. /membership">
  <input name="bannerHref" defaultValue={initial.bannerHref} className={inputCls} />
  </Field>
  
  <div className="grid gap-4 sm:grid-cols-2">
  <Field label="Primary button label">
            <input name="primaryLabel" defaultValue={initial.primaryLabel} className={inputCls} />
          </Field>
          <Field label="Primary button link" hint="e.g. /membership/apply">
            <input name="primaryHref" defaultValue={initial.primaryHref} className={inputCls} />
          </Field>
          <Field label="Secondary button label">
            <input name="secondaryLabel" defaultValue={initial.secondaryLabel} className={inputCls} />
          </Field>
          <Field label="Secondary button link" hint="e.g. /membership">
            <input name="secondaryHref" defaultValue={initial.secondaryHref} className={inputCls} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Feature 1"><input name="feature1" defaultValue={initial.feature1} className={inputCls} /></Field>
          <Field label="Feature 2"><input name="feature2" defaultValue={initial.feature2} className={inputCls} /></Field>
          <Field label="Feature 3"><input name="feature3" defaultValue={initial.feature3} className={inputCls} /></Field>
          <Field label="Feature 4"><input name="feature4" defaultValue={initial.feature4} className={inputCls} /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Side line" hint="Top-right small text, use line breaks with Enter">
            <input name="sideLine" defaultValue={initial.sideLine} className={inputCls} />
          </Field>
          <Field label="Side statement" hint="Top-right gold statement">
            <input name="sideStatement" defaultValue={initial.sideStatement} className={inputCls} />
          </Field>
        </div>

        <Field label="Tagline" hint="Small uppercase line under the features">
          <input name="tagline" defaultValue={initial.tagline} className={inputCls} />
        </Field>

        <Field label="Background image" hint="Path like /images/cta-membership.png or a URL.">
          <input name="image" defaultValue={initial.image} className={inputCls} />
        </Field>
        <Field label="Image alt text" hint="Used by screen readers.">
          <input name="imageAlt" defaultValue={initial.imageAlt} className={inputCls} />
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save CTA banner"}</Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

function BannerEditor({ initial }: { initial: Banner }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveBanner(formData)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6" onChange={() => setSaved(false)}>
      <h2 className="text-lg font-bold text-heading">Homepage call-to-action banner</h2>
      <p className="mt-1 text-sm text-muted-2">The promotional banner shown near the bottom of the homepage and member dashboard.</p>

      <label className="mt-5 flex items-center gap-2 text-sm text-body">
        <input type="checkbox" name="enabled" defaultChecked={initial.enabled} className="size-4 accent-[var(--color-green)]" />
        Show this banner
      </label>

      <div className="mt-4 grid gap-4">
        <Field label="Title">
          <input name="title" defaultValue={initial.title} className={inputCls} />
        </Field>
        <Field label="Subtitle">
          <input name="subtitle" defaultValue={initial.subtitle} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button label">
            <input name="ctaLabel" defaultValue={initial.ctaLabel} className={inputCls} />
          </Field>
          <Field label="Button link" hint="e.g. /opportunities or https://…">
            <input name="ctaHref" defaultValue={initial.ctaHref} className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save banner"}</Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

function NewsAlertEditor({ initial }: { initial: NewsAlert }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveNewsAlert(formData)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6" onChange={() => setSaved(false)}>
      <h2 className="text-lg font-bold text-heading">Site-wide news alert</h2>
      <p className="mt-1 text-sm text-muted-2">
        A thin announcement bar shown at the very top of the header across every page. Use it for launches, deadlines, or
        important news.
      </p>

      <label className="mt-5 flex items-center gap-2 text-sm text-body">
        <input type="checkbox" name="enabled" defaultChecked={initial.enabled} className="size-4 accent-[var(--color-green)]" />
        Show the alert bar
      </label>

      <div className="mt-4 grid gap-4">
        <Field label="Message">
          <input name="message" defaultValue={initial.message} className={inputCls} placeholder="Announce your latest news…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link label" hint="Leave blank for a text-only alert">
            <input name="linkLabel" defaultValue={initial.linkLabel} className={inputCls} placeholder="Learn more" />
          </Field>
          <Field label="Link URL" hint="e.g. /news or https://…">
            <input name="linkHref" defaultValue={initial.linkHref} className={inputCls} placeholder="/news" />
          </Field>
        </div>
        <Field label="Highlight color" hint="The background color of the alert bar">
          <div className="flex flex-wrap gap-2">
            {(
              [
              { value: "green", label: "Green", swatch: "bg-green" },
              { value: "mint", label: "Mint", swatch: "bg-mint" },
              { value: "blue", label: "Blue", swatch: "bg-[#e6ecfb]" },
              { value: "sand", label: "Sand", swatch: "bg-gold-tint" },
              { value: "rose", label: "Rose", swatch: "bg-[#fbeaec]" },
              { value: "charcoal", label: "Charcoal", swatch: "bg-[#2f3540]" },
              { value: "slate", label: "Slate", swatch: "bg-[#e9ebef]" },
              { value: "violet", label: "Violet", swatch: "bg-[#ece7fb]" },
            ] as const
            ).map((c, i) => (
              <label
                key={c.value}
                className="group relative flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-sm text-body has-[:checked]:border-green has-[:checked]:ring-1 has-[:checked]:ring-green"
              >
                <input
                  type="radio"
                  name="color"
                  value={c.value}
                  defaultChecked={(initial.color ?? "green") === c.value}
                  className="sr-only"
                />
                <span className={`size-4 rounded-full border border-black/10 ${c.swatch}`} aria-hidden />
                {c.label}
              </label>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm text-body">
          <input
            type="checkbox"
            name="dismissible"
            defaultChecked={initial.dismissible}
            className="size-4 accent-[var(--color-green)]"
          />
          Let visitors dismiss it (reappears when the message changes)
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save alert"}</Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

function LinksEditor({ initial }: { initial: SocialLinks }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveSocial(formData)
      setSaved(true)
      router.refresh()
    })
  }

  const rows: { name: keyof SocialLinks; label: string; placeholder: string }[] = [
    { name: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/…" },
    { name: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
    { name: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
    { name: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
    { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  ]

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6" onChange={() => setSaved(false)}>
      <h2 className="text-lg font-bold text-heading">Social icons & links</h2>
      <p className="mt-1 text-sm text-muted-2">Links used by the social icons in the footer. Leave blank to hide an icon.</p>

      <div className="mt-5 grid gap-4">
        {rows.map((r) => (
          <Field key={r.name} label={r.label}>
            <input name={r.name} defaultValue={initial[r.name]} placeholder={r.placeholder} className={inputCls} />
          </Field>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save links"}</Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

function FrameworkEditor({ initial }: { initial: GovFramework }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<GovFramework>(initial)

  function set<K extends keyof GovFramework>(key: K, value: GovFramework[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveGovFramework(formData)
      setSaved(true)
      router.refresh()
    })
  }

  const textField = (name: keyof GovFramework, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input
        name={name}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        className={inputCls}
      />
    </Field>
  )

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6">
      <h2 className="text-lg font-bold text-heading">National Framework section</h2>
      <p className="mt-1 text-sm text-muted-2">
        The institutional flow on the <code className="rounded bg-mint px-1 text-navy">/governance</code> page. Leave a
        logo field blank to fall back to a neutral icon. Use official uploaded assets for institutional emblems and
        logos.
      </p>

      <div className="mt-5 grid gap-4">
        {textField("eyebrow", "Eyebrow (small label)")}
        {textField("heading", "Heading")}
        <Field label="Description">
          <textarea
            name="description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-6 grid gap-4 rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold text-heading">Card 1 — Government</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("govName", "Name")}
          {textField("govDescription", "Description")}
        </div>
        {textField("govLogo", "Emblem / logo", "Path like /pakistan-emblem.webp or a URL. Blank = neutral icon.")}
      </div>

      <div className="mt-4 grid gap-4 rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold text-heading">Card 2 — Ministry of Finance</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("mofName", "Name")}
          {textField("mofDescription", "Description")}
        </div>
        {textField("mofLogo", "Logo / icon", "Blank = neutral building icon.")}
      </div>

      <div className="mt-4 grid gap-4 rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold text-heading">Card 3 — PVARA (Regulatory Authority)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("pvaraName", "Short name")}
          {textField("pvaraRole", "Role tag", "Shown as a small uppercase tag, e.g. Regulatory Authority.")}
        </div>
        {textField("pvaraFullName", "Full name")}
        {textField("pvaraDescription", "Description")}
        {textField("pvaraLogo", "Logo / icon", "Blank = neutral shield icon.")}
      </div>

      <div className="mt-4 grid gap-4 rounded-lg border-2 border-[#247049] bg-[#EAF8F3] p-4">
        <div>
          <h3 className="text-sm font-bold text-heading">Card 4 — VAAP (National Industry Representative)</h3>
          <p className="mt-1 text-xs text-muted-2">
            VAAP is the industry representative body — never labelled a regulator. This card is intentionally the
            strongest in the section.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("vaapBadge", "Top badge", "e.g. Industry Representative")}
          {textField("vaapEyebrow", "Eyebrow (above logo)", "e.g. National Industry Representative")}
        </div>
        {textField("vaapName", "Organisation name", "e.g. Virtual Assets Association of Pakistan")}
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("vaapRole", "Role label (green, bold)", "e.g. National Industry Representation")}
          {textField("vaapSupporting", "Supporting line")}
        </div>
        {textField("vaapLogo", "VAAP logo", "Blank = built-in VAAP logo.")}

        <div className="rounded-lg border border-[#247049]/40 bg-white/60 p-3">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="vaapVerified"
              defaultChecked={form.vaapVerified}
              onChange={(e) => set("vaapVerified", e.target.checked)}
              className="mt-0.5 size-4 accent-[#247049]"
            />
            <span className="text-xs leading-relaxed text-navy">
              <span className="font-bold">Super Admin only — legal status verified.</span> Enable ONLY when VAAP&apos;s
              status as the single national industry representative has been verified against official DGTO / Ministry
              of Commerce documentation. When enabled, the stronger status line and recognition wording below are shown.
            </span>
          </label>
          <div className="mt-3 grid gap-4">
            {textField("vaapVerifiedRole", "Verified role line", "Shown instead of the role label when verified.")}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold text-heading">Card 5 — Industry & Community</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("industryTitle", "Title")}
          {textField("industryDescription", "Description")}
        </div>
        {textField("industryLogo", "Logo / icon", "Blank = neutral users icon.")}
      </div>

      <div className="mt-4 grid gap-4 rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold text-heading">Bottom clarification strip</h3>
        {textField("clarificationLead", "Lead text (regular)")}
        {textField("clarificationEmphasis", "Emphasis text (semibold)")}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save & publish framework"}
        </Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

function HeroEditor({ initial }: { initial: GovHero }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<GovHero>(initial)
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")

  function set<K extends keyof GovHero>(key: K, value: GovHero[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveGovHero(formData)
      setSaved(true)
      router.refresh()
    })
  }

  const previewImg = device === "mobile" ? form.mobileImage || form.desktopImage : form.desktopImage
  const previewPos = device === "mobile" ? form.mobilePosition : form.desktopPosition
  const s = Math.min(Math.max(form.overlay, 0), 100) / 100
  const overlayStyle = {
    background: `linear-gradient(90deg, rgba(3,42,46,${(0.96 * s).toFixed(3)}) 0%, rgba(3,42,46,${(0.88 * s).toFixed(
      3,
    )}) 35%, rgba(3,42,46,${(0.55 * s).toFixed(3)}) 65%, rgba(3,42,46,${(0.15 * s).toFixed(3)}) 100%)`,
  }
  const statementLines = form.statement.split("\n").filter(Boolean)

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
      <div className="rounded-xl border border-line bg-card p-6">
        <h2 className="text-lg font-bold text-heading">Governance hero section</h2>
        <p className="mt-1 text-sm text-muted-2">
          The full-width hero at the top of the <code className="rounded bg-mint px-1 text-navy">/governance</code> page.
          Changes publish live on save.
        </p>

        <div className="mt-5 grid gap-4">
          <Field label="Eyebrow (small label)">
            <input name="eyebrow" value={form.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Heading line 1">
              <input name="headingLine1" value={form.headingLine1} onChange={(e) => set("headingLine1", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Heading line 2">
              <input name="headingLine2" value={form.headingLine2} onChange={(e) => set("headingLine2", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Highlighted heading text (green)">
            <input name="headingHighlight" value={form.headingHighlight} onChange={(e) => set("headingHighlight", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea name="description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CTA button text">
              <input name="ctaLabel" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className={inputCls} />
            </Field>
            <Field label="CTA button link">
              <input name="ctaHref" value={form.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Trust indicator 1">
              <input name="trust1" value={form.trust1} onChange={(e) => set("trust1", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Trust indicator 2">
              <input name="trust2" value={form.trust2} onChange={(e) => set("trust2", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Trust indicator 3">
              <input name="trust3" value={form.trust3} onChange={(e) => set("trust3", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Right-side brand statement" hint="One line per row.">
            <textarea name="statement" value={form.statement} onChange={(e) => set("statement", e.target.value)} rows={5} className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" name="showStatement" checked={form.showStatement} onChange={(e) => set("showStatement", e.target.checked)} className="size-4 accent-[var(--color-green)]" />
            Show the right-side brand statement (desktop only)
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desktop background image" hint="Path like /images/hero.png or a URL.">
              <input name="desktopImage" value={form.desktopImage} onChange={(e) => set("desktopImage", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Mobile background image" hint="Optional mobile crop.">
              <input name="mobileImage" value={form.mobileImage} onChange={(e) => set("mobileImage", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desktop image position" hint="CSS object-position, e.g. center or 70% center.">
              <input name="desktopPosition" value={form.desktopPosition} onChange={(e) => set("desktopPosition", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Mobile image position">
              <input name="mobilePosition" value={form.mobilePosition} onChange={(e) => set("mobilePosition", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Image alt / description" hint="Used by screen readers.">
            <input name="imageAlt" value={form.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} className={inputCls} />
          </Field>

          <Field label={`Overlay strength — ${form.overlay}%`} hint="Higher = darker overlay, better text contrast.">
            <input type="range" name="overlay" min={0} max={100} step={5} value={form.overlay} onChange={(e) => set("overlay", Number(e.target.value))} className="w-full accent-[var(--color-green)]" />
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save & publish hero"}</Button>
          <SavedBadge show={saved} />
        </div>
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-2">Live preview</span>
            <div className="flex gap-1 rounded-lg border border-line p-0.5">
              <button type="button" onClick={() => setDevice("desktop")} className={"flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold " + (device === "desktop" ? "bg-green text-white" : "text-body hover:bg-mint hover:text-navy")}>
                <Monitor className="size-3.5" /> Desktop
              </button>
              <button type="button" onClick={() => setDevice("mobile")} className={"flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold " + (device === "mobile" ? "bg-green text-white" : "text-body hover:bg-mint hover:text-navy")}>
                <Smartphone className="size-3.5" /> Mobile
              </button>
            </div>
          </div>

          <div className={"mx-auto mt-4 overflow-hidden rounded-lg bg-navy " + (device === "mobile" ? "max-w-[240px]" : "w-full")}>
            <div className={"relative isolate flex items-center " + (device === "mobile" ? "min-h-[380px]" : "min-h-[240px]")}>
              {previewImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImg || "/placeholder.svg"} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: previewPos || "center" }} />
              ) : null}
              <div aria-hidden className="absolute inset-0" style={overlayStyle} />
              {device === "mobile" && <div aria-hidden className="absolute inset-0 bg-navy-dark/40" />}
              <div className="relative px-4 py-5">
                <div className={device === "mobile" ? "w-full" : "max-w-[60%]"}>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-green">{form.eyebrow}</p>
                  <p className="mt-1.5 text-sm font-extrabold leading-tight text-white">
                    {form.headingLine1} {form.headingLine2}{" "}
                    <span className="text-green">{form.headingHighlight}</span>
                  </p>
                  <p className="mt-1.5 line-clamp-3 text-[9px] leading-snug text-white/80">{form.description}</p>
                  <span className="mt-2.5 inline-flex items-center gap-1 rounded bg-green px-2.5 py-1 text-[9px] font-semibold text-white">
                    {form.ctaLabel}
                  </span>
                  <div className={"mt-2.5 flex gap-2 " + (device === "mobile" ? "" : "flex-wrap")}>
                    {[form.trust1, form.trust2, form.trust3].filter(Boolean).map((t) => (
                      <span key={t} className="text-[7px] font-semibold uppercase tracking-wide text-white/90">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              {device === "desktop" && form.showStatement && statementLines.length > 0 && (
                <div aria-hidden className="absolute right-[34%] top-1/2 -translate-y-1/2 border-l-2 border-green pl-1.5">
                  {statementLines.map((l, i) => (
                    <span key={i} className="block text-[7px] font-medium uppercase leading-tight text-white">{l}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-2">Approximate preview. View the live page for exact rendering.</p>
        </div>
      </div>
    </form>
  )
}

function MembershipEditor({ initial }: { initial: Membership }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<Membership>(initial)

  function set<K extends keyof Membership>(key: K, value: Membership[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveMembership(formData)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6">
      <h2 className="text-lg font-bold text-heading">Membership page header</h2>
      <p className="mt-1 text-sm text-muted-2">
        The intro header at the top of the <code className="rounded bg-mint px-1 text-navy">/membership</code> page.
        Individual plans, pricing, benefits and eligibility are managed under{" "}
        <code className="rounded bg-mint px-1 text-navy">Membership Plans</code>.
      </p>

      <div className="mt-5 grid gap-4">
        <Field label="Eyebrow (small label)">
          <input name="eyebrow" value={form.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Heading">
          <input name="heading" value={form.heading} onChange={(e) => set("heading", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea name="description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} />
        </Field>
        <Field label="Right-side brand statement" hint="One line per row. Shown as a faded watermark on desktop.">
          <textarea name="statement" value={form.statement} onChange={(e) => set("statement", e.target.value)} rows={5} className={inputCls} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" name="showStatement" checked={form.showStatement} onChange={(e) => set("showStatement", e.target.checked)} className="size-4 accent-[var(--color-green)]" />
          Show the right-side brand statement (desktop only)
        </label>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-bold text-heading">Plan content typography</h3>
        <p className="mt-1 text-sm text-muted-2">
          Controls the font of each plan&apos;s description, benefits and eligibility text on the page.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Content font">
            <select name="contentFont" value={form.contentFont} onChange={(e) => set("contentFont", e.target.value as Membership["contentFont"])} className={inputCls}>
              <option value="sans">Sans-serif (default)</option>
              <option value="serif">Serif</option>
            </select>
          </Field>
          <Field label="Content text size">
            <select name="contentSize" value={form.contentSize} onChange={(e) => set("contentSize", e.target.value as Membership["contentSize"])} className={inputCls}>
              <option value="sm">Small</option>
              <option value="base">Normal (default)</option>
              <option value="lg">Large</option>
            </select>
          </Field>
        </div>
        <p className={`mt-4 rounded-lg border border-line bg-muted/30 p-3 leading-relaxed text-body ${form.contentFont === "serif" ? "font-serif" : "font-sans"} ${form.contentSize === "sm" ? "text-sm" : form.contentSize === "lg" ? "text-lg" : "text-base"}`}>
          Preview: Be part of a transparent, collaborative and forward-looking digital asset ecosystem in Pakistan.
        </p>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-bold text-heading">Eligibility criteria typography</h3>
        <p className="mt-1 text-sm text-muted-2">
          Controls the font of the &ldquo;Eligibility Criteria&rdquo; list on each plan.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Eligibility font">
            <select name="eligibilityFont" value={form.eligibilityFont} onChange={(e) => set("eligibilityFont", e.target.value as Membership["eligibilityFont"])} className={inputCls}>
              <option value="sans">Sans-serif (default)</option>
              <option value="serif">Serif</option>
            </select>
          </Field>
          <Field label="Eligibility text size">
            <select name="eligibilitySize" value={form.eligibilitySize} onChange={(e) => set("eligibilitySize", e.target.value as Membership["eligibilitySize"])} className={inputCls}>
              <option value="sm">Small (default)</option>
              <option value="base">Normal</option>
              <option value="lg">Large</option>
            </select>
          </Field>
        </div>
        <p className={`mt-4 rounded-lg border border-line bg-muted/30 p-3 leading-relaxed text-body ${form.eligibilityFont === "serif" ? "font-serif" : "font-sans"} ${form.eligibilitySize === "base" ? "text-base" : form.eligibilitySize === "lg" ? "text-lg" : "text-sm"}`}>
          Preview: Pakistan-registered legal entity (with valid NTN).
        </p>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-bold text-heading">FAQ section header</h3>
        <p className="mt-1 text-sm text-muted-2">
          The heading above the FAQ accordion on the Membership page. Individual questions and answers are managed under{" "}
          <code className="rounded bg-mint px-1 text-navy">Membership FAQs</code>.
        </p>
        <div className="mt-4 grid gap-4">
          <Field label="FAQ eyebrow (small label)">
            <input name="faqEyebrow" value={form.faqEyebrow} onChange={(e) => set("faqEyebrow", e.target.value)} className={inputCls} />
          </Field>
          <Field label="FAQ heading">
            <input name="faqHeading" value={form.faqHeading} onChange={(e) => set("faqHeading", e.target.value)} className={inputCls} />
          </Field>
          <Field label="FAQ description">
            <textarea name="faqDescription" value={form.faqDescription} onChange={(e) => set("faqDescription", e.target.value)} rows={2} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link label" hint="Leave blank to hide the link.">
              <input name="faqCtaLabel" value={form.faqCtaLabel} onChange={(e) => set("faqCtaLabel", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Link URL">
              <input name="faqCtaHref" value={form.faqCtaHref} onChange={(e) => set("faqCtaHref", e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save & publish header"}</Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

function GeneralEditor({ initial }: { initial: General }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveGeneral(formData)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-card p-6" onChange={() => setSaved(false)}>
      <h2 className="text-lg font-bold text-heading">General website settings</h2>
      <p className="mt-1 text-sm text-muted-2">Site title, tagline, and footer text.</p>

      <div className="mt-5 grid gap-4">
        <Field label="Site title">
          <input name="siteTitle" defaultValue={initial.siteTitle} className={inputCls} />
        </Field>
        <Field label="Tagline">
          <input name="tagline" defaultValue={initial.tagline} className={inputCls} />
        </Field>
        <Field label="Footer description">
          <textarea name="footerText" defaultValue={initial.footerText} rows={3} className={inputCls} />
        </Field>
        <Field label="Copyright line">
          <input name="copyright" defaultValue={initial.copyright} className={inputCls} />
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}
