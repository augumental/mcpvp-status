"use client"

import { STATUS_META, type ServerStatus } from "@/lib/status-config"

interface StatusHeroProps {
  status: ServerStatus
  /** Bumped on every real status change to retrigger the pop animation. */
  changeKey: number
  loading: boolean
}

// The dominant central display: MCPVP.COM + the big glowing status indicator.
export function StatusHero({ status, changeKey, loading }: StatusHeroProps) {
  const meta = STATUS_META[status]

  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">Current Status</p>

      <h1 className="mt-3 text-5xl font-bold tracking-tight text-foreground text-glow-crimson sm:text-6xl md:text-7xl">
        MCPVP.COM
      </h1>

      {/* Big status indicator */}
      <div
        key={changeKey}
        className="animate-status-pop mt-8 flex items-center gap-4"
        style={{ ["--pulse-color" as string]: meta.glow }}
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span
            className="absolute inline-flex h-5 w-5 animate-blink-dot rounded-full"
            style={{ backgroundColor: meta.glow.replace(/\/ \d+%\)/, "/ 90%)") }}
          />
          <span
            className="animate-pulse-glow relative inline-flex h-4 w-4 rounded-full"
            style={{
              backgroundColor: meta.glow.replace(/\/ \d+%\)/, "/ 100%)"),
              boxShadow: `0 0 20px 2px ${meta.glow}`,
            }}
          />
        </span>
        <span
          className={`font-mono text-3xl font-bold uppercase tracking-[0.15em] sm:text-4xl md:text-5xl ${meta.color}`}
          style={{ textShadow: `0 0 30px ${meta.glow}` }}
        >
          {loading ? "SYNCING…" : meta.label}
        </span>
      </div>

      <p className="mt-5 max-w-md text-pretty text-base text-muted-foreground sm:text-lg">
        {loading ? "Establishing connection to monitoring backend…" : meta.secondary}
      </p>
    </div>
  )
}
