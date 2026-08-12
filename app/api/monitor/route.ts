import { getStatus } from "@/lib/minecraft"
import { getMonitorState, hasMonitorStateStore, setMonitorState } from "@/lib/monitor-state"
import { getEnabledWebhooks } from "@/lib/webhooks"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
}

const COLORS: Record<string, number> = {
  UNLOCKED: 0x22c55e,
  SELECTIVE_WHITELIST: 0xeab308,
  WHITELISTED: 0xdc2626,
  UNREACHABLE: 0x6b7280,
}

async function sendDiscordWebhook(webhookUrl: string, previousStatus: string, newStatus: string, motd: string, timestamp: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "MCPVP Monitor",
      content: "@everyone",
      allowed_mentions: { parse: ["everyone"] },
      embeds: [{
        title: "MCPVP.COM STATUS UPDATE",
        description: `MCPVP.COM status changed from **${previousStatus.replace(/_/g, " ")}** to **${newStatus.replace(/_/g, " ")}**.`,
        color: COLORS[newStatus] ?? 0xdc2626,
        fields: [
          { name: "Previous Status", value: previousStatus.replace(/_/g, " "), inline: true },
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
  if (!hasMonitorStateStore()) return Response.json({ error: "Supabase monitor storage is not configured" }, { status: 503 })

  try {
    const result = await getStatus()
    const previous = await getMonitorState()
    const changed = previous !== null && previous.status !== result.status
    const timestamp = new Date().toISOString()
    const webhooks = await getEnabledWebhooks()

    if (changed) {
      if (webhooks.length === 0) {
        return Response.json({
          ok: true,
          status: result.status,
          changed: true,
          previousStatus: previous.status,
          webhookCount: 0,
          webhookFailures: 0,
          delivered: false,
          waitingForWebhook: true,
          checkedAt: result.checkedAt,
        })
      }

      const results = await Promise.allSettled(
        webhooks.map((url) => sendDiscordWebhook(url, previous.status, result.status, result.motd, timestamp)),
      )
      const failures = results.filter((item) => item.status === "rejected").length

      if (failures > 0) {
        return Response.json({
          ok: false,
          status: result.status,
          changed: true,
          previousStatus: previous.status,
          webhookCount: webhooks.length,
          webhookFailures: failures,
          delivered: false,
          checkedAt: result.checkedAt,
        }, { status: 502 })
      }

      await setMonitorState({ status: result.status, motd: result.motd, checkedAt: result.checkedAt })
      return Response.json({
        ok: true,
        status: result.status,
        changed: true,
        previousStatus: previous.status,
        webhookCount: webhooks.length,
        webhookFailures: 0,
        delivered: true,
        checkedAt: result.checkedAt,
      })
    }

    await setMonitorState({ status: result.status, motd: result.motd, checkedAt: result.checkedAt })
    return Response.json({
      ok: true,
      status: result.status,
      changed: false,
      previousStatus: previous?.status ?? null,
      webhookCount: webhooks.length,
      webhookFailures: 0,
      delivered: false,
      checkedAt: result.checkedAt,
    })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Monitor failed" }, { status: 500 })
  }
}
