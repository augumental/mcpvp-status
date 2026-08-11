/**
 * ---------------------------------------------------------------------------
 * MCPVP Minecraft server monitoring core
 * ---------------------------------------------------------------------------
 * Responsibilities:
 *   1. Query a public Minecraft status API (mcstatus.io) for mcpvp.com's MOTD.
 *      Browsers cannot speak the raw Minecraft protocol, so we go through a
 *      server-side fetch to a status API instead.
 *   2. Detect the "status" from that MOTD using a strict priority order.
 *   3. Cache the latest result at the module (server) level so we make AT MOST
 *      one upstream request per POLL_INTERVAL_MS regardless of how many website
 *      visitors are connected. Every client reads from this shared cache.
 *
 * Because serverless functions are short-lived, we use a module-scoped cache
 * with in-flight request de-duplication rather than a single always-on daemon:
 * the first request after the cache expires performs the real query, and all
 * concurrent requests await the same promise. Same "don't hammer it" outcome,
 * serverless-friendly.
 */

// The Minecraft server we monitor.
export const SERVER_HOST = "mcpvp.com"

// Public status API. Returns MOTD, player counts, online state as JSON.
const STATUS_API = `https://api.mcstatus.io/v2/status/java/${SERVER_HOST}`

// How long a cached result is considered fresh. Defaults to 15 seconds and is
// the single source of truth for the monitoring interval (backend-configurable).
export const POLL_INTERVAL_MS = Number(process.env.MCPVP_POLL_INTERVAL_MS ?? 15_000)

// Timeout for a single upstream query before we treat the server as unreachable.
const QUERY_TIMEOUT_MS = 8_000

export type ServerStatus = "UNLOCKED" | "SELECTIVE_WHITELIST" | "WHITELISTED" | "UNREACHABLE"

export interface StatusResult {
  /** Detected status derived from the MOTD (or UNREACHABLE on failure). */
  status: ServerStatus
  /** Cleaned, plain-text MOTD. Empty string when unreachable. */
  motd: string
  /** Whether the last real query reached the server. */
  online: boolean
  /** Player count info when available. */
  players?: { online: number; max: number }
  /** ISO timestamp of when this result was produced. */
  checkedAt: string
  /** Error message when the query failed. */
  error?: string
}

/**
 * Determine the server status from a MOTD string.
 *
 * Priority (case-insensitive):
 *   1. Contains "unlocked"              -> UNLOCKED
 *   2. Contains "+" (and no "unlocked") -> SELECTIVE_WHITELIST
 *   3. Otherwise                        -> WHITELISTED
 *
 * UNREACHABLE is handled separately (connection failure) and is never inferred
 * from an empty MOTD here, so a temporary outage is never misreported as
 * WHITELISTED.
 */
export function detectStatus(motd: string): Exclude<ServerStatus, "UNREACHABLE"> {
  const normalized = motd.toLowerCase()
  if (normalized.includes("unlocked")) return "UNLOCKED"
  if (normalized.includes("+")) return "SELECTIVE_WHITELIST"
  return "WHITELISTED"
}

// ---------------------------------------------------------------------------
// Module-scoped cache + in-flight de-duplication
// ---------------------------------------------------------------------------
let cache: StatusResult | null = null
let cacheTime = 0
let inFlight: Promise<StatusResult> | null = null

/** Perform the actual network query to the public status API. */
async function queryServer(): Promise<StatusResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)

  try {
    const res = await fetch(STATUS_API, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    if (!res.ok) {
      throw new Error(`Status API responded ${res.status}`)
    }

    const data = (await res.json()) as {
      online: boolean
      motd?: { clean?: string; raw?: string }
      players?: { online?: number; max?: number }
    }

    // If the API reports the host itself as offline, treat as unreachable.
    if (!data.online) {
      return {
        status: "UNREACHABLE",
        motd: "",
        online: false,
        checkedAt: new Date().toISOString(),
        error: "Server reported offline by status API",
      }
    }

    // `clean` strips Minecraft color/formatting codes -> plain text MOTD.
    const motd = (data.motd?.clean ?? "").replace(/\s+/g, " ").trim()

    return {
      status: detectStatus(motd),
      motd,
      online: true,
      players: {
        online: data.players?.online ?? 0,
        max: data.players?.max ?? 0,
      },
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    // Connection failure: report UNREACHABLE rather than guessing a status.
    return {
      status: "UNREACHABLE",
      motd: "",
      online: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Get the latest status, using the shared cache when it is still fresh.
 * Concurrent callers within the same interval share a single in-flight query.
 */
export async function getStatus(): Promise<StatusResult> {
  const now = Date.now()

  if (cache && now - cacheTime < POLL_INTERVAL_MS) {
    return cache
  }

  if (inFlight) {
    return inFlight
  }

  inFlight = queryServer()
    .then((result) => {
      cache = result
      cacheTime = Date.now()
      return result
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

/** Expose remaining freshness so the API can advertise the next check time. */
export function getCacheAgeMs(): number {
  return cache ? Date.now() - cacheTime : POLL_INTERVAL_MS
}
