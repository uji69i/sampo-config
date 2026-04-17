import type { ManualRuleType } from './types'

function stripSchemeAndPath(s: string): string {
  return s
    .replace(/^\s*https?:\/\//i, '')
    .replace(/^\s*ws?:\/\//i, '')
    .split(/[/?#]/)[0]
    .trim()
}

function isValidDomain(d: string): boolean {
  if (!d || d.length > 253) return false
  const parts = d.split('.')
  if (parts.length < 2) return false
  for (const p of parts) {
    if (!p || p.length > 63) return false
    if (!/^[a-z0-9-]+$/i.test(p)) return false
    if (/^-|-$/.test(p)) return false
  }
  return true
}

function normalizeDomain(
  _type: string,
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  let v = stripSchemeAndPath(raw).toLowerCase()
  v = v.replace(/\s+/g, '')
  if (v.startsWith('*.')) v = v.slice(2)
  if (!isValidDomain(v)) {
    return { ok: false, error: `Invalid domain: ${raw}` }
  }
  v = v.replace(/\.$/, '')
  return { ok: true, value: v }
}

function normalizeKeyword(
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  let v = stripSchemeAndPath(raw).toLowerCase().trim()
  v = v.replace(/\s+/g, '')
  if (!v) return { ok: false, error: 'Keyword cannot be empty' }
  if (/[/\\]/.test(v)) return { ok: false, error: 'Keyword must not contain / or \\' }
  return { ok: true, value: v }
}

function isValidIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  for (let i = 1; i <= 4; i++) {
    const n = Number(m[i])
    if (n < 0 || n > 255) return false
  }
  return true
}

function normalizeCidr(
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim()
  if (isValidIPv4(v)) return { ok: true, value: `${v}/32` }
  const m = v.match(/^(.+?)\/(\d{1,2})$/)
  if (!m) return { ok: false, error: `Invalid CIDR or IP: ${raw}` }
  const ip = m[1].trim()
  const mask = Number(m[2])
  if (!isValidIPv4(ip)) return { ok: false, error: `Invalid IPv4: ${ip}` }
  if (!Number.isInteger(mask) || mask < 0 || mask > 32) {
    return { ok: false, error: `Mask must be 0-32: ${raw}` }
  }
  return { ok: true, value: `${ip}/${mask}` }
}

function normalizeAsn(
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  let v = raw.trim().toUpperCase()
  if (v.startsWith('AS')) v = v.slice(2)
  if (!/^\d+$/.test(v)) return { ok: false, error: `ASN must be a number: ${raw}` }
  return { ok: true, value: v }
}

function normalizeProcessName(
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim().replace(/^"+|"+$/g, '')
  if (!v) return { ok: false, error: 'Process name cannot be empty' }
  if (/[/\\:]/.test(v)) {
    return { ok: false, error: 'Process name must not contain /, \\ or :' }
  }
  return { ok: true, value: v }
}

function normalizeProcessPath(
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim().replace(/^"+|"+$/g, '')
  if (!v) return { ok: false, error: 'Process path cannot be empty' }
  const looksWindows = /^[a-zA-Z]:\\/.test(v) || v.startsWith('\\\\')
  const looksUnix = v.startsWith('/')
  if (!looksWindows && !looksUnix) {
    return { ok: false, error: 'Process path must be a full path (e.g. C:\\... or /...)' }
  }
  return { ok: true, value: v }
}

export type NormalizeResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

export function normalizeManualRule(
  type: ManualRuleType | string,
  rawValue: string
): NormalizeResult {
  switch (type) {
    case 'DOMAIN-SUFFIX':
      return normalizeDomain(type, rawValue)
    case 'DOMAIN-KEYWORD':
      return normalizeKeyword(rawValue)
    case 'IP-CIDR':
      return normalizeCidr(rawValue)
    case 'IP-ASN':
      return normalizeAsn(rawValue)
    case 'PROCESS-NAME':
      return normalizeProcessName(rawValue)
    case 'PROCESS-PATH':
      return normalizeProcessPath(rawValue)
    default:
      return { ok: true, value: rawValue.trim() }
  }
}
