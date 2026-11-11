"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Tv } from "lucide-react"

export type MediaCoverageItem = { id: number; name: string; logo: string; url: string }

const SPEED_PX_PER_SEC = 40
const DRAG_THRESHOLD_PX = 6

export function MediaCoverageSlider({ items }: { items: MediaCoverageItem[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const offset = useRef(0)
  const pendingNudge = useRef(0)
  const setWidth = useRef(0)
  const paused = useRef(false)
  const reducedMotion = useRef(false)
  const drag = useRef<{ startX: number; lastX: number; moved: boolean } | null>(null)
  const [copies, setCopies] = useState(2)

  const wrap = (value: number) => {
    const w = setWidth.current
    return w > 0 ? ((value % w) + w) % w : 0
  }

  const paint = useCallback(() => {
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${-offset.current}px,0,0)`
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return
    const measure = () => {
      const lis = track.children
      const perSet = items.length
      if (lis.length < perSet) return
      const first = lis[0] as HTMLElement
      const last = lis[perSet - 1] as HTMLElement
      const w = last.offsetLeft + last.offsetWidth - first.offsetLeft
      setWidth.current = w
      const needed = w > 0 ? Math.ceil(viewport.clientWidth / w) + 1 : 2
      setCopies((c) => (c === Math.max(2, needed) ? c : Math.max(2, needed)))
      offset.current = wrap(offset.current)
      paint()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(track)
    return () => observer.disconnect()
  }, [items.length, copies, paint])

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotion.current = query.matches
    const onChange = () => (reducedMotion.current = query.matches)
    query.addEventListener("change", onChange)

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000
      last = now
      let delta = 0
      if (pendingNudge.current !== 0) {
        const share = reducedMotion.current ? pendingNudge.current : pendingNudge.current * Math.min(1, dt * 8)
        pendingNudge.current = Math.abs(pendingNudge.current - share) < 0.5 ? 0 : pendingNudge.current - share
        delta += share
      } else if (!paused.current && !drag.current && !reducedMotion.current && document.visibilityState === "visible") {
        delta += SPEED_PX_PER_SEC * dt
      }
      if (delta !== 0) {
        offset.current = wrap(offset.current + delta)
        paint()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      query.removeEventListener("change", onChange)
    }
  }, [paint])

  const nudge = (direction: 1 | -1) => {
    const card = trackRef.current?.querySelector("li")
    pendingNudge.current += (card ? card.getBoundingClientRect().width : 180) * direction
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    drag.current = { startX: e.clientX, lastX: e.clientX, moved: false }
    pendingNudge.current = 0
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.abs(e.clientX - d.startX) > DRAG_THRESHOLD_PX) {
      d.moved = true
      viewportRef.current?.setPointerCapture(e.pointerId)
    }
    if (d.moved) {
      offset.current = wrap(offset.current - (e.clientX - d.lastX))
      paint()
    }
    d.lastX = e.clientX
  }
  const endDrag = () => {
    const d = drag.current
    drag.current = null
    if (d?.moved) {
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault()
        ev.stopPropagation()
      }
      viewportRef.current?.addEventListener("click", swallow, { capture: true, once: true })
      setTimeout(() => viewportRef.current?.removeEventListener("click", swallow, { capture: true }), 0)
    }
  }

  const revealFocused = (e: React.FocusEvent) => {
    paused.current = true
    const li = (e.target as HTMLElement).closest("li")
    const viewport = viewportRef.current
    if (!li || !viewport) return
    const left = li.offsetLeft - offset.current
    if (left < 0 || left + li.offsetWidth > viewport.clientWidth) {
      offset.current = wrap(li.offsetLeft - 8)
      paint()
    }
  }

  if (items.length === 0) return null

  const rendered = Array.from({ length: copies }, (_, copy) => items.map((item) => ({ item, copy }))).flat()

  return (
    <section aria-labelledby="media-coverage-heading" className="mt-8 border-t border-white/10 pt-6 sm:mt-10 sm:pt-8">
      <div className="flex items-center justify-center gap-4">
        <span className="hidden h-px flex-1 bg-gradient-to-r from-transparent to-gold/60 sm:block" aria-hidden="true" />
        <h2
          id="media-coverage-heading"
          className="flex max-w-full items-center gap-3 font-sans text-lg font-bold tracking-tight text-white sm:text-xl lg:text-2xl"
        >
          <Tv className="size-6 shrink-0 text-gold sm:size-7" strokeWidth={1.75} aria-hidden="true" />
          <span className="text-balance">
            As Seen On <span className="text-gold">National TV &amp; Media</span>
          </span>
        </h2>
        <span className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-gold/60 sm:block" aria-hidden="true" />
      </div>

      <div
        className="mt-4 flex items-center gap-2 rounded-[12px] border border-gold/50 bg-white/[0.03] p-1.5 shadow-[0_0_24px_-12px] shadow-gold/40 sm:mt-5 sm:gap-2.5 sm:p-2"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
      >
        <SliderButton direction={-1} onClick={() => nudge(-1)} />
        <div
          ref={viewportRef}
          className="min-w-0 flex-1 touch-pan-y select-none overflow-hidden rounded-[8px]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onFocusCapture={revealFocused}
          onBlurCapture={() => (paused.current = false)}
        >
          <ul ref={trackRef} className="flex w-max will-change-transform" aria-label="Media coverage of VAAP">
            {rendered.map(({ item, copy }) => {
              const duplicate = copy > 0
              return (
                <li key={`${copy}-${item.id}`} className="shrink-0 pr-2.5 sm:pr-3" aria-hidden={duplicate || undefined}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={duplicate ? -1 : undefined}
                    draggable={false}
                    title={`Read VAAP coverage on ${item.name}`}
                    className="group flex h-12 w-24 items-center justify-center rounded-[6px] bg-card px-2.5 py-1.5 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-gold sm:h-14 sm:w-28 sm:px-3 lg:h-16 lg:w-32"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded logos (incl. SVG) from object storage */}
                    <img
                      src={item.logo}
                      alt={duplicate ? "" : item.name}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                    {!duplicate && <span className="sr-only"> (opens in a new tab)</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
        <SliderButton direction={1} onClick={() => nudge(1)} />
      </div>
    </section>
  )
}

function SliderButton({ direction, onClick }: { direction: 1 | -1; onClick: () => void }) {
  const Icon = direction === 1 ? ChevronRight : ChevronLeft
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 1 ? "Next media logos" : "Previous media logos"}
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/80 text-gold transition-colors hover:bg-gold hover:text-navy-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:size-9"
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
