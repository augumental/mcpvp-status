const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  return { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const { url, key } = getConfig()
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
}

async function supabaseError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const data = JSON.parse(text) as { message?: string; hint?: string; details?: string; code?: string }
    return [data.code, data.message, data.details, data.hint].filter(Boolean).join(" — ").slice(0, 500) || text.slice(0, 500)
  } catch {
    return text.slice(0, 500)
  }
}

export async function saveWebhook(clientId: string, webhookUrl: string): Promise<void> {
  const res = await request("webhook_configs?on_conflict=client_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ client_id: clientId, webhook_url: webhookUrl, enabled: true }),
  })
  if (!res.ok) throw new Error(`Supabase responded ${res.status}: ${await supabaseError(res)}`)
}

export async function disableWebhook(clientId: string): Promise<void> {
  const res = await request(`webhook_configs?client_id=eq.${encodeURIComponent(clientId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ enabled: false }),
  })
  if (!res.ok) throw new Error(`Supabase responded ${res.status}: ${await supabaseError(res)}`)
}

export async function getEnabledWebhooks(): Promise<string[]> {
  const res = await request("webhook_configs?enabled=eq.true&select=webhook_url")
  if (!res.ok) throw new Error(`Supabase responded ${res.status}: ${await supabaseError(res)}`)
  const rows = (await res.json()) as Array<{ webhook_url: string }>
  return [...new Set(rows.map((row) => row.webhook_url).filter(Boolean))]
}
