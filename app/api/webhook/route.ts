export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/webhook
 * Server-side proxy that forwards a Discord webhook. The webhook URL is sent
 * from the client (stored only in the user's own browser) and relayed here so
 * that:
 *   - it is never hardcoded into the client bundle / source,
 *   - the request avoids browser CORS restrictions,
 *   - we can validate the target is an actual Discord webhook endpoint.
 *
 * We do NOT persist the webhook URL on the server.
 */

interface WebhookPayload {
  webhookUrl: string
  previousStatus: string
  newStatus: string
  motd: string
  timestamp: string
  test?: boolean
}

// Only allow real Discord webhook hosts to prevent SSRF abuse.
function isValidDiscordWebhook(url: string): boolean {
  try {
    const parsed = new URL(url)
    const allowedHosts = ["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"]
    return parsed.protocol === "https:" && allowedHosts.includes(parsed.hostname) && parsed.pathname.startsWith("/api/webhooks/")
  } catch {
    return false
  }
}

const STATUS_COLORS: Record<string, number> = {
  UNLOCKED: 0x22c55e,
  SELECTIVE_WHITELIST: 0xeab308,
  WHITELISTED: 0xdc2626,
  UNREACHABLE: 0x6b7280,
}

function pretty(status: string) {
  return status.replace(/_/g, " ")
}

export async function POST(request: Request) {
  let body: WebhookPayload
  try {
    body = (await request.json()) as WebhookPayload
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { webhookUrl, previousStatus, newStatus, motd, timestamp, test } = body

  if (!webhookUrl || !isValidDiscordWebhook(webhookUrl)) {
    return Response.json({ error: "Invalid Discord webhook URL" }, { status: 400 })
  }

  const discordPayload = {
    username: "MCPVP Monitor",
    embeds: [
      {
        title: test ? "MCPVP.COM — TEST NOTIFICATION" : "MCPVP.COM STATUS UPDATE",
        color: STATUS_COLORS[newStatus] ?? 0xdc2626,
        fields: [
          { name: "Previous", value: pretty(previousStatus || "—"), inline: true },
          { name: "Current", value: pretty(newStatus || "—"), inline: true },
          { name: "MOTD", value: motd ? "```" + motd.slice(0, 900) + "```" : "—", inline: false },
        ],
        footer: { text: "MCPVP Live Monitor" },
        timestamp: timestamp || new Date().toISOString(),
      },
    ],
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `Discord responded ${res.status}`, detail: text.slice(0, 200) }, { status: 502 })
    }

    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to send webhook" },
      { status: 502 },
    )
  }
}
