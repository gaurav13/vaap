export function SplitTitle({ title }: { title: string }) {
  const colonIndex = title.indexOf(":")
  const hasLead = colonIndex > 0 && colonIndex < title.length - 1
  const lead = hasLead ? title.slice(0, colonIndex + 1) : ""
  const rest = hasLead ? title.slice(colonIndex + 1).trim() : title

  return (
    <h1 className="flex flex-col gap-1 text-balance tracking-tight">
      {lead && (
        <span className="text-3xl font-extrabold leading-[1.1] text-green md:text-4xl lg:text-[2.75rem]">{lead}</span>
      )}
      <span
        className={`font-bold leading-[1.15] text-heading ${
          lead ? "text-2xl md:text-3xl lg:text-[2.1rem]" : "text-3xl md:text-4xl lg:text-[2.6rem]"
        }`}
      >
        {rest}
      </span>
    </h1>
  )
}
