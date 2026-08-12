# mcpvp-status

MCPVP live status monitor built with Next.js.

The production deployment includes a Vercel Cron monitor at `/api/monitor`. It checks MCPVP independently of visitors and sends server-side Discord status-change notifications when configured.
