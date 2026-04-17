/**
 * Cloudflare WARP: detection and parsing of WARP WireGuard-style config.
 * WARP uses the same .conf format as WireGuard with optional Reserved field in [Peer].
 * Endpoint is typically engage.cloudflareclient.com:2408.
 */

import { parseAmneziaWgConf } from './parse-amnezia-wg'
import type { MihomoProxy } from './types'

const WARP_ENDPOINT_HOST = 'cloudflareclient.com'

/**
 * Heuristic: returns true if text looks like a WARP config (WireGuard .conf with
 * Cloudflare endpoint). Checks for [Interface], [Peer] and endpoint containing cloudflareclient.com.
 */
export function isWarpConf(text: string): boolean {
  const t = text.trim()
  if (!t.length) return false
  if (!t.includes('[Interface]') || !/\[\s*Peer\s*\]/i.test(t)) return false
  return t.toLowerCase().includes(WARP_ENDPOINT_HOST)
}

export interface ParseWarpOptions {
  /** Base name for proxy (e.g. "WARP"). Used when multiple peers. */
  baseName?: string
}

/**
 * Parse WARP/WireGuard .conf into mihomo wireguard proxy entries.
 * Wrapper over parseAmneziaWgConf with default baseName "WARP".
 */
export function parseWarpConf(
  text: string,
  options: ParseWarpOptions = {}
): MihomoProxy[] {
  return parseAmneziaWgConf(text, {
    baseName: options.baseName ?? 'WARP',
  })
}
