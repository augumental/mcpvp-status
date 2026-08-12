# mcpvp-status

MCPVP live status monitor built with Next.js.

## Server-side Discord monitoring

The MCPVP status monitor runs independently of the website UI. A Vercel Cron Job calls `/api/monitor` every minute, checks `mcpvp.com`, compares the result with persistent state, and sends a Discord webhook when the status changes.

The website does **not** need to be open.

### Required environment variables

Configure these in the deployment environment:

```text
CRON_SECRET=your-random-secret
MCPVP_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

`CRON_SECRET` protects the monitor endpoint. `MCPVP_DISCORD_WEBHOOK_URL` is kept server-side and is never exposed to visitors. Upstash Redis stores the last observed status so the previous status survives serverless function restarts.

After adding the variables, redeploy the project. The first scheduled check establishes the initial state and does not send a notification. A later change such as `UNLOCKED -> UNREACHABLE` or `UNREACHABLE -> UNLOCKED` sends one notification.

The existing settings panel can still be used to test a Discord webhook manually, but automatic status-change notifications are now handled entirely by the server-side monitor.

## Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` to see the monitor.
