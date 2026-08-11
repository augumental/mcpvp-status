import { status } from "minecraft-server-util"

/**
 * ---------------------------------------------------------------------------
 * MCPVP Minecraft server monitoring core
 * ---------------------------------------------------------------------------
 * This module is responsible for:
 *   1. Querying the Minecraft server (mcpvp.com) for its current MOTD.
 *   2. Detecting the "status" from that MOTD using a strict priority order.
 *   3. Caching the latest result at the module (server) level so that we make
 *      AT MOST one real Minecraft query per POLL_INTERVAL_MS, regardless of
 *      how many website visitors are connected. All clients read this cache.
 *
 * Because Vercel serverless functions are short-lived, we cannot guarantee a
 * single always-on background process. Instead we use a module-scoped cache
 * with in-flight request de-duplication: the first request after the cache
 * expires performs the real query, and every other concurrent request awaits
 * the same promise. This achieves the same "don't hammer the server" goal in
 * a serverless-friendly way.
 */

// The Minecraft server we monitor.
export const SERVER_HOST = "mcpvp.com"
export const SERVER_PORT = 25565

// How long a cached result is considered fresh. Defaults to 15 seconds and is
// the single source of truth for the monitoring interval (backend-configurable).
export const POLL_INTERVAL_MS = Number(process.env.MCPVP_POLL_INTERVAL_MS ?? 15_000)

// Timeout for a single Minecraft query before we treat it as unreachable.
const QUERY_TIMEOUT_MS = 5_000

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
 *   1. Contains "unlocked"      -> UNLOCKED
 *   2. Contains "+" (and no "unlocked") -> SELECTIVE_WHITELIST
 *   3. Otherwise                -> WHITELISTED
 *
 * Note: UNREACHABLE is handled separately (connection failure), never inferred
 * from an empty/missing MOTD here, so a temporary outage is never misreported
 * as WHITELISTED.
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

/** Perform the actual network query to the Minecraft server. */
async function queryServer(): Promise<StatusResult> {
  try {
    const response = await status(SERVER_HOST, SERVER_PORT, {
      timeout: QUERY_TIMEOUT_MS,
      enableSRV: true,
    })

    // motd.clean strips Minecraft color/formatting codes and gives plain text.
    const motd = (response.motd?.clean ?? "").trim()

    return {
      status: detectStatus(motd),
      motd,
      online: true,
      players: {
        online: response.players?.online ?? 0,
        max: response.players?.max ?? 0,
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
