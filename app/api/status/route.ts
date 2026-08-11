import { getStatus, POLL_INTERVAL_MS } from "@/lib/minecraft"

// Run on the Node.js runtime and never statically cache the response.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/status
 * Returns the latest cached Minecraft server status. The heavy lifting and
 * caching live in lib/minecraft.ts, so this endpoint stays thin and every
 * visitor reads the same shared result instead of triggering their own query.
 */
export async function GET() {
  const result = await getStatus()

  return Response.json(
    { ...result, intervalMs: POLL_INTERVAL_MS },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  )
}
