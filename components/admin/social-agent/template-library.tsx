"use client"

import Link from "next/link"
import { Upload } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CATEGORIES } from "@/lib/social-agent/config"
import { activateTemplate, deleteTemplate, uploadTemplate } from "@/app/actions/social-agent"
import { Notice, selectClass, useAgentAction } from "./ui"
import type { EditorTemplate } from "./template-editor"

export function TemplateLibrary({ templates }: { templates: EditorTemplate[] }) {
  const { pending, message, run } = useAgentAction()
  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4 md:flex-row md:items-end"
        action={(fd) => run(() => uploadTemplate(fd), "Template uploaded. Open it to define the content areas.")}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="up-category">Category</Label>
          <select id="up-category" name="category" className={selectClass} required>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="up-name">Template name</Label>
          <Input id="up-name" name="name" placeholder="e.g. Advisory Board 2026" required maxLength={80} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="up-file">Banner design (PNG, JPG, WebP · max 8 MB)</Label>
          <Input id="up-file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        </div>
        <Button type="submit" disabled={pending}>
          <Upload className="size-4" aria-hidden="true" /> {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
      <Notice message={message} />

      {CATEGORIES.map((c) => {
        const list = templates.filter((t) => t.category === c.key)
        return (
          <section key={c.key} aria-labelledby={`tpl-${c.key}`} className="flex flex-col gap-3">
            <h3 id={`tpl-${c.key}`} className="font-serif text-lg font-bold text-heading">
              {c.label} <span className="text-sm font-normal text-muted-2">({list.length})</span>
            </h3>
            {list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted-2">No template yet. Upload a banner design for this category.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((t) => (
                  <li key={t.id} className="flex flex-col overflow-hidden rounded-lg border border-line bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.imageUrl || "/placeholder.svg"} alt={`${t.name} banner`} className="aspect-video w-full bg-muted object-contain" />
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-heading">{t.name}</p>
                        {t.active && <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-green">Active</span>}
                      </div>
                      <p className="text-xs text-muted-2">
                        {t.width}×{t.height}px · {t.layers.length} content area{t.layers.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <Link href={`/admin/social-agent?tab=templates&edit=${t.id}`} className={buttonVariants({ size: "sm" })}>
                          Edit areas
                        </Link>
                        {!t.active && (
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => activateTemplate(t.id), "Template activated.")}>
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          disabled={pending}
                          onClick={() => confirm(`Delete "${t.name}"?`) && run(() => deleteTemplate(t.id), "Template deleted.")}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
