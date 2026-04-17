import type { MihomoProxy } from './types'

export interface ParseAmneziaWgOptions {
  /** Base name for proxy (e.g. filename without .conf). Used for proxy name when multiple peers. */
  baseName?: string
}

interface ParsedSection {
  [key: string]: string
}

function parseIniSections(text: string): {
  single: Map<string, ParsedSection>
  peerList: ParsedSection[]
} {
  const single = new Map<string, ParsedSection>()
  const peerList: ParsedSection[] = []
  let current: ParsedSection | null = null
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      const name = sectionMatch[1].toLowerCase()
      current = {}
      if (name === 'peer') {
        peerList.push(current)
      } else {
        single.set(name, current)
      }
      continue
    }
    if (current) {
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        const value = trimmed.slice(eq + 1).trim()
        current[key] = value
      }
    }
  }
  return { single, peerList }
}

function getKey(sec: ParsedSection, ...names: string[]): string | undefined {
  const keys = Object.keys(sec)
  for (const name of names) {
    const lower = name.toLowerCase()
    const found = keys.find((k) => k.toLowerCase() === lower)
    if (found) return sec[found]
  }
  return undefined
}

function parseAddress(addr: string): { ip?: string; ipv6?: string } {
  const out: { ip?: string; ipv6?: string } = {}
  const parts = addr.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  for (const p of parts) {
    const base = p.split('/')[0].trim()
    if (!base) continue
    if (base.includes(':')) {
      out.ipv6 = base
    } else {
      out.ip = base
    }
  }
  return out
}

function parseAllowedIps(addr: string): string[] {
  return addr.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
}

function parseEndpoint(endpoint: string): { server: string; port: number } | null {
  const m = endpoint.match(/^(.+):(\d+)$/)
  if (!m) return null
  const server = m[1].trim()
  const port = parseInt(m[2], 10)
  if (!server || isNaN(port)) return null
  return { server, port }
}

function parseReserved(s: string): number[] | string | undefined {
  const trimmed = s.trim()
  if (!trimmed) return undefined
  const asNumbers = trimmed.split(/[\s,]+/).map((x) => parseInt(x, 10))
  if (asNumbers.every((n) => !isNaN(n))) return asNumbers
  return trimmed
}

/** AmneziaWG options from [Interface]: Jc, Jmin, Jmax, S1, S2, H1-H4 (and optionally i1-i5, j1-j3, itime for v1.5) */
function buildAmneziaWgOption(iface: ParsedSection): Record<string, unknown> | undefined {
  const amneziaKeys: { conf: string; out: string }[] = [
    { conf: 'Jc', out: 'jc' },
    { conf: 'Jmin', out: 'jmin' },
    { conf: 'Jmax', out: 'jmax' },
    { conf: 'S1', out: 's1' },
    { conf: 'S2', out: 's2' },
    { conf: 'H1', out: 'h1' },
    { conf: 'H2', out: 'h2' },
    { conf: 'H3', out: 'h3' },
    { conf: 'H4', out: 'h4' },
    { conf: 'I1', out: 'i1' },
    { conf: 'I2', out: 'i2' },
    { conf: 'I3', out: 'i3' },
    { conf: 'I4', out: 'i4' },
    { conf: 'I5', out: 'i5' },
    { conf: 'J1', out: 'j1' },
    { conf: 'J2', out: 'j2' },
    { conf: 'J3', out: 'j3' },
    { conf: 'Itime', out: 'itime' },
  ]
  const opt: Record<string, unknown> = {}
  for (const { conf, out } of amneziaKeys) {
    const v = getKey(iface, conf)
    if (v !== undefined && v !== '') {
      const num = parseInt(v, 10)
      opt[out] = isNaN(num) ? v : num
    }
  }
  return Object.keys(opt).length ? opt : undefined
}

/**
 * Parse Amnezia/WireGuard .conf text into mihomo wireguard proxy entries.
 * One proxy per [Peer]; [Interface] provides shared fields (private-key, ip, dns, amnezia-wg-option).
 */
export function parseAmneziaWgConf(
  text: string,
  options: ParseAmneziaWgOptions = {}
): MihomoProxy[] {
  const { single, peerList } = parseIniSections(text)
  const iface = single.get('interface')

  if (!iface || peerList.length === 0) {
    return []
  }

  const privateKey = getKey(iface, 'PrivateKey')
  if (!privateKey) return []

  const addr = getKey(iface, 'Address')
  const { ip, ipv6 } = addr ? parseAddress(addr) : {}
  const dnsRaw = getKey(iface, 'DNS')
  const dns = dnsRaw
    ? dnsRaw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    : undefined
  const mtuRaw = getKey(iface, 'MTU')
  const mtu = mtuRaw ? parseInt(mtuRaw, 10) : undefined
  const amneziaOpt = buildAmneziaWgOption(iface)

  const baseName = (options.baseName || 'wireguard').replace(/\s+/g, '-').slice(0, 50)
  const result: MihomoProxy[] = []

  for (let i = 0; i < peerList.length; i++) {
    const peer = peerList[i]
    const endpoint = getKey(peer, 'Endpoint')
    const ep = endpoint ? parseEndpoint(endpoint) : null
    if (!ep) continue

    const publicKey = getKey(peer, 'PublicKey')
    if (!publicKey) continue

    const allowedRaw = getKey(peer, 'AllowedIPs')
    const allowedIps = allowedRaw ? parseAllowedIps(allowedRaw) : ['0.0.0.0/0']
    const preshared = getKey(peer, 'PresharedKey', 'PreSharedKey')
    const keepaliveRaw = getKey(peer, 'PersistentKeepalive')
    const persistentKeepalive = keepaliveRaw ? parseInt(keepaliveRaw, 10) : undefined
    const reservedRaw = getKey(peer, 'Reserved')
    const reserved = reservedRaw ? parseReserved(reservedRaw) : undefined

    const name =
      peerList.length === 1 ? baseName : `${baseName}-${i + 1}`

    const p: MihomoProxy = {
      name,
      type: 'wireguard',
      server: ep.server,
      port: ep.port,
      ip: ip || undefined,
      ipv6: ipv6 || undefined,
      'private-key': privateKey,
      'public-key': publicKey,
      'allowed-ips': allowedIps,
      udp: true,
    }
    if (preshared) p['pre-shared-key'] = preshared
    if (persistentKeepalive !== undefined && !isNaN(persistentKeepalive)) {
      p['persistent-keepalive'] = persistentKeepalive
    }
    if (reserved !== undefined) p.reserved = reserved
    if (mtu !== undefined && !isNaN(mtu)) p.mtu = mtu
    if (dns?.length) {
      p['remote-dns-resolve'] = true
      p.dns = dns
    }
    if (amneziaOpt) p['amnezia-wg-option'] = amneziaOpt
    result.push(p)
  }

  return result
}
