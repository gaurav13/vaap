"use client"

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const GREEN = "var(--green)"
const LIGHT = "var(--green-light)"
const INK = "var(--heading)"
const GRID = "var(--border)"
const AXIS = { fontSize: 11, fill: "var(--muted-2)" }

const money = (v: number) => `$${v < 1 ? v.toFixed(4) : v.toFixed(2)}`
const tip = {
  contentStyle: { borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--card)", color: "var(--heading)" },
}

export function SpendChart({ data, xKey }: { data: { estimatedUsd: number; actualUsd: number; [k: string]: string | number }[]; xKey: string }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Estimated and reconciled AI spend in US dollars">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} tickFormatter={(v: string) => v.slice(5)} minTickGap={12} />
          <YAxis tick={AXIS} tickFormatter={money} width={64} />
          <Tooltip {...tip} formatter={(v) => money(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="estimatedUsd" name="Estimated USD" fill={LIGHT} radius={[3, 3, 0, 0]} />
          <Bar dataKey="actualUsd" name="Actual (reconciled) USD" fill={GREEN} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TokenChart({ data }: { data: { day: string; input: number; output: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Daily input and output tokens">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tick={AXIS} tickFormatter={(v: string) => v.slice(5)} minTickGap={12} />
          <YAxis tick={AXIS} width={56} />
          <Tooltip {...tip} formatter={(v) => Number(v).toLocaleString("en-US")} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="input" name="Input tokens" stroke={GREEN} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="output" name="Output tokens" stroke={INK} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ModelCostChart({ data }: { data: { label: string; estimatedUsd: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Estimated cost by AI model">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS} tickFormatter={money} />
          <YAxis type="category" dataKey="label" tick={AXIS} width={110} />
          <Tooltip {...tip} formatter={(v) => money(Number(v))} />
          <Bar dataKey="estimatedUsd" name="Estimated USD" fill={GREEN} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
