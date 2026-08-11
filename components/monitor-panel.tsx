"use client"

import { STATUS_META, type StatusResult } from "@/lib/status-config"

interface MonitorPanelProps {
  data: StatusResult | null
  lastCheckLabel: string
  countdown: number
  connectionOk: boolean
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-sm text-foreground">{children}</span>
    </div>
  )
}

// Compact monitoring panel below the hero: MOTD, last check, countdown,
// connection status and current detected state.
export function MonitorPanel({ data, lastCheckLabel, countdown, connectionOk }: MonitorPanelProps) {
  const meta = data ? STATUS_META[data.status] : null

  return (
    <div className="glass-panel scanlines relative w-full max-w-md overflow-hidden rounded-2xl p-5">
      {/* MOTD block */}
      <div className="mb-2">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">Current MOTD</p>
        <p className="mt-2 min-h-[2.5rem] whitespace-pre-wrap break-words rounded-lg border border-border bg-black/40 p-3 font-mono text-sm leading-relaxed text-foreground">
          {/* MOTD is rendered as plain text (never raw HTML) — see lib/minecraft.ts */}
          {data?.motd ? data.motd : <span className="text-muted-foreground/60">— no data —</span>}
        </p>
      </div>

      <div className="divide-y divide-border">
        <Row label="Last Check">{lastCheckLabel || "—"}</Row>
        <Row label="Next Check">{`${countdown} second${countdown === 1 ? "" : "s"}`}</Row>
        <Row label="Connection">
          <span className="inline-flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${connectionOk ? "bg-status-green" : "bg-status-gray"}`}
              style={connectionOk ? { boxShadow: "0 0 8px oklch(0.72 0.19 150 / 70%)" } : undefined}
            />
            {connectionOk ? "RESPONSE OK" : "NO RESPONSE"}
          </span>
        </Row>
        <Row label="Detected State">
          {meta ? <span className={meta.color}>{meta.label}</span> : "—"}
        </Row>
        {data?.online && data.players && (
          <Row label="Players">{`${data.players.online} / ${data.players.max}`}</Row>
        )}
      </div>
    </div>
  )
}
