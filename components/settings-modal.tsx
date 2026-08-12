"use client"

import { useEffect, useState } from "react"
import { X, Volume2, Webhook, Loader2, Check, AlertTriangle } from "lucide-react"

export interface Settings {
  soundEnabled: boolean
  webhookEnabled: boolean
  webhookUrl: string
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: Settings
  onChange: (next: Settings) => void
}

function getClientId() {
  const key = "mcpvp-webhook-client-id"
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, "")
    localStorage.setItem(key, id)
  }
  return id
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300 ${checked ? "border-crimson-bright/60 bg-crimson/40" : "border-border bg-secondary"}`}>
      <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-300 ${checked ? "left-6 bg-crimson-bright shadow-[0_0_12px_var(--crimson-bright)]" : "left-1 bg-muted-foreground"}`} />
    </button>
  )
}

export function SettingsModal({ open, onClose, settings, onChange }: SettingsModalProps) {
  const [testState, setTestState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [testMessage, setTestMessage] = useState("")

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) { setTestState("idle"); setTestMessage("") }
  }, [open])

  if (!open) return null

  async function handleTest() {
    setTestState("loading")
    setTestMessage("")
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: getClientId(),
          webhookUrl: settings.webhookUrl,
          previousStatus: "WHITELISTED",
          newStatus: "UNLOCKED",
          motd: "Test notification from MCPVP Monitor",
          timestamp: new Date().toISOString(),
          test: true,
          enabled: settings.webhookEnabled,
        }),
      })
      const data = await res.json()
      if (res.ok) { setTestState("success"); setTestMessage("Test notification sent to Discord and webhook saved.") }
      else { setTestState("error"); setTestMessage(data.error ?? "Failed to send test webhook.") }
    } catch {
      setTestState("error")
      setTestMessage("Network error sending test webhook.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button aria-label="Close settings" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="animate-modal-in glass-panel relative w-full max-w-md rounded-2xl p-6 shadow-[0_0_60px_-12px_var(--crimson)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="settings-title" className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-foreground">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-crimson-bright/50 hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3"><Volume2 className="mt-0.5 h-5 w-5 shrink-0 text-crimson-bright" /><div><p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">Status Changing Sounds</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Play a notification sound whenever the detected server status changes in this browser.</p></div></div>
            <Toggle label="Status changing sound effects" checked={settings.soundEnabled} onChange={(v) => onChange({ ...settings, soundEnabled: v })} />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3"><Webhook className="mt-0.5 h-5 w-5 shrink-0 text-crimson-bright" /><div><p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">Discord Webhook</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Receive automatic MCPVP status-change notifications in your Discord channel.</p></div></div>
            <Toggle label="Enable Discord webhook" checked={settings.webhookEnabled} onChange={(v) => onChange({ ...settings, webhookEnabled: v })} />
          </div>
          {settings.webhookEnabled && <div className="animate-modal-in space-y-3">
            <label htmlFor="webhook-url" className="block font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Webhook URL</label>
            <input id="webhook-url" type="password" autoComplete="off" spellCheck={false} placeholder="https://discord.com/api/webhooks/..." value={settings.webhookUrl} onChange={(e) => onChange({ ...settings, webhookUrl: e.target.value })} className="w-full rounded-lg border border-input bg-black/40 px-4 py-3 font-mono text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-crimson-bright/60 focus:ring-1 focus:ring-crimson-bright/40" />
            <button type="button" onClick={handleTest} disabled={!settings.webhookUrl || testState === "loading"} className="flex w-full items-center justify-center gap-2 rounded-lg border border-crimson/50 bg-crimson/15 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-foreground transition-all hover:border-crimson-bright/70 hover:bg-crimson/25 disabled:cursor-not-allowed disabled:opacity-40">
              {testState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : testState === "success" ? <Check className="h-4 w-4 text-status-green" /> : testState === "error" ? <AlertTriangle className="h-4 w-4 text-status-yellow" /> : null} Test & Save Webhook
            </button>
            {testMessage && <p className={`text-center text-xs ${testState === "success" ? "text-status-green" : "text-status-yellow"}`}>{testMessage}</p>}
          </div>}
          <div className="h-px bg-border" />
          <p className="text-center font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground/70">Settings are saved automatically</p>
        </div>
      </div>
    </div>
  )
}
