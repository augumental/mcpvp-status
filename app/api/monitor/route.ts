import { getStatus } from "@/lib/minecraft"

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
      content: "@everyone",
      allowed_mentions: { parse: ["everyone"] },
      embeds: [{
        title: "MCPVP.COM STATUS UPDATE",
        description: previousStatus
          ? `MCPVP.COM status changed from **${previousStatus.replace(/_/g, " ")}** to **${newStatus.replace(/_/g, " ")}**.`
          : `MCPVP.COM current status is **${newStatus.replace(/_/g, " ")}**.`,
        color: colors[newStatus] ?? 0xdc2626,
        fields: [
          ...(previousStatus ? [{ name: "Previous Status", value: previousStatus.replace(/_/g, " "), inline: true }] : []),
          { name: "Current Status", value: newStatus.replace(/_/g, " "), inline: true },
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

  const result = await getStatus()
  const previousStatus = new URL(request.url).searchParams.get("previousStatus") ?? ""
  const changed = Boolean(previousStatus) && previousStatus !== result.status
  const timestamp = new Date().toISOString()

  if (changed) {
    const webhookUrl = process.env.MCPVP_DISCORD_WEBHOOK_URL
    if (webhookUrl) await sendDiscordWebhook(webhookUrl, previousStatus, result.status, result.motd, timestamp)
  }

  return Response.json({ ok: true, status: result.status, changed, previousStatus: previousStatus || null, checkedAt: result.checkedAt })
}
