import Image from "next/image"
import { ArrowDown, ArrowRight, ArrowLeftRight, Info, Landmark, ShieldCheck, UsersRound } from "lucide-react"
import { VaapLogo } from "@/components/vaap-logo"
import { getGovFramework } from "@/lib/site-settings"
import type { GovFramework } from "@/lib/site-settings"

type ConnectorType = "arrow" | "double"

type Node = {
  key: "gov" | "mof" | "pvara" | "vaap" | "industry"
  title: string
  roleTag?: string
  lines: string[]
  logo?: string
  connector: ConnectorType | null
}

function LogoImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  return <Image src={src || "/placeholder.svg"} alt={alt} width={150} height={72} className={className} />
}

function NodeVisual({ node }: { node: Node }) {
  // Government emblem — official uploaded asset.
  if (node.key === "gov") {
    return node.logo ? (
      <LogoImage src={node.logo} alt={`${node.title} emblem`} className="h-16 w-auto object-contain" />
    ) : (
      <span className="flex size-16 items-center justify-center rounded-full bg-mint text-green">
        <Landmark className="size-8" />
      </span>
    )
  }

  // VAAP — official logo (component fallback).
  if (node.key === "vaap") {
    return node.logo ? (
      <LogoImage src={node.logo} alt="VAAP logo" className="h-12 w-auto max-w-[150px] object-contain" />
    ) : (
      <VaapLogo height={44} />
    )
  }

  // Ministry / PVARA / Industry — uploaded logo, else neutral Lucide icon.
  const Icon = node.key === "mof" ? Landmark : node.key === "pvara" ? ShieldCheck : UsersRound
  return node.logo ? (
    <LogoImage src={node.logo} alt={`${node.title} logo`} className="h-14 w-auto max-w-[120px] object-contain" />
  ) : (
    <span className="flex size-14 items-center justify-center rounded-full bg-mint text-green">
      <Icon className="size-7" />
    </span>
  )
}

function Card({ node }: { node: Node }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-line bg-card px-6 text-center min-h-[120px] py-5 lg:min-h-[190px] lg:py-7">
      <div className="flex h-[72px] items-center justify-center">
        <NodeVisual node={node} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-heading">{node.title}</h3>
      {node.roleTag && (
        <span className="mt-1.5 rounded-full bg-mint px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-green">
          {node.roleTag}
        </span>
      )}
      {node.lines.map((line) => (
        <p key={line} className="mt-1 text-xs leading-snug text-body">
          {line}
        </p>
      ))}
    </div>
  )
}

function VaapCard({ fw }: { fw: GovFramework }) {
  const role = fw.vaapVerified && fw.vaapVerifiedRole ? fw.vaapVerifiedRole : fw.vaapRole
  return (
    <div
      className={[
        "relative flex flex-col items-center justify-center rounded-xl border-2 px-6 text-center",
        "min-h-[120px] py-6 lg:min-h-[190px] lg:py-8",
        // ~15% larger footprint than the equal-flex neutral cards, with a soft green glow.
        "lg:flex-[1.18] lg:-my-2",
        "border-[#247049] bg-[#EAF8F3] shadow-[0_10px_36px_-8px_rgba(36,112,73,0.35)]",
      ].join(" ")}
    >
      {fw.vaapBadge && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#247049] px-3 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-white shadow-sm">
          {fw.vaapBadge}
        </span>
      )}
      {fw.vaapEyebrow && (
        <span className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-green">{fw.vaapEyebrow}</span>
      )}
      <div className="mt-2 flex h-[72px] items-center justify-center">
        {fw.vaapLogo ? (
          <LogoImage src={fw.vaapLogo} alt="VAAP logo" className="h-14 w-auto max-w-[168px] object-contain" />
        ) : (
          <VaapLogo height={52} />
        )}
      </div>
      <p className="mt-2 text-sm font-bold leading-snug text-navy">{fw.vaapName}</p>
      <p className="mt-1.5 text-xs font-extrabold uppercase tracking-[0.06em] text-green">{role}</p>
      {fw.vaapSupporting && <p className="mt-1 text-xs leading-snug text-body">{fw.vaapSupporting}</p>}
    </div>
  )
}

function Connector({ type }: { type: ConnectorType }) {
  // Single arrows (gov → mof → pvara) read as institutional/policy direction.
  // Green double arrows (pvara ↔ vaap ↔ industry) read as engagement, not hierarchy.
  const isDouble = type === "double"
  return (
    <>
      {/* mobile: vertical */}
      <span
        className={["flex justify-center py-1.5 lg:hidden", isDouble ? "text-green" : "text-navy"].join(" ")}
        aria-hidden
      >
        {isDouble ? <ArrowLeftRight className="size-5 rotate-90" /> : <ArrowDown className="size-5" />}
      </span>
      {/* desktop: horizontal */}
      <span
        className={["hidden shrink-0 items-center px-2 lg:flex", isDouble ? "text-green" : "text-navy"].join(" ")}
        aria-hidden
      >
        {isDouble ? <ArrowLeftRight className="size-6" /> : <ArrowRight className="size-6" />}
      </span>
    </>
  )
}

export async function NationalFramework({ data }: { data?: GovFramework } = {}) {
  const fw = data ?? (await getGovFramework())

  const nodes: Node[] = [
    { key: "gov", title: fw.govName, lines: [fw.govDescription].filter(Boolean), logo: fw.govLogo, connector: "arrow" },
    { key: "mof", title: fw.mofName, lines: [fw.mofDescription].filter(Boolean), logo: fw.mofLogo, connector: "arrow" },
    {
      key: "pvara",
      title: fw.pvaraName,
      roleTag: fw.pvaraRole,
      lines: [fw.pvaraFullName, fw.pvaraDescription].filter(Boolean),
      logo: fw.pvaraLogo,
      connector: "double",
    },
    { key: "vaap", title: fw.vaapName, lines: [], logo: fw.vaapLogo, connector: "double" },
    {
      key: "industry",
      title: fw.industryTitle,
      lines: [fw.industryDescription].filter(Boolean),
      logo: fw.industryLogo,
      connector: null,
    },
  ]

  return (
    <section className="bg-card">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-green">{fw.eyebrow}</p>
        <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          {fw.heading}
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-body sm:text-[1.05rem]">
          {fw.description}
        </p>

        <div className="mt-10 flex flex-col lg:flex-row lg:items-stretch">
          {nodes.map((node) => (
            <div key={node.key} className="contents">
              {node.key === "vaap" ? <VaapCard fw={fw} /> : <Card node={node} />}
              {node.connector && <Connector type={node.connector} />}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg bg-mint px-5 py-4">
          <Info className="mt-0.5 size-5 shrink-0 text-green" aria-hidden />
          <p className="text-sm leading-relaxed text-navy">
            {fw.clarificationLead}{" "}
            <span className="font-semibold">
              {fw.vaapVerified && fw.clarificationVerifiedEmphasis
                ? fw.clarificationVerifiedEmphasis
                : fw.clarificationEmphasis}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
