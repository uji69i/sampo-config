import type {
  MihomoProxy,
  ProxyGroup,
  RuleEntry,
  RuleProvider,
  Subscription,
  GeneralSettings,
  ExternalSettings,
  DnsSettings,
  GeoSettings,
  SnifferSettings,
  TlsSettings,
  Listener,
  TunnelEntry,
  TunnelEntryObject,
} from './types'
import type { FormMetaField } from './form-meta-types'
import { emitFieldsToYaml } from './form-meta-utils'
import { buildRuleEntriesArray, getMatchPolicyTarget } from './state-helpers'
import type { MihomoState } from './types'

function yamlQuote(s: string | null | undefined): string | null {
  if (s == null) return null
  const cleaned = String(s)
    // eslint-disable-next-line no-control-regex -- strip ASCII control chars for YAML-safe output
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  return `"${cleaned}"`
}

function emitLine(lines: string[], text: string, indent = 0): void {
  lines.push(' '.repeat(indent) + text)
}

function emitKv(
  lines: string[],
  key: string,
  value: string | number | boolean | null | undefined,
  indent: number,
  quote = true
): void {
  if (value == null || (value === '' && key !== 'password')) return
  if (typeof value === 'boolean') {
    emitLine(lines, `${key}: ${value ? 'true' : 'false'}`, indent)
    return
  }
  const v = quote && typeof value !== 'number' ? yamlQuote(String(value)) : value
  emitLine(lines, `${key}: ${v}`, indent)
}

function emitBool(
  lines: string[],
  key: string,
  flag: boolean | null | undefined,
  indent: number
): void {
  if (flag == null) return
  emitLine(lines, `${key}: ${flag ? 'true' : 'false'}`, indent)
}

function emitList(
  lines: string[],
  key: string,
  items: string[] | null | undefined,
  indent: number
): void {
  if (!items?.length) return
  emitLine(lines, `${key}:`, indent)
  for (const it of items) emitLine(lines, `- ${yamlQuote(it)}`, indent + 2)
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/** Emit top-level general settings (mode, mixed-port, allow-lan, etc.) */
export function emitGeneralSettingsYaml(
  settings: GeneralSettings,
  generalFields?: FormMetaField[]
): string {
  if (generalFields?.length) {
    const lines = emitFieldsToYaml(generalFields, settings as unknown as Record<string, unknown>, 0)
    if (!lines.length) return ''
    return lines.join('\n') + '\n'
  }
  const lines: string[] = []
  emitKv(lines, 'mode', settings.mode, 0)
  if (settings.mixedPort != null) emitKv(lines, 'mixed-port', settings.mixedPort, 0, false)
  if (settings.port != null) emitKv(lines, 'port', settings.port, 0, false)
  if (settings.socksPort != null) emitKv(lines, 'socks-port', settings.socksPort, 0, false)
  if (settings.redirPort != null) emitKv(lines, 'redir-port', settings.redirPort, 0, false)
  if (settings.tproxyPort != null) emitKv(lines, 'tproxy-port', settings.tproxyPort, 0, false)
  if (settings.bindAddress != null) emitKv(lines, 'bind-address', settings.bindAddress, 0)
  emitBool(lines, 'allow-lan', settings.allowLan, 0)
  emitBool(lines, 'ipv6', settings.ipv6, 0)
  if (settings.logLevel) emitKv(lines, 'log-level', settings.logLevel, 0)
  emitBool(lines, 'unified-delay', settings.unifiedDelay, 0)
  emitBool(lines, 'tcp-concurrent', settings.tcpConcurrent, 0)
  if (settings.findProcessMode) emitKv(lines, 'find-process-mode', settings.findProcessMode, 0)
  if (settings.globalClientFingerprint) emitKv(lines, 'global-client-fingerprint', settings.globalClientFingerprint, 0)
  if (!lines.length) return ''
  return lines.join('\n') + '\n'
}

/** Emit external controller / API panel section (external-controller, secret, CORS, etc.) */
export function emitExternalSettingsYaml(
  settings: ExternalSettings,
  externalFields?: FormMetaField[]
): string {
  if (externalFields?.length) {
    const lines = emitFieldsToYaml(externalFields, settings as unknown as Record<string, unknown>, 0)
    if (!lines.length) return ''
    return lines.join('\n') + '\n'
  }
  const lines: string[] = []
  if (settings.externalController) emitKv(lines, 'external-controller', settings.externalController, 0)
  if (settings.externalControllerCorsAllowOrigins?.length) {
    emitLine(lines, 'external-controller-cors:', 0)
    emitLine(lines, 'allow-origins:', 2)
    for (const o of settings.externalControllerCorsAllowOrigins) {
      emitLine(lines, `- ${yamlQuote(o) ?? '""'}`, 4)
    }
    if (settings.externalControllerCorsAllowPrivateNetwork != null) {
      emitBool(lines, 'allow-private-network', settings.externalControllerCorsAllowPrivateNetwork, 2)
    }
  } else if (settings.externalControllerCorsAllowPrivateNetwork != null) {
    emitLine(lines, 'external-controller-cors:', 0)
    emitBool(lines, 'allow-private-network', settings.externalControllerCorsAllowPrivateNetwork, 2)
  }
  if (settings.externalControllerUnix) emitKv(lines, 'external-controller-unix', settings.externalControllerUnix, 0)
  if (settings.externalControllerPipe) emitKv(lines, 'external-controller-pipe', settings.externalControllerPipe, 0)
  if (settings.externalControllerTls) emitKv(lines, 'external-controller-tls', settings.externalControllerTls, 0)
  if (settings.externalDohServer) emitKv(lines, 'external-doh-server', settings.externalDohServer, 0)
  if (settings.secret) emitKv(lines, 'secret', settings.secret, 0)
  if (settings.externalUi) emitKv(lines, 'external-ui', settings.externalUi, 0)
  if (settings.externalUiName) emitKv(lines, 'external-ui-name', settings.externalUiName, 0)
  if (settings.externalUiUrl) emitKv(lines, 'external-ui-url', settings.externalUiUrl, 0)
  if (!lines.length) return ''
  return lines.join('\n') + '\n'
}

const DNS_COMPLEX_KEYS = new Set(['fallback_filter', 'nameserver_policy', 'proxy_server_nameserver_policy'])

/** Emit dns: section */
export function emitDnsYaml(dns: DnsSettings, dnsFields?: FormMetaField[]): string {
  if (!dns.enable && !dns.nameserver?.length) return ''
  const lines: string[] = []
  emitLine(lines, 'dns:')
  if (dnsFields?.length) {
    const simpleFields = dnsFields.filter((f) => !DNS_COMPLEX_KEYS.has(f.key))
    const metaLines = emitFieldsToYaml(simpleFields, dns as unknown as Record<string, unknown>, 2)
    for (const line of metaLines) {
      lines.push(line)
    }
  } else {
    emitBool(lines, 'enable', dns.enable, 2)
    if (dns.listen) emitKv(lines, 'listen', dns.listen, 2)
    emitKv(lines, 'enhanced-mode', dns.enhancedMode, 2)
    if (dns.fakeIpRange) emitKv(lines, 'fake-ip-range', dns.fakeIpRange, 2)
    if (dns.fakeIpFilterMode) emitKv(lines, 'fake-ip-filter-mode', dns.fakeIpFilterMode, 2)
    if (dns.fakeIpFilter?.length) emitList(lines, 'fake-ip-filter', dns.fakeIpFilter, 2)
    emitBool(lines, 'ipv6', dns.ipv6, 2)
    emitBool(lines, 'use-hosts', dns.useHosts, 2)
    emitBool(lines, 'use-system-hosts', dns.useSystemHosts, 2)
    if (dns.cacheAlgorithm) emitKv(lines, 'cache-algorithm', dns.cacheAlgorithm, 2)
    if (dns.defaultNameserver?.length) emitList(lines, 'default-nameserver', dns.defaultNameserver, 2)
    if (dns.nameserver?.length) emitList(lines, 'nameserver', dns.nameserver, 2)
    if (dns.fallback?.length) emitList(lines, 'fallback', dns.fallback, 2)
    if (dns.ipv6Timeout != null) emitKv(lines, 'ipv6-timeout', dns.ipv6Timeout, 2, false)
    if (dns.fakeIpRange6) emitKv(lines, 'fake-ip-range6', dns.fakeIpRange6, 2)
    if (dns.fakeIpTtl != null) emitKv(lines, 'fake-ip-ttl', dns.fakeIpTtl, 2, false)
    if (dns.directNameserver?.length) emitList(lines, 'direct-nameserver', dns.directNameserver, 2)
    if (dns.directNameserverFollowPolicy != null) emitBool(lines, 'direct-nameserver-follow-policy', dns.directNameserverFollowPolicy, 2)
  }
  if (dns.fallbackFilter) {
    const ff = dns.fallbackFilter
    emitLine(lines, 'fallback-filter:', 2)
    if (ff.geoip != null) emitBool(lines, 'geoip', ff.geoip, 4)
    if (ff.geoipCode) emitKv(lines, 'geoip-code', ff.geoipCode, 4)
    if (ff.geosite?.length) emitList(lines, 'geosite', ff.geosite, 4)
    if (ff.ipcidr?.length) emitList(lines, 'ipcidr', ff.ipcidr, 4)
    if (ff.domain?.length) emitList(lines, 'domain', ff.domain, 4)
  }
  if (dns.nameserverPolicy?.length) {
    emitLine(lines, 'nameserver-policy:', 2)
    for (const { pattern, servers } of dns.nameserverPolicy) {
      if (!servers?.length) continue
      emitLine(lines, `${yamlQuote(pattern)}:`, 4)
      for (const s of servers) emitLine(lines, `- ${yamlQuote(s)}`, 6)
    }
  }
  if (dns.proxyServerNameserver?.length) emitList(lines, 'proxy-server-nameserver', dns.proxyServerNameserver, 2)
  if (dns.proxyServerNameserverPolicy?.length) {
    emitLine(lines, 'proxy-server-nameserver-policy:', 2)
    for (const { pattern, servers } of dns.proxyServerNameserverPolicy) {
      if (!servers?.length) continue
      emitLine(lines, `${yamlQuote(pattern)}:`, 4)
      for (const s of servers) emitLine(lines, `- ${yamlQuote(s)}`, 6)
    }
  }
  return lines.join('\n') + '\n'
}

/** Emit listeners: section */
export function emitListenersYaml(listeners: Listener[]): string {
  if (!listeners?.length) return ''
  const lines: string[] = []
  emitLine(lines, 'listeners:')
  for (const l of listeners) {
    emitLine(lines, '- name: ' + yamlQuote(l.name || 'in'), 2)
    emitKv(lines, 'type', l.type, 4)
    emitKv(lines, 'port', l.port, 4, false)
    emitKv(lines, 'listen', l.listen ?? '0.0.0.0', 4)
    if (l.udp != null) emitBool(lines, 'udp', l.udp, 4)
    if (l.rule) emitKv(lines, 'rule', l.rule, 4)
    if (l.proxy) emitKv(lines, 'proxy', l.proxy, 4)
    if (l.extraFields && Object.keys(l.extraFields).length) {
      for (const [k, v] of Object.entries(l.extraFields)) {
        if (v == null) continue
        const value = k === 'stack' && l.type === 'tun' && typeof v === 'string' ? v.toLowerCase() : v
        if (typeof value === 'boolean') emitBool(lines, k, value, 4)
        else if (Array.isArray(value)) emitList(lines, k, value as string[], 4)
        else emitKv(lines, k, String(value), 4)
      }
    }
  }
  return lines.join('\n') + '\n'
}

/** Emit tunnels: section (one-line string or object per entry) */
export function emitTunnelsYaml(tunnels: TunnelEntry[]): string {
  if (!tunnels?.length) return ''
  const lines: string[] = []
  emitLine(lines, 'tunnels:')
  for (const entry of tunnels) {
    if (typeof entry === 'string') {
      emitLine(lines, `- ${yamlQuote(entry) ?? '""'}`, 2)
      continue
    }
    const o = entry as TunnelEntryObject
    emitLine(lines, '- network:', 2)
    if (o.network?.length) {
      for (const n of o.network) emitLine(lines, `- ${yamlQuote(n) ?? '""'}`, 4)
    }
    if (o.address != null && o.address !== '') emitLine(lines, `address: ${yamlQuote(o.address) ?? '""'}`, 4)
    if (o.target != null && o.target !== '') emitLine(lines, `target: ${yamlQuote(o.target) ?? '""'}`, 4)
    if (o.proxy != null && o.proxy !== '') emitLine(lines, `proxy: ${yamlQuote(o.proxy) ?? '""'}`, 4)
  }
  return lines.join('\n') + '\n'
}

/** Emit top-level geo/geodata settings (geox-url, geo-auto-update, etc.) */
export function emitGeoSettingsYaml(
  settings: GeoSettings,
  geoFields?: FormMetaField[]
): string {
  if (geoFields?.length) {
    const lines = emitFieldsToYaml(geoFields, settings as unknown as Record<string, unknown>, 0)
    if (!lines.length) return ''
    return lines.join('\n') + '\n'
  }
  const lines: string[] = []
  if (settings.geodataMode != null) emitBool(lines, 'geodata-mode', settings.geodataMode, 0)
  if (settings.geoipUrl || settings.geositeUrl || settings.mmdbUrl || settings.asnUrl) {
    emitLine(lines, 'geox-url:')
    if (settings.geoipUrl) emitKv(lines, 'geoip', settings.geoipUrl, 2)
    if (settings.geositeUrl) emitKv(lines, 'geosite', settings.geositeUrl, 2)
    if (settings.mmdbUrl) emitKv(lines, 'mmdb', settings.mmdbUrl, 2)
    if (settings.asnUrl) emitKv(lines, 'asn', settings.asnUrl, 2)
  }
  if (settings.geoAutoUpdate != null) emitBool(lines, 'geo-auto-update', settings.geoAutoUpdate, 0)
  if (settings.geoUpdateInterval != null) emitKv(lines, 'geo-update-interval', settings.geoUpdateInterval, 0, false)
  if (settings.geositeMatcher) emitKv(lines, 'geosite-matcher', settings.geositeMatcher, 0)
  if (!lines.length) return ''
  return lines.join('\n') + '\n'
}

/** Emit sniffer: section */
export function emitSnifferYaml(
  settings: SnifferSettings,
  advancedYaml?: string | null,
  useAdvanced?: boolean
): string {
  if (useAdvanced && advancedYaml?.trim()) {
    return advancedYaml.trim() + '\n'
  }
  const lines: string[] = []
  emitLine(lines, 'sniffer:')
  emitBool(lines, 'enable', settings.enable, 2)
  if (settings.forceDnsMapping != null) emitBool(lines, 'force-dns-mapping', settings.forceDnsMapping, 2)
  if (settings.parsePureIp != null) emitBool(lines, 'parse-pure-ip', settings.parsePureIp, 2)
  if (settings.overrideDestination != null) emitBool(lines, 'override-destination', settings.overrideDestination, 2)
  if (settings.sniff && typeof settings.sniff === 'object') {
    const sniff = settings.sniff as Record<string, unknown>
    const order = ['HTTP', 'TLS', 'QUIC'] as const
    const hasAny = order.some((p) => p in sniff)

    const formatPortItem = (v: string | number): string | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return String(v)
      const s = String(v).trim()
      if (!s) return null
      // Prefer plain scalars for common port/range forms for readability.
      if (/^\d+(-\d+)?$/.test(s)) return s
      return yamlQuote(s)
    }

    if (hasAny) {
      emitLine(lines, 'sniff:', 2)
      for (const proto of order) {
        if (!(proto in sniff)) continue
        emitLine(lines, `${proto}:`, 4)
        const cfgRaw = sniff[proto]
        if (!cfgRaw || typeof cfgRaw !== 'object') continue
        const cfg = cfgRaw as Record<string, unknown>

        const portsRaw = cfg.ports
        if (Array.isArray(portsRaw)) {
          const items = portsRaw
            .map((x) => (typeof x === 'string' || typeof x === 'number' ? formatPortItem(x) : null))
            .filter((x): x is string => Boolean(x))
          if (items.length) emitLine(lines, `ports: [${items.join(', ')}]`, 6)
        }
        if (typeof cfg.overrideDestination === 'boolean')
          emitBool(lines, 'override-destination', cfg.overrideDestination, 6)
      }
    }
  }
  if (settings.forceDomain?.length) emitList(lines, 'force-domain', settings.forceDomain, 2)
  if (settings.skipSrcAddress?.length) emitList(lines, 'skip-src-address', settings.skipSrcAddress, 2)
  if (settings.skipDstAddress?.length) emitList(lines, 'skip-dst-address', settings.skipDstAddress, 2)
  if (settings.skipDomain?.length) emitList(lines, 'skip-domain', settings.skipDomain, 2)
  if (settings.sniffing?.length) emitList(lines, 'sniffing', settings.sniffing, 2)
  if (settings.portWhitelist?.length) emitList(lines, 'port-whitelist', settings.portWhitelist, 2)
  if (lines.length <= 1) return ''
  return lines.join('\n') + '\n'
}

/** Emit tls: section */
export function emitTlsYaml(
  settings: TlsSettings,
  advancedYaml?: string | null,
  useAdvanced?: boolean
): string {
  if (useAdvanced && advancedYaml?.trim()) {
    return advancedYaml.trim() + '\n'
  }
  const lines: string[] = []
  if (!settings.certificate && !settings.privateKey && !settings.clientAuthType && !settings.clientAuthCert) {
    return ''
  }
  emitLine(lines, 'tls:')
  if (settings.certificate) emitKv(lines, 'certificate', settings.certificate, 2)
  if (settings.privateKey) emitKv(lines, 'private-key', settings.privateKey, 2)
  if (settings.clientAuthType) emitKv(lines, 'client-auth-type', settings.clientAuthType, 2)
  if (settings.clientAuthCert) emitKv(lines, 'client-auth-cert', settings.clientAuthCert, 2)
  if (lines.length <= 1) return ''
  return lines.join('\n') + '\n'
}

function emitWireguardProxy(lines: string[], p: MihomoProxy, indent: number): void {
  emitKv(lines, 'ip', p.ip as string | undefined, indent)
  emitKv(lines, 'ipv6', p.ipv6 as string | undefined, indent)
  emitKv(lines, 'private-key', p['private-key'] as string, indent)
  emitKv(lines, 'server', p.server, indent, false)
  if (p.port != null) emitKv(lines, 'port', p.port, indent, false)
  emitKv(lines, 'public-key', p['public-key'] as string, indent)
  const allowed = p['allowed-ips'] as string[] | undefined
  if (allowed?.length) emitList(lines, 'allowed-ips', allowed, indent)
  emitKv(lines, 'pre-shared-key', p['pre-shared-key'] as string, indent)
  const reserved = p.reserved
  if (reserved !== undefined) {
    if (Array.isArray(reserved)) {
      emitLine(lines, `reserved: [${(reserved as number[]).join(', ')}]`, indent)
    } else {
      emitKv(lines, 'reserved', String(reserved), indent)
    }
  }
  const keepalive = p['persistent-keepalive'] as number | undefined
  if (keepalive != null) emitKv(lines, 'persistent-keepalive', keepalive, indent, false)
  const mtu = p.mtu as number | undefined
  if (mtu != null) emitKv(lines, 'mtu', mtu, indent, false)
  if ('udp' in p) emitBool(lines, 'udp', !!p.udp, indent)
  if (p['remote-dns-resolve'] != null) emitBool(lines, 'remote-dns-resolve', !!p['remote-dns-resolve'], indent)
  const dns = p.dns as string[] | undefined
  if (dns?.length) emitList(lines, 'dns', dns, indent)
  const amnezia = p['amnezia-wg-option'] as Record<string, unknown> | undefined
  if (amnezia && typeof amnezia === 'object') {
    emitLine(lines, 'amnezia-wg-option:', indent)
    const order = ['jc', 'jmin', 'jmax', 's1', 's2', 'h1', 'h2', 'h3', 'h4', 'i1', 'i2', 'i3', 'i4', 'i5', 'j1', 'j2', 'j3', 'itime']
    for (const k of order) {
      const v = amnezia[k]
      if (v !== undefined && v !== '' && (typeof v === 'string' || typeof v === 'number'))
        emitKv(lines, k, typeof v === 'number' ? v : String(v), indent + 2)
    }
    for (const [k, v] of Object.entries(amnezia)) {
      if (order.includes(k) || v === undefined || v === '') continue
      if (typeof v === 'string' || typeof v === 'number')
        emitKv(lines, k, typeof v === 'number' ? v : String(v), indent + 2)
    }
  }
}

export function emitProxiesYaml(proxies: MihomoProxy[]): string {
  const lines: string[] = []
  emitLine(lines, 'proxies:')
  proxies.forEach((p, i) => {
    emitLine(lines, '- name: ' + yamlQuote(p.name || 'proxy'), 2)
    emitKv(lines, 'type', p.type, 4)
    if (p.type === 'wireguard') {
      emitWireguardProxy(lines, p, 4)
      if (i !== proxies.length - 1) emitLine(lines, '')
      return
    }
    emitKv(lines, 'server', p.server, 4, false)
    if (p.port != null) emitKv(lines, 'port', p.port, 4, false)
    for (const k of [
      'uuid',
      'password',
      'cipher',
      'alterId',
      'network',
      'flow',
      'servername',
      'client-fingerprint',
      'sni',
      'auth_str',
      'auth',
      'token',
      'protocol',
      'obfs',
      'protocol-param',
      'obfs-param',
      'encryption',
    ]) {
      if (k in p && p[k] != null) emitKv(lines, k, p[k] as string | number, 4)
    }
    if ('tls' in p) emitBool(lines, 'tls', !!p.tls, 4)
    if ('udp' in p) emitBool(lines, 'udp', !!p.udp, 4)
    if ('insecure' in p) emitBool(lines, 'insecure', !!p.insecure, 4)
    if ('skip-cert-verify' in p)
      emitBool(lines, 'skip-cert-verify', !!p['skip-cert-verify'], 4)
    if (p['up-mbps']) emitKv(lines, 'up-mbps', p['up-mbps'], 4, false)
    if (p['down-mbps']) emitKv(lines, 'down-mbps', p['down-mbps'], 4, false)
    if (p.alpn) emitList(lines, 'alpn', p.alpn, 4)
    if (p.seed) emitKv(lines, 'seed', p.seed, 4)
    if (p.header) emitKv(lines, 'header', p.header, 4)
    if (p.plugin) emitKv(lines, 'plugin', p.plugin, 4)
    if (p['plugin-opts']) {
      emitLine(lines, 'plugin-opts:', 4)
      for (const [pk, pv] of Object.entries(p['plugin-opts']))
        emitKv(lines, pk, pv, 6)
    }
    if (p['ws-opts']) {
      emitLine(lines, 'ws-opts:', 4)
      emitKv(lines, 'path', p['ws-opts'].path, 6)
      if (p['ws-opts'].headers) {
        emitLine(lines, 'headers:', 6)
        for (const [hk, hv] of Object.entries(p['ws-opts'].headers))
          emitKv(lines, hk, hv, 8)
      }
    }
    if (p['reality-opts']) {
      emitLine(lines, 'reality-opts:', 4)
      for (const [rk, rv] of Object.entries(p['reality-opts']))
        if (rv) emitKv(lines, rk, rv, 6)
    }
    if (p['grpc-opts']) {
      emitLine(lines, 'grpc-opts:', 4)
      for (const [gk, gv] of Object.entries(p['grpc-opts']))
        emitKv(lines, gk, gv, 6)
    }
    if (p['h2-opts']) {
      emitLine(lines, 'h2-opts:', 4)
      emitKv(lines, 'path', p['h2-opts'].path, 6)
      if (p['h2-opts'].host) {
        if (Array.isArray(p['h2-opts'].host))
          emitList(lines, 'host', p['h2-opts'].host, 6)
        else emitKv(lines, 'host', p['h2-opts'].host, 6)
      }
    }
    if (p['http-opts']) {
      emitLine(lines, 'http-opts:', 4)
      const rawPath = p['http-opts'].path
      if (rawPath != null && rawPath !== '') {
        const paths = Array.isArray(rawPath) ? rawPath : [rawPath]
        emitList(lines, 'path', paths, 6)
      }
      if (p['http-opts'].headers) {
        emitLine(lines, 'headers:', 6)
        for (const [hk, hv] of Object.entries(p['http-opts'].headers)) {
          if (hv == null || hv === '') continue
          const vals = Array.isArray(hv) ? hv : [hv]
          emitList(lines, hk, vals, 8)
        }
      }
    }
    if (p['kcp-opts']) {
      emitLine(lines, 'kcp-opts:', 4)
      if (p['kcp-opts'].seed) emitKv(lines, 'seed', p['kcp-opts'].seed, 6)
      if (p['kcp-opts'].header) {
        emitLine(lines, 'header:', 6)
        emitKv(lines, 'type', p['kcp-opts'].header.type, 8)
      }
    }
    if (p['tcp-opts']) {
      emitLine(lines, 'tcp-opts:', 4)
      if (p['tcp-opts'].header) {
        emitLine(lines, 'header:', 6)
        emitKv(lines, 'type', p['tcp-opts'].header.type, 8)
      }
    }
    if (i !== proxies.length - 1) emitLine(lines, '')
  })
  return lines.join('\n') + '\n'
}

export function emitGroupsYaml(groups: ProxyGroup[]): string {
  if (!groups.length) return ''
  const lines: string[] = []
  emitLine(lines, 'proxy-groups:')
  groups.forEach((g, gi) => {
    emitLine(lines, '- name: ' + (g.name || 'GROUP'), 2)
    emitLine(lines, '    type: ' + g.type, 0)
    if (g.icon) emitLine(lines, '    icon: ' + g.icon, 0)
    const list = uniq([...(g.proxies || []), ...(g.manual || [])])
    if (list.length) {
      emitLine(lines, '    proxies:', 0)
      list.forEach((pn) => emitLine(lines, '    - ' + yamlQuote(pn), 0))
    }
    if (g.useSubs?.length) {
      emitLine(lines, '    use:', 0)
      g.useSubs.forEach((sn) => emitLine(lines, '    - ' + yamlQuote(sn), 0))
    }
    if (g.includeAll) emitBool(lines, 'include-all', true, 4)
    if (g.hidden) emitBool(lines, 'hidden', true, 4)
    if (g.filter) emitKv(lines, 'filter', g.filter, 4)
    if (g.excludeFilter) emitKv(lines, 'exclude-filter', g.excludeFilter, 4)
    if (g.excludeType) emitKv(lines, 'exclude-type', g.excludeType, 4)
    if (g.url) emitKv(lines, 'url', g.url, 4)
    if (g.interval != null) emitKv(lines, 'interval', g.interval, 4, false)
    if (g.tolerance != null) emitKv(lines, 'tolerance', g.tolerance, 4, false)
    if (g.lazy != null) emitBool(lines, 'lazy', g.lazy, 4)
    if (g.expectedStatus) emitKv(lines, 'expected-status', g.expectedStatus, 4)
    if (gi !== groups.length - 1) emitLine(lines, '')
  })
  return lines.join('\n') + '\n'
}

export function emitRulesYaml(
  state: MihomoState,
  ruleOrder: RuleEntry[] | null,
  advancedRulesYaml?: string,
  templateRuleLines: string[] = []
): string {
  if (advancedRulesYaml?.trim()) return advancedRulesYaml.trim() + '\n'
  const lines: string[] = []
  emitLine(lines, 'rules:')
  const entries =
    Array.isArray(ruleOrder) && ruleOrder.length
      ? ruleOrder
      : buildRuleEntriesArray(state)
  const matchPolicy = getMatchPolicyTarget(state)
  for (const e of entries) {
    if (e.kind === 'MATCH') {
      for (const ruleLine of templateRuleLines) {
        emitLine(lines, `- ${ruleLine}`, 2)
      }
      emitLine(lines, `- MATCH,${matchPolicy}`, 2)
      continue
    }
    switch (e.kind) {
      case 'GEOSITE':
        emitLine(lines, `- GEOSITE,${e.key},${e.policy}`, 2)
        break
      case 'GEOIP':
        emitLine(lines, `- GEOIP,${e.key},${e.policy}`, 2)
        break
      case 'RULE-SET':
        emitLine(lines, `- RULE-SET,${e.key},${e.policy}`, 2)
        break
      case 'MANUAL':
        emitLine(lines, `- ${e.key},${e.policy}`, 2)
        break
    }
  }
  return lines.join('\n') + '\n'
}

/** Emit sub-rules section: named rule sets for SUB-RULE and listener rule field. */
export function emitSubRulesYaml(subRules: Record<string, string[]>): string {
  if (!subRules || Object.keys(subRules).length === 0) return ''
  const lines: string[] = []
  emitLine(lines, 'sub-rules:')
  for (const [name, rules] of Object.entries(subRules)) {
    if (!Array.isArray(rules) || rules.length === 0) continue
    emitLine(lines, `${name}:`, 2)
    for (const r of rules) {
      if (r != null && String(r).trim() !== '')
        emitLine(lines, `- ${yamlQuote(String(r).trim()) ?? '""'}`, 4)
    }
  }
  return lines.join('\n') + '\n'
}

export function emitSubsYaml(
  subs: Subscription[],
  advancedSubsYaml?: string
): string {
  if (advancedSubsYaml?.trim()) return advancedSubsYaml.trim()
  if (!subs.length) return ''
  let out = 'proxy-providers:\n'
  for (const sub of subs) {
    const isFile = sub.type === 'file' || (sub.path && !sub.url)
    out += `  ${sub.name}:\n`
    if (isFile && sub.path) {
      out += `    type: file\n`
      out += `    path: ${yamlQuote(sub.path) ?? '""'}\n`
    } else {
      out += `    type: http\n`
      out += `    url: ${yamlQuote(sub.url) ?? '""'}\n`
      out += `    interval: ${sub.interval ?? 3600}\n`
      out += `    path: ${sub.path?.trim() ? yamlQuote(sub.path.trim()) : `./providers/${sub.name}.yaml`}\n`
      if (sub.fetchMode === 'PROXY' && sub.fetchProxy) {
        out += `    proxy: ${sub.fetchProxy}\n`
      }
      if (sub.sizeLimit != null && sub.sizeLimit > 0) {
        out += `    size-limit: ${sub.sizeLimit}\n`
      }
    }
    // header
    if (sub.xHwid?.trim()) {
      out += `    header:\n`
      out += `      x-hwid:\n`
      out += `      - ${yamlQuote(sub.xHwid.trim()) ?? '""'}\n`
    }
    // health-check
    const hcUrl = sub.healthCheckUrl?.trim() || 'https://www.gstatic.com/generate_204'
    const hcInterval = sub.healthCheckInterval ?? 600
    out += `    health-check:\n`
    out += `      enable: true\n`
    out += `      url: ${hcUrl}\n`
    out += `      interval: ${hcInterval}\n`
    if (sub.healthCheckTimeout != null) out += `      timeout: ${sub.healthCheckTimeout}\n`
    if (sub.healthCheckLazy != null) out += `      lazy: ${sub.healthCheckLazy}\n`
    if (sub.healthCheckExpectedStatus != null) out += `      expected-status: ${sub.healthCheckExpectedStatus}\n`
    // override
    const hasOverride =
      sub.skipCertVerify != null ||
      sub.overrideUdp != null ||
      sub.overrideAdditionalPrefix?.trim() ||
      sub.overrideAdditionalSuffix?.trim() ||
      sub.overrideUp?.trim() ||
      sub.overrideDown?.trim() ||
      sub.overrideDialerProxy?.trim() ||
      sub.overrideInterfaceName?.trim() ||
      sub.overrideIpVersion?.trim() ||
      sub.overrideRoutingMark != null
    if (hasOverride) {
      out += `    override:\n`
      if (sub.skipCertVerify != null) out += `      skip-cert-verify: ${sub.skipCertVerify}\n`
      if (sub.overrideUdp != null) out += `      udp: ${sub.overrideUdp}\n`
      if (sub.overrideUp?.trim()) out += `      up: ${yamlQuote(sub.overrideUp.trim())}\n`
      if (sub.overrideDown?.trim()) out += `      down: ${yamlQuote(sub.overrideDown.trim())}\n`
      if (sub.overrideDialerProxy?.trim()) out += `      dialer-proxy: ${sub.overrideDialerProxy.trim()}\n`
      if (sub.overrideInterfaceName?.trim()) out += `      interface-name: ${sub.overrideInterfaceName.trim()}\n`
      if (sub.overrideRoutingMark != null) out += `      routing-mark: ${sub.overrideRoutingMark}\n`
      if (sub.overrideIpVersion?.trim()) out += `      ip-version: ${sub.overrideIpVersion.trim()}\n`
      if (sub.overrideAdditionalPrefix?.trim()) out += `      additional-prefix: ${yamlQuote(sub.overrideAdditionalPrefix.trim())}\n`
      if (sub.overrideAdditionalSuffix?.trim()) out += `      additional-suffix: ${yamlQuote(sub.overrideAdditionalSuffix.trim())}\n`
    }
    // filter
    if (sub.filter?.trim()) out += `    filter: ${yamlQuote(sub.filter.trim())}\n`
    if (sub.excludeFilter?.trim()) out += `    exclude-filter: ${yamlQuote(sub.excludeFilter.trim())}\n`
    if (sub.excludeType?.trim()) out += `    exclude-type: ${yamlQuote(sub.excludeType.trim())}\n`
  }
  return out.trim()
}

export function emitRuleProvidersYaml(ruleProviders: RuleProvider[]): string {
  if (!ruleProviders?.length) return ''
  const lines: string[] = []
  emitLine(lines, 'rule-providers:')
  ruleProviders.forEach((rp, i) => {
    emitLine(lines, `${rp.name}:`, 2)
    emitLine(lines, `type: ${rp.type || 'http'}`, 4)
    if (rp.path != null) emitLine(lines, `path: ${yamlQuote(rp.path) ?? '""'}`, 4)
    emitLine(lines, `url: ${yamlQuote(rp.url)}`, 4)
    if (rp.interval != null) emitLine(lines, `interval: ${rp.interval}`, 4)
    if (rp.proxy) emitLine(lines, `proxy: ${rp.proxy}`, 4)
    if (rp.behavior) emitLine(lines, `behavior: ${rp.behavior}`, 4)
    if (rp.format) emitLine(lines, `format: ${rp.format}`, 4)
    if (i !== ruleProviders.length - 1) emitLine(lines, '')
  })
  return lines.join('\n') + '\n'
}

/** Build rule-providers list: user-defined + from enabled service templates. */
function getMergedRuleProviders(state: MihomoState): RuleProvider[] {
  const list: RuleProvider[] = [...state.ruleProviders]
  const seen = new Set(state.ruleProviders.map((r) => r.name))
  for (const tpl of state.serviceTemplates) {
    if (!state.enabledTemplates.has(tpl.id)) continue
    for (const rp of tpl.ruleProviders) {
      if (seen.has(rp.name)) continue
      seen.add(rp.name)
      const ext = rp.format === 'yaml' ? 'yaml' : 'mrs'
      list.push({
        name: rp.name,
        type: 'http',
        url: rp.url,
        behavior: rp.behavior as RuleProvider['behavior'],
        format: rp.format as RuleProvider['format'],
        path: `./rule-sets/${rp.name}.${ext}`,
        interval: 86400,
      })
    }
  }
  return list
}

/** Build rule lines from enabled service templates (before MATCH). */
function getTemplateRuleLines(state: MihomoState): string[] {
  const out: string[] = []
  for (const tpl of state.serviceTemplates) {
    const policy = state.enabledTemplates.get(tpl.id)
    if (!policy) continue
    const line = tpl.rulePattern.replace(/\{policy\}/g, policy)
    out.push(line)
  }
  return out
}

export interface MihomoFormMeta {
  general: { fields: FormMetaField[] }
  external?: { fields: FormMetaField[] }
  dns: { fields: FormMetaField[] }
  geo?: { fields: FormMetaField[] }
  sniffer?: { fields: FormMetaField[] }
  tls?: { fields: FormMetaField[] }
  tunnels?: { fields: FormMetaField[] }
}

export function buildFullConfig(state: MihomoState, overrides: {
  advancedSubsYaml?: string
  advancedGroupsYaml?: string
  advancedRulesYaml?: string
  formMeta?: MihomoFormMeta
} = {}): string {
  const parts: string[] = []
  if (state.useGeneralSettings) {
    if (state.useAdvancedGeneralYaml && state.advancedGeneralYaml?.trim()) {
      parts.push(state.advancedGeneralYaml.trim() + '\n')
    } else {
      const generalYaml = emitGeneralSettingsYaml(
        state.generalSettings,
        overrides.formMeta?.general?.fields
      )
      if (generalYaml) parts.push(generalYaml)
    }
    if (state.customGeneralYaml?.trim()) parts.push(state.customGeneralYaml.trim())
  }
  if (state.useExternalSettings) {
    if (state.useAdvancedExternalYaml && state.advancedExternalYaml?.trim()) {
      parts.push(state.advancedExternalYaml.trim() + '\n')
    } else {
      const externalYaml = emitExternalSettingsYaml(
        state.externalSettings,
        overrides.formMeta?.external?.fields
      )
      if (externalYaml) parts.push(externalYaml)
    }
    if (state.customExternalYaml?.trim()) parts.push(state.customExternalYaml.trim())
  }
  if (state.useGeoSettings) {
    if (state.useAdvancedGeoYaml && state.advancedGeoYaml?.trim()) {
      parts.push(state.advancedGeoYaml.trim() + '\n')
    } else {
      const geoYaml = emitGeoSettingsYaml(
        state.geoSettings,
        overrides.formMeta?.geo?.fields
      )
      if (geoYaml) parts.push(geoYaml)
    }
    if (state.customGeoYaml?.trim()) parts.push(state.customGeoYaml.trim())
  }
  if (state.useTlsSettings) {
    const tlsYaml = emitTlsYaml(
      state.tlsSettings,
      state.advancedTlsYaml,
      state.useAdvancedTlsYaml
    )
    if (tlsYaml) parts.push(tlsYaml)
    if (state.customTlsYaml?.trim()) parts.push(state.customTlsYaml.trim())
  }
  if (state.useListeners) {
    if (state.listeners?.length && !state.useAdvancedListenersYaml) {
      const listenersYaml = emitListenersYaml(state.listeners)
      if (listenersYaml) parts.push(listenersYaml)
    }
    if (state.useAdvancedListenersYaml && state.advancedListenersYaml?.trim()) {
      parts.push(state.advancedListenersYaml.trim() + '\n')
    }
    if (state.customListenersYaml?.trim()) parts.push(state.customListenersYaml.trim())
  }
  if (state.useTunnels) {
    if (state.tunnels?.length && !state.useAdvancedTunnelsYaml) {
      const tunnelsYaml = emitTunnelsYaml(state.tunnels)
      if (tunnelsYaml) parts.push(tunnelsYaml)
    }
    if (state.useAdvancedTunnelsYaml && state.advancedTunnelsYaml?.trim()) {
      parts.push(state.advancedTunnelsYaml.trim() + '\n')
    }
    if (state.customTunnelsYaml?.trim()) parts.push(state.customTunnelsYaml.trim())
  }
  if (state.useSnifferSettings) {
    const snifferYaml = emitSnifferYaml(
      state.snifferSettings,
      state.advancedSnifferYaml,
      state.useAdvancedSnifferYaml
    )
    if (snifferYaml) parts.push(snifferYaml)
    if (state.customSnifferYaml?.trim()) parts.push(state.customSnifferYaml.trim())
  }
  if (state.useDnsSettings) {
    const dnsYaml = state.useAdvancedDnsYaml && state.advancedDnsYaml?.trim()
      ? state.advancedDnsYaml.trim() + '\n'
      : emitDnsYaml(state.dnsSettings, overrides.formMeta?.dns?.fields)
    if (dnsYaml) parts.push(dnsYaml)
    if (state.customDnsYaml?.trim()) parts.push(state.customDnsYaml.trim())
  }
  const proxiesYaml = emitProxiesYaml(state.proxies)
  if (state.proxies.length) parts.push(proxiesYaml)
  const subsYaml = emitSubsYaml(state.subs, overrides.advancedSubsYaml)
  if (subsYaml) parts.push(subsYaml)
  const groupsYaml = overrides.advancedGroupsYaml?.trim()
    ? overrides.advancedGroupsYaml.trim() + '\n'
    : emitGroupsYaml(state.groups)
  if (groupsYaml) parts.push(groupsYaml)
  const mergedProviders = getMergedRuleProviders(state)
  const ruleProvidersYaml = emitRuleProvidersYaml(mergedProviders)
  if (ruleProvidersYaml) parts.push(ruleProvidersYaml)
  const templateRuleLines = getTemplateRuleLines(state)
  const rulesYaml = emitRulesYaml(
    state,
    state.ruleOrder,
    overrides.advancedRulesYaml,
    templateRuleLines
  )
  if (rulesYaml) parts.push(rulesYaml)
  if (state.subRules && Object.keys(state.subRules).length > 0) {
    const subRulesYaml = emitSubRulesYaml(state.subRules)
    if (subRulesYaml) parts.push(subRulesYaml)
  }
  return parts.join('\n')
}
