"use client"

import { ArrowRight } from "lucide-react"
import { prettyStatus, type ServerStatus } from "@/lib/status-config"

interface StatusToastProps {
  from: ServerStatus | null
  to: ServerStatus
}

// Small status-change toast. Rendered/unmounted by the parent with a timeout.
export function StatusToast({ from, to }: StatusToastProps) {
  return (
    <div className="animate-toast-in glass-panel pointer-events-none fixed left-1/2 top-6 z-[60] flex -translate-x-1/2 items-center gap-4 rounded-xl px-5 py-4 shadow-[0_0_40px_-8px_var(--crimson)]">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-crimson-bright opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-crimson-bright" />
      </span>
      <div>
        <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Status Changed
        </p>
        <p className="mt-0.5 flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
          MCPVP.COM
          <ArrowRight className="h-3.5 w-3.5 text-crimson-bright" />
          <span>{prettyStatus(to)}</span>
        </p>
        {from && (
          <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground/70">
            from {prettyStatus(from)}
          </p>
        )}
      </div>
    </div>
  )
}
