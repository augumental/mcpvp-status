"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Settings as SettingsIcon } from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { StatusHero } from "@/components/status-hero"
import { MonitorPanel } from "@/components/monitor-panel"
import { StatusToast } from "@/components/status-toast"
import { SettingsModal, type Settings } from "@/components/settings-modal"
import type { ServerStatus, StatusResult } from "@/lib/status-config"

const POLL_INTERVAL_MS = 15_000
const STORAGE_KEY = "mcpvp-settings-v1"

const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  webhookEnabled: false,
  webhookUrl: "",
}

function playDing() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => ctx.close()
  } catch {}
}

export function StatusDashboard() {
  const [data, setData] = useState<StatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000)
  const [lastCheckLabel, setLastCheckLabel] = useState("")
  const [changeKey, setChangeKey] = useState(0)
  const [toast, setToast] = useState<{ from: ServerStatus | null; to: ServerStatus } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const prevStatusRef = useRef<ServerStatus | null>(null)
  const settingsRef = useRef(settings)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch {}
    setSettingsLoaded(true)
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings, settingsLoaded])

  const sendWebhook = useCallback(
    (from: ServerStatus | null, to: ServerStatus, motd: string) => {
      const s = settingsRef.current
      if (!s.webhookEnabled || !s.webhookUrl) return
      fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: s.webhookUrl,
          previousStatus: from ?? "UNKNOWN",
          newStatus: to,
          motd,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {})
    },
    [],
  )

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" })
      const result: StatusResult = await res.json()

      setData(result)
      setLoading(false)
      setCountdown(POLL_INTERVAL_MS / 1000)
      setLastCheckLabel(
        new Date(result.checkedAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }),
      )

      const prev = prevStatusRef.current
      if (prev !== null && prev !== result.status) {
        setChangeKey((k) => k + 1)
        setToast({ from: prev, to: result.status })

        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 5000)

        if (settingsRef.current.soundEnabled) playDing()
        sendWebhook(prev, result.status, result.motd)
      }
      prevStatusRef.current = result.status
    } catch {
      setLoading(false)
      setData((d) => ({
        status: "UNREACHABLE",
        motd: "",
        online: false,
        checkedAt: new Date().toISOString(),
        error: "Failed to reach monitoring backend",
        intervalMs: POLL_INTERVAL_MS,
        players: d?.players,
      }))
    }
  }, [sendWebhook])

  useEffect(() => {
    fetchStatus()
    const poll = setInterval(fetchStatus, POLL_INTERVAL_MS)
    const ticker = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => {
      clearInterval(poll)
      clearInterval(ticker)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [fetchStatus])

  const connectionOk = data?.online ?? false
  const currentStatus: ServerStatus = data?.status ?? "UNREACHABLE"

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <AnimatedBackground />

      {toast && <StatusToast from={toast.from} to={toast.to} />}

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-40 shrink-0 items-center">
            <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-[radial-gradient(circle,oklch(0.55_0.22_22/45%),transparent_70%)] blur-md" />
            <Image
              src="/mcpvp-logo.svg"
              alt="MCPVP logo"
              width={2047}
              height={565}
              className="h-11 w-auto object-contain object-left"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
              Live Monitor
            </p>
          </div>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="group glass flex h-11 w-11 items-center justify-center rounded-xl transition-all hover:border-crimson-bright/60 hover:shadow-[0_0_20px_-4px_var(--crimson)]"
        >
          <SettingsIcon className="h-5 w-5 text-muted-foreground transition-all duration-500 group-hover:rotate-90 group-hover:text-foreground" />
        </button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 px-5 py-10">
        <StatusHero status={currentStatus} changeKey={changeKey} loading={loading} />
        <MonitorPanel
          data={data}
          lastCheckLabel={lastCheckLabel}
          countdown={countdown}
          connectionOk={connectionOk}
        />
      </div>

      <footer className="relative z-10 flex items-center justify-center gap-2.5 pb-8 pt-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-green opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-green shadow-[0_0_10px_oklch(0.72_0.19_150/80%)]" />
        </span>
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Live Monitor · Auto-checking every 15s
        </span>
      </footer>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </main>
  )
}
