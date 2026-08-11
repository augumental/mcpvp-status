// Client-safe status metadata (no server-only imports).
export type ServerStatus = "UNLOCKED" | "SELECTIVE_WHITELIST" | "WHITELISTED" | "UNREACHABLE"

export interface StatusResult {
  status: ServerStatus
  motd: string
  online: boolean
  players?: { online: number; max: number }
  checkedAt: string
  error?: string
  intervalMs?: number
}

interface StatusMeta {
  label: string
  secondary: string
  /** Tailwind text color class driven by the theme tokens. */
  color: string
  /** CSS color value used for glows / dynamic box-shadows. */
  glow: string
}

export const STATUS_META: Record<ServerStatus, StatusMeta> = {
  UNLOCKED: {
    label: "UNLOCKED",
    secondary: "Server is currently unlocked",
    color: "text-status-green",
    glow: "oklch(0.72 0.19 150 / 60%)",
  },
  SELECTIVE_WHITELIST: {
    label: "SELECTIVE WHITELIST",
    secondary: "Server is selectively whitelisted",
    color: "text-status-yellow",
    glow: "oklch(0.83 0.17 90 / 60%)",
  },
  WHITELISTED: {
    label: "WHITELISTED",
    secondary: "Server is currently whitelisted",
    color: "text-status-red",
    glow: "oklch(0.62 0.24 22 / 60%)",
  },
  UNREACHABLE: {
    label: "SERVER UNREACHABLE",
    secondary: "Unable to retrieve the Minecraft server MOTD",
    color: "text-status-gray",
    glow: "oklch(0.62 0.02 20 / 55%)",
  },
}

export function prettyStatus(status: ServerStatus): string {
  return STATUS_META[status].label
}
