import { getStatus } from "@/lib/minecraft"
import { getMonitorState, hasMonitorStateStore, setMonitorState } from "@/lib/monitor-state"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

async function sendDiscordWebhook(webhookUrl: string, previousStatus: string, newStatus: string, motd: string, timestamp: string) {
  const colors: Record<string, number> = {
    UNLOCKED: 0x22c55e,
    SELECTIVE_WHITELIST: 0xeab308,
    WHITELISTED: 0xdc2626,
    UNREACHABLE: 0x6b7280,
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "MCPVP Monitor",
      embeds: [{
        title: "MCPVP.COM STATUS UPDATE",
        color: colors[newStatus] ?? 0xdc2626,
        fields: [
          { name: "Previous", value: previousStatus.replace(/_/g, " "), inline: true },
          { name: "Current", value: newStatus.replace(/_/g, " "), inline: true },
          { name: "MOTD", value: motd ? "```" + motd.slice(0, 900) + "```" : "—", inline: false },
        ],
        footer: { text: "MCPVP Live Monitor" },
        timestamp,
      }],
    }),
  })

  if (!res.ok) throw new Error(`Discord responded ${res.status}`)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!hasMonitorStateStore()) {
    return Response.json({ error: "Persistent monitor storage is not configured" }, { status: 503 })
  }

  const result = await getStatus()
  const previous = await getMonitorState()
  const changed = previous !== null && previous.status !== result.status
  const timestamp = new Date().toISOString()

  if (changed) {
    const webhookUrl = process.env.MCPVP_DISCORD_WEBHOOK_URL
    if (webhookUrl) await sendDiscordWebhook(webhookUrl, previous.status, result.status, result.motd, timestamp)
  }

  await setMonitorState({ status: result.status, motd: result.motd, checkedAt: result.checkedAt })

  return Response.json({ ok: true, status: result.status, changed, previousStatus: previous?.status ?? null, checkedAt: result.checkedAt })
}
