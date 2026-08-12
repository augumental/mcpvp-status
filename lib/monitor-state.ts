const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const STATE_KEY = "mcpvp:monitor:state"

async function command<T>(args: unknown[]): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN")
  }

  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  })

  if (!res.ok) throw new Error(`Redis responded ${res.status}`)

  const data = (await res.json()) as { result: T }
  return data.result
}

export interface MonitorState {
  status: string
  motd: string
  checkedAt: string
}

export async function getMonitorState(): Promise<MonitorState | null> {
  const value = await command<string | null>(["GET", STATE_KEY])
  return value ? (JSON.parse(value) as MonitorState) : null
}

export async function setMonitorState(state: MonitorState): Promise<void> {
  await command(["SET", STATE_KEY, JSON.stringify(state)])
}

export function hasMonitorStateStore(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN)
}
