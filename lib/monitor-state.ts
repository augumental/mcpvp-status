const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STATE_ID = 1

export interface MonitorState {
  status: string
  motd: string
  checkedAt: string
}

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
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

export async function getMonitorState(): Promise<MonitorState | null> {
  const res = await request(`mcpvp_monitor_state?id=eq.${STATE_ID}&select=status,motd,checked_at&limit=1`)
  if (!res.ok) throw new Error(`Supabase responded ${res.status}`)
  const rows = (await res.json()) as Array<{ status: string; motd: string; checked_at: string }>
  if (!rows.length || rows[0].status === "UNKNOWN") return null
  return { status: rows[0].status, motd: rows[0].motd, checkedAt: rows[0].checked_at }
}

export async function setMonitorState(state: MonitorState): Promise<void> {
  const res = await request("mcpvp_monitor_state?id=eq.1", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: state.status, motd: state.motd, checked_at: state.checkedAt }),
  })
  if (!res.ok) throw new Error(`Supabase responded ${res.status}`)
}

export function hasMonitorStateStore(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}
