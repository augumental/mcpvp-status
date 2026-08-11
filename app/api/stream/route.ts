import { getStatus, POLL_INTERVAL_MS } from "@/lib/minecraft"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/stream  (Server-Sent Events)
 * -------------------------------------
 * Pushes the latest status to the browser in real time. Internally it reads
 * from the SAME shared cache used by /api/status, so opening the stream never
 * triggers a per-visitor Minecraft query beyond the single shared poll.
 *
 * The loop ticks a little faster than the poll interval so that when the cache
 * refreshes, connected clients receive the new state almost immediately. A
 * heartbeat comment keeps intermediaries from closing an idle connection.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let lastSerialized = ""

      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const tick = async () => {
        if (closed) return
        try {
          const result = await getStatus()
          const payload = { ...result, intervalMs: POLL_INTERVAL_MS }
          const serialized = JSON.stringify(payload)
          // Only emit when something actually changed to avoid noise.
          if (serialized !== lastSerialized) {
            lastSerialized = serialized
            send("status", payload)
          } else {
            // Heartbeat comment (ignored by EventSource) keeps connection warm.
            if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`))
          }
        } catch {
          // Swallow — next tick will retry.
        }
      }

      // Send the current state right away.
      await tick()

      const interval = setInterval(tick, Math.min(5_000, POLL_INTERVAL_MS))

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      request.signal.addEventListener("abort", cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
