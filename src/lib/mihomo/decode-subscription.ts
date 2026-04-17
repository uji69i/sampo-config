import { parseMany, normalizeInputLines } from './parser'
import type { MihomoProxy } from './types'

export interface DecodeResult {
  proxies: MihomoProxy[]
  urls: string[]
  errors: { u: string; err: string }[]
  inputFormat: 'base64' | 'raw' | null
}

export function decodeSubscription(raw: string): DecodeResult {
  const trimmed = raw.trim()
  if (!trimmed) return { proxies: [], urls: [], errors: [], inputFormat: null }

  const result = parseMany(trimmed, { collectErrors: true })
  const lines = normalizeInputLines(trimmed)
  const isBase64 =
    !trimmed.includes('://') &&
    /^[A-Za-z0-9+/_-]+=*$/.test(trimmed) &&
    lines.some((l) => l.includes('://'))

  return {
    proxies: result.proxies,
    urls: result.urls,
    errors: result.errors,
    inputFormat: isBase64 ? 'base64' : 'raw',
  }
}
