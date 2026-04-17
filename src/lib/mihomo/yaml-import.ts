import { parse as yamlParse } from 'yaml'
import type { FormMetaField } from './form-meta-types'
import { parseYamlToStateFields } from './form-meta-utils'
import type {
  MihomoProxy,
  ProxyGroup,
  RuleProvider,
  RuleEntry,
  ManualRule,
  ManualRuleType,
  MatchState,
  Subscription,
  GeneralSettings,
  ExternalSettings,
  DnsSettings,
  GeoSettings,
  SnifferSettings,
  TlsSettings,
  Listener,
  ListenerType,
  TunnelEntry,
  TunnelEntryObject,
} from './types'

export interface ParseYamlFormMeta {
  general: { fields: FormMetaField[] }
  external?: { fields: FormMetaField[] }
  dns: { fields: FormMetaField[] }
  geo?: { fields: FormMetaField[] }
  sniffer?: { fields: FormMetaField[] }
  tls?: { fields: FormMetaField[] }
}

const MANUAL_RULE_TYPES: ManualRuleType[] = [
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'IP-CIDR',
  'IP-ASN',
  'PROCESS-NAME',
  'PROCESS-PATH',
  'IN-NAME',
  'IN-PORT',
  'IN-TYPE',
  'IN-USER',
]

const LISTENER_TYPES: ListenerType[] = [
  'http', 'socks', 'mixed', 'redirect', 'tproxy', 'tun',
  'shadowsocks', 'vmess', 'vless', 'trojan', 'tuic', 'hysteria2', 'tunnel',
]

export interface ParseYamlResult {
  state: Partial<{
    proxies: MihomoProxy[]
    groups: ProxyGroup[]
    subs: Subscription[]
    ruleProviders: RuleProvider[]
    rulesGeosite: Map<string, { action: string; target: string }>
    rulesGeoip: Map<string, { action: string; target: string }>
    manualRules: ManualRule[]
    ruleOrder: RuleEntry[]
    subRules: Record<string, string[]>
    match: MatchState
    generalSettings: GeneralSettings
    dnsSettings: DnsSettings
    listeners: Listener[]
    useListeners: boolean
    tunnels: TunnelEntry[]
    useTunnels: boolean
    advancedTunnelsYaml: string
    useAdvancedTunnelsYaml: boolean
    customTunnelsYaml: string
    useGeneralSettings: boolean
    externalSettings: ExternalSettings
    useExternalSettings: boolean
    useDnsSettings: boolean
    geoSettings: GeoSettings
    useGeoSettings: boolean
    snifferSettings: SnifferSettings
    useSnifferSettings: boolean
    advancedSnifferYaml: string
    useAdvancedSnifferYaml: boolean
    tlsSettings: TlsSettings
    useTlsSettings: boolean
    advancedTlsYaml: string
    useAdvancedTlsYaml: boolean
  }>
  errors: string[]
}

function toMihomoProxy(raw: unknown): MihomoProxy | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const type = typeof o.type === 'string' ? o.type : ''
  const server = typeof o.server === 'string' ? o.server : ''
  if (!server) return null
  const p: MihomoProxy = { type, server }
  if (typeof o.name === 'string') p.name = o.name
  if (typeof o.port === 'number') p.port = o.port
  const strKeys = [
    'uuid', 'password', 'cipher', 'network', 'flow', 'servername', 'sni',
    'auth_str', 'auth', 'token', 'protocol', 'obfs', 'protocol-param', 'obfs-param',
    'encryption', 'seed', 'header', 'plugin', 'client-fingerprint',
  ] as const
  for (const k of strKeys) {
    if (typeof o[k] === 'string') (p as Record<string, unknown>)[k] = o[k]
  }
  if (typeof o.alterId === 'number') p.alterId = o.alterId
  if (typeof o.tls === 'boolean') p.tls = o.tls
  if (typeof o.udp === 'boolean') p.udp = o.udp
  if (typeof o.insecure === 'boolean') p.insecure = o.insecure
  if (typeof o['skip-cert-verify'] === 'boolean') p['skip-cert-verify'] = o['skip-cert-verify']
  if (typeof o['up-mbps'] === 'number') p['up-mbps'] = o['up-mbps']
  if (typeof o['down-mbps'] === 'number') p['down-mbps'] = o['down-mbps']
  if (Array.isArray(o.alpn)) p.alpn = o.alpn.filter((x): x is string => typeof x === 'string')
  if (o['plugin-opts'] && typeof o['plugin-opts'] === 'object')
    p['plugin-opts'] = o['plugin-opts'] as Record<string, string>
  if (o['ws-opts'] && typeof o['ws-opts'] === 'object')
    p['ws-opts'] = o['ws-opts'] as MihomoProxy['ws-opts']
  if (o['reality-opts'] && typeof o['reality-opts'] === 'object')
    p['reality-opts'] = o['reality-opts'] as Record<string, string>
  if (o['grpc-opts'] && typeof o['grpc-opts'] === 'object')
    p['grpc-opts'] = o['grpc-opts'] as Record<string, string>
  if (o['h2-opts'] && typeof o['h2-opts'] === 'object')
    p['h2-opts'] = o['h2-opts'] as MihomoProxy['h2-opts']
  if (o['http-opts'] && typeof o['http-opts'] === 'object')
    p['http-opts'] = o['http-opts'] as MihomoProxy['http-opts']
  if (o['kcp-opts'] && typeof o['kcp-opts'] === 'object')
    p['kcp-opts'] = o['kcp-opts'] as MihomoProxy['kcp-opts']
  if (o['tcp-opts'] && typeof o['tcp-opts'] === 'object')
    p['tcp-opts'] = o['tcp-opts'] as MihomoProxy['tcp-opts']
  if (type === 'wireguard') {
    if (typeof o.ip === 'string') p.ip = o.ip
    if (typeof o.ipv6 === 'string') p.ipv6 = o.ipv6
    if (typeof o['private-key'] === 'string') p['private-key'] = o['private-key']
    if (typeof o['public-key'] === 'string') p['public-key'] = o['public-key']
    if (Array.isArray(o['allowed-ips'])) p['allowed-ips'] = (o['allowed-ips'] as unknown[]).filter((x): x is string => typeof x === 'string')
    if (typeof o['pre-shared-key'] === 'string') p['pre-shared-key'] = o['pre-shared-key']
    if (o.reserved !== undefined) p.reserved = o.reserved as string | number[]
    if (typeof o['persistent-keepalive'] === 'number') p['persistent-keepalive'] = o['persistent-keepalive']
    if (typeof o.mtu === 'number') p.mtu = o.mtu
    if (typeof o['remote-dns-resolve'] === 'boolean') p['remote-dns-resolve'] = o['remote-dns-resolve']
    if (Array.isArray(o.dns)) p.dns = (o.dns as unknown[]).filter((x): x is string => typeof x === 'string')
    if (o['amnezia-wg-option'] && typeof o['amnezia-wg-option'] === 'object')
      p['amnezia-wg-option'] = o['amnezia-wg-option'] as Record<string, unknown>
  }
  for (const k of Object.keys(o)) {
    if (k in p) continue
    const v = o[k]
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ||
        (Array.isArray(v) && (v.length === 0 || typeof v[0] === 'string' || typeof v[0] === 'number')) ||
        (v && typeof v === 'object' && !Array.isArray(v)))
      (p as Record<string, unknown>)[k] = v
  }
  return p
}

function parseProxies(proxiesRaw: unknown): MihomoProxy[] {
  if (!Array.isArray(proxiesRaw)) return []
  const out: MihomoProxy[] = []
  for (const item of proxiesRaw) {
    const p = toMihomoProxy(item)
    if (p) out.push(p)
  }
  return out
}

function readXHwidFromHeader(header: unknown): string | undefined {
  if (!header || typeof header !== 'object') return undefined
  const h = header as Record<string, unknown>
  const val = h['x-hwid']
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') return val[0]
  if (typeof val === 'string') return val
  return undefined
}

function applyProxyProviderOverride(v: Record<string, unknown>, sub: Subscription): void {
  const override = v.override
  if (!override || typeof override !== 'object') return
  const o = override as Record<string, unknown>
  const dialer = o['dialer-proxy']
  if (typeof dialer === 'string' && dialer.trim()) sub.overrideDialerProxy = dialer.trim()
}

function parseProxyProviders(proxyProvidersRaw: unknown): Subscription[] {
  if (!proxyProvidersRaw || typeof proxyProvidersRaw !== 'object') return []
  const out: Subscription[] = []
  for (const [name, val] of Object.entries(proxyProvidersRaw)) {
    if (!val || typeof val !== 'object') continue
    const v = val as Record<string, unknown>
    const type = (typeof v.type === 'string' && (v.type === 'http' || v.type === 'file')) ? v.type : 'http'
    if (type === 'file') {
      const path = typeof v.path === 'string' ? v.path : ''
      if (!path) continue
      const sub: Subscription = { name, url: '', fetchMode: 'DIRECT', type: 'file', path }
      const xHwid = readXHwidFromHeader(v.header)
      if (xHwid) sub.xHwid = xHwid
      applyProxyProviderOverride(v, sub)
      out.push(sub)
    } else {
      const url = typeof v.url === 'string' ? v.url : ''
      if (!url) continue
      const sub: Subscription = { name, url, fetchMode: 'DIRECT' }
      if (typeof v.interval === 'number') sub.interval = v.interval
      if (typeof v.proxy === 'string' && v.proxy) {
        sub.fetchMode = 'PROXY'
        sub.fetchProxy = v.proxy
      }
      if (typeof v['skip-cert-verify'] === 'boolean') sub.skipCertVerify = v['skip-cert-verify']
      const xHwid = readXHwidFromHeader(v.header)
      if (xHwid) sub.xHwid = xHwid
      applyProxyProviderOverride(v, sub)
      out.push(sub)
    }
  }
  return out
}

function parseProxyGroups(proxyGroupsRaw: unknown): ProxyGroup[] {
  if (!Array.isArray(proxyGroupsRaw)) return []
  const out: ProxyGroup[] = []
  for (const g of proxyGroupsRaw) {
    if (!g || typeof g !== 'object') continue
    const o = g as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name : ''
    const type = (typeof o.type === 'string' ? o.type : 'select') as ProxyGroup['type']
    if (!name) continue
    const proxies: string[] = Array.isArray(o.proxies)
      ? o.proxies.filter((x): x is string => typeof x === 'string')
      : []
    const manual: string[] = Array.isArray(o.manual)
      ? o.manual.filter((x): x is string => typeof x === 'string')
      : []
    const useSubs: string[] = Array.isArray(o.use)
      ? o.use.filter((x): x is string => typeof x === 'string')
      : []
    const icon = typeof o.icon === 'string' ? o.icon : undefined
    out.push({ name, type, proxies, manual, useSubs: useSubs.length ? useSubs : undefined, icon })
  }
  return out
}

function parseRuleProviders(ruleProvidersRaw: unknown): RuleProvider[] {
  if (!ruleProvidersRaw || typeof ruleProvidersRaw !== 'object') return []
  const out: RuleProvider[] = []
  for (const [name, val] of Object.entries(ruleProvidersRaw)) {
    if (!val || typeof val !== 'object') continue
    const v = val as Record<string, unknown>
    const url = typeof v.url === 'string' ? v.url : ''
    if (!url) continue
    const rp: RuleProvider = { name, url }
    if (typeof v.type === 'string') rp.type = v.type as RuleProvider['type']
    if (typeof v.path === 'string') rp.path = v.path
    if (typeof v.interval === 'number') rp.interval = v.interval
    if (typeof v.proxy === 'string') rp.proxy = v.proxy
    if (typeof v.behavior === 'string') rp.behavior = v.behavior as RuleProvider['behavior']
    if (typeof v.format === 'string') rp.format = v.format as RuleProvider['format']
    out.push(rp)
  }
  return out
}

function parseRuleLine(line: string): RuleEntry | ManualRule | { kind: 'MATCH'; policy: string } | null {
  const s = line.trim()
  if (!s) return null
  const parts = s.split(',')
  if (parts.length < 2) return null
  const first = parts[0].trim()
  if (first === 'GEOSITE') {
    const key = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!key) return null
    return { kind: 'GEOSITE', key, policy }
  }
  if (first === 'GEOIP') {
    const key = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!key) return null
    return { kind: 'GEOIP', key, policy }
  }
  if (first === 'RULE-SET') {
    const key = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!key) return null
    return { kind: 'RULE-SET', key, policy }
  }
  if (first === 'MATCH') {
    const policy = parts[1]?.trim() ?? 'DIRECT'
    return { kind: 'MATCH', policy }
  }
  if (MANUAL_RULE_TYPES.includes(first as ManualRuleType)) {
    const value = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!value) return null
    return { type: first as ManualRuleType, value, policy }
  }
  const policy = parts[parts.length - 1]?.trim() ?? 'DIRECT'
  const key = parts.slice(0, -1).join(',').trim()
  if (!key) return null
  return { kind: 'MANUAL', key: s, policy }
}

function matchStateFromPolicy(policy: string, groupNames: string[]): MatchState {
  if (policy === 'DIRECT' || policy === 'REJECT')
    return { mode: 'builtin', value: policy }
  if (groupNames.includes(policy))
    return { mode: 'group', value: policy }
  return { mode: 'auto', value: '' }
}

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  mode: 'rule',
  allowLan: false,
  ipv6: false,
  logLevel: 'info',
  unifiedDelay: true,
  tcpConcurrent: false,
}

function parseGeneralSettings(root: Record<string, unknown>): GeneralSettings {
  const g: GeneralSettings = {
    mode: (typeof root.mode === 'string' && ['rule', 'global', 'direct'].includes(root.mode))
      ? root.mode as GeneralSettings['mode']
      : 'rule',
    allowLan: typeof root['allow-lan'] === 'boolean' ? root['allow-lan'] : false,
    ipv6: typeof root.ipv6 === 'boolean' ? root.ipv6 : false,
    logLevel: (typeof root['log-level'] === 'string' && ['silent', 'error', 'warning', 'info', 'debug'].includes(root['log-level']))
      ? root['log-level'] as GeneralSettings['logLevel']
      : 'info',
    unifiedDelay: typeof root['unified-delay'] === 'boolean' ? root['unified-delay'] : true,
    tcpConcurrent: typeof root['tcp-concurrent'] === 'boolean' ? root['tcp-concurrent'] : false,
  }
  if (typeof root['mixed-port'] === 'number') g.mixedPort = root['mixed-port']
  if (typeof root.port === 'number') g.port = root.port
  if (typeof root['socks-port'] === 'number') g.socksPort = root['socks-port']
  if (typeof root['redir-port'] === 'number') g.redirPort = root['redir-port']
  if (typeof root['tproxy-port'] === 'number') g.tproxyPort = root['tproxy-port']
  if (typeof root['bind-address'] === 'string') g.bindAddress = root['bind-address']
  if (typeof root['find-process-mode'] === 'string') g.findProcessMode = root['find-process-mode'] as GeneralSettings['findProcessMode']
  if (typeof root['global-client-fingerprint'] === 'string') g.globalClientFingerprint = root['global-client-fingerprint']
  return g
}

function parseGeneralSettingsFromMeta(
  root: Record<string, unknown>,
  generalFields: FormMetaField[]
): GeneralSettings {
  const parsed = parseYamlToStateFields(generalFields, root)
  return { ...DEFAULT_GENERAL_SETTINGS, ...parsed } as GeneralSettings
}

function parseExternalSettings(root: Record<string, unknown>): ExternalSettings {
  const e: ExternalSettings = {}
  if (typeof root['external-controller'] === 'string') e.externalController = root['external-controller']
  if (typeof root.secret === 'string') e.secret = root.secret
  if (typeof root['external-controller-unix'] === 'string') e.externalControllerUnix = root['external-controller-unix']
  if (typeof root['external-controller-pipe'] === 'string') e.externalControllerPipe = root['external-controller-pipe']
  if (typeof root['external-controller-tls'] === 'string') e.externalControllerTls = root['external-controller-tls']
  if (typeof root['external-doh-server'] === 'string') e.externalDohServer = root['external-doh-server']
  const cors = root['external-controller-cors']
  if (cors != null && typeof cors === 'object') {
    const c = cors as Record<string, unknown>
    if (Array.isArray(c['allow-origins'])) {
      e.externalControllerCorsAllowOrigins = (c['allow-origins'] as unknown[]).filter((x): x is string => typeof x === 'string')
    }
    if (typeof c['allow-private-network'] === 'boolean') {
      e.externalControllerCorsAllowPrivateNetwork = c['allow-private-network']
    }
  }
  return e
}

function parseExternalSettingsFromMeta(
  root: Record<string, unknown>,
  externalFields: FormMetaField[]
): ExternalSettings {
  const parsed = parseYamlToStateFields(externalFields, root)
  return { ...parsed } as ExternalSettings
}

const DEFAULT_DNS_SETTINGS: DnsSettings = {
  enable: false,
  enhancedMode: 'fake-ip',
  fakeIpFilter: [],
  ipv6: false,
  useHosts: true,
  useSystemHosts: true,
  defaultNameserver: [],
  nameserver: [],
  fallback: [],
  nameserverPolicy: [],
  proxyServerNameserver: [],
  directNameserver: [],
  proxyServerNameserverPolicy: [],
}

function parseDnsSettings(dnsRaw: unknown): DnsSettings {
  const d: DnsSettings = {
    enable: true,
    enhancedMode: 'redir-host',
    fakeIpFilter: [],
    ipv6: false,
    useHosts: true,
    useSystemHosts: true,
    defaultNameserver: [],
    nameserver: [],
    fallback: [],
    nameserverPolicy: [],
    proxyServerNameserver: [],
    directNameserver: [],
    proxyServerNameserverPolicy: [],
  }
  if (!dnsRaw || typeof dnsRaw !== 'object') return d
  const o = dnsRaw as Record<string, unknown>
  if (typeof o.enable === 'boolean') d.enable = o.enable
  if (typeof o.listen === 'string') d.listen = o.listen
  if (typeof o['enhanced-mode'] === 'string' && (o['enhanced-mode'] === 'fake-ip' || o['enhanced-mode'] === 'redir-host'))
    d.enhancedMode = o['enhanced-mode']
  if (typeof o['fake-ip-range'] === 'string') d.fakeIpRange = o['fake-ip-range']
  if (typeof o['fake-ip-filter-mode'] === 'string') d.fakeIpFilterMode = o['fake-ip-filter-mode'] as DnsSettings['fakeIpFilterMode']
  if (Array.isArray(o['fake-ip-filter'])) d.fakeIpFilter = o['fake-ip-filter'].filter((x): x is string => typeof x === 'string')
  if (typeof o.ipv6 === 'boolean') d.ipv6 = o.ipv6
  if (typeof o['use-hosts'] === 'boolean') d.useHosts = o['use-hosts']
  if (typeof o['use-system-hosts'] === 'boolean') d.useSystemHosts = o['use-system-hosts']
  if (typeof o['cache-algorithm'] === 'string') d.cacheAlgorithm = o['cache-algorithm'] as 'arc' | 'lru'
  if (Array.isArray(o['default-nameserver'])) d.defaultNameserver = o['default-nameserver'].filter((x): x is string => typeof x === 'string')
  if (Array.isArray(o.nameserver)) d.nameserver = o.nameserver.filter((x): x is string => typeof x === 'string')
  if (Array.isArray(o.fallback)) d.fallback = o.fallback.filter((x): x is string => typeof x === 'string')
  if (typeof o['ipv6-timeout'] === 'number') d.ipv6Timeout = o['ipv6-timeout']
  if (typeof o['fake-ip-range6'] === 'string') d.fakeIpRange6 = o['fake-ip-range6']
  if (typeof o['fake-ip-ttl'] === 'number') d.fakeIpTtl = o['fake-ip-ttl']
  if (Array.isArray(o['direct-nameserver'])) d.directNameserver = o['direct-nameserver'].filter((x): x is string => typeof x === 'string')
  if (typeof o['direct-nameserver-follow-policy'] === 'boolean') d.directNameserverFollowPolicy = o['direct-nameserver-follow-policy']
  if (o['fallback-filter'] && typeof o['fallback-filter'] === 'object') {
    const ff = o['fallback-filter'] as Record<string, unknown>
    d.fallbackFilter = {
      geoip: typeof ff.geoip === 'boolean' ? ff.geoip : false,
      geoipCode: typeof ff['geoip-code'] === 'string' ? ff['geoip-code'] : undefined,
      geosite: Array.isArray(ff.geosite) ? ff.geosite.filter((x): x is string => typeof x === 'string') : undefined,
      ipcidr: Array.isArray(ff.ipcidr) ? ff.ipcidr.filter((x): x is string => typeof x === 'string') : undefined,
      domain: Array.isArray(ff.domain) ? ff.domain.filter((x): x is string => typeof x === 'string') : undefined,
    }
  }
  if (o['nameserver-policy'] && typeof o['nameserver-policy'] === 'object') {
    const np = o['nameserver-policy'] as Record<string, unknown>
    for (const [pattern, val] of Object.entries(np)) {
      const servers = Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : (typeof val === 'string' ? [val] : [])
      if (servers.length) (d.nameserverPolicy ??= []).push({ pattern, servers })
    }
  }
  if (Array.isArray(o['proxy-server-nameserver'])) d.proxyServerNameserver = o['proxy-server-nameserver'].filter((x): x is string => typeof x === 'string')
  if (o['proxy-server-nameserver-policy'] && typeof o['proxy-server-nameserver-policy'] === 'object') {
    const pnp = o['proxy-server-nameserver-policy'] as Record<string, unknown>
    for (const [pattern, val] of Object.entries(pnp)) {
      const servers = Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : (typeof val === 'string' ? [val] : [])
      if (servers.length) (d.proxyServerNameserverPolicy ??= []).push({ pattern, servers })
    }
  }
  return d
}

function parseDnsSettingsFromMeta(
  dnsRaw: unknown,
  dnsFields: FormMetaField[]
): DnsSettings {
  if (!dnsRaw || typeof dnsRaw !== 'object') return DEFAULT_DNS_SETTINGS
  const o = dnsRaw as Record<string, unknown>
  const simpleFields = dnsFields.filter(
    (f) => f.key !== 'fallback_filter' && f.key !== 'nameserver_policy' && f.key !== 'proxy_server_nameserver_policy'
  )
  const parsed = parseYamlToStateFields(simpleFields, o)
  const d: DnsSettings = { ...DEFAULT_DNS_SETTINGS, ...parsed } as DnsSettings
  if (o['fallback-filter'] && typeof o['fallback-filter'] === 'object') {
    const ff = o['fallback-filter'] as Record<string, unknown>
    d.fallbackFilter = {
      geoip: typeof ff.geoip === 'boolean' ? ff.geoip : false,
      geoipCode: typeof ff['geoip-code'] === 'string' ? ff['geoip-code'] : undefined,
      geosite: Array.isArray(ff.geosite) ? ff.geosite.filter((x): x is string => typeof x === 'string') : undefined,
      ipcidr: Array.isArray(ff.ipcidr) ? ff.ipcidr.filter((x): x is string => typeof x === 'string') : undefined,
      domain: Array.isArray(ff.domain) ? ff.domain.filter((x): x is string => typeof x === 'string') : undefined,
    }
  }
  if (o['nameserver-policy'] && typeof o['nameserver-policy'] === 'object') {
    const np = o['nameserver-policy'] as Record<string, unknown>
    for (const [pattern, val] of Object.entries(np)) {
      const servers = Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : (typeof val === 'string' ? [val] : [])
      if (servers.length) (d.nameserverPolicy ??= []).push({ pattern, servers })
    }
  }
  if (o['proxy-server-nameserver-policy'] && typeof o['proxy-server-nameserver-policy'] === 'object') {
    const pnp = o['proxy-server-nameserver-policy'] as Record<string, unknown>
    for (const [pattern, val] of Object.entries(pnp)) {
      const servers = Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : (typeof val === 'string' ? [val] : [])
      if (servers.length) (d.proxyServerNameserverPolicy ??= []).push({ pattern, servers })
    }
  }
  return d
}

function parseListeners(listenersRaw: unknown): Listener[] {
  if (!Array.isArray(listenersRaw)) return []
  const out: Listener[] = []
  for (const item of listenersRaw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name : ''
    const type = (typeof o.type === 'string' && LISTENER_TYPES.includes(o.type as ListenerType)) ? o.type as ListenerType : 'mixed'
    const port = typeof o.port === 'number' ? o.port : 0
    const listen = typeof o.listen === 'string' ? o.listen : '0.0.0.0'
    if (!name) continue
    const l: Listener = { name, type, port, listen }
    if (typeof o.udp === 'boolean') l.udp = o.udp
    if (typeof o.rule === 'string') l.rule = o.rule
    if (typeof o.proxy === 'string') l.proxy = o.proxy
    const knownKeys = new Set(['name', 'type', 'port', 'listen', 'udp', 'rule', 'proxy'])
    const extra: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      if (knownKeys.has(k) || v == null) continue
      extra[k] = v
    }
    if (Object.keys(extra).length) l.extraFields = extra
    out.push(l)
  }
  return out
}

function parseTunnels(tunnelsRaw: unknown): TunnelEntry[] {
  if (!Array.isArray(tunnelsRaw)) return []
  const out: TunnelEntry[] = []
  for (const item of tunnelsRaw) {
    if (typeof item === 'string') {
      out.push(item)
      continue
    }
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const network = Array.isArray(o.network) ? (o.network as unknown[]).filter((x): x is string => typeof x === 'string') : []
    const address = typeof o.address === 'string' ? o.address : ''
    const target = typeof o.target === 'string' ? o.target : ''
    const proxy = typeof o.proxy === 'string' ? o.proxy : ''
    out.push({ network, address, target, proxy } as TunnelEntryObject)
  }
  return out
}

function parseGeoSettingsFromRoot(root: Record<string, unknown>, geoFields?: FormMetaField[]): GeoSettings {
  const geo: GeoSettings = {}
  if (geoFields?.length) {
    const parsed = parseYamlToStateFields(geoFields, root)
    Object.assign(geo, parsed)
  } else {
    if (typeof root['geodata-mode'] === 'boolean') geo.geodataMode = root['geodata-mode']
    const geox = root['geox-url']
    if (geox && typeof geox === 'object') {
      const g = geox as Record<string, unknown>
      if (typeof g.geoip === 'string') geo.geoipUrl = g.geoip
      if (typeof g.geosite === 'string') geo.geositeUrl = g.geosite
      if (typeof g.mmdb === 'string') geo.mmdbUrl = g.mmdb
      if (typeof g.asn === 'string') geo.asnUrl = g.asn
    }
    if (typeof root['geo-auto-update'] === 'boolean') geo.geoAutoUpdate = root['geo-auto-update']
    if (typeof root['geo-update-interval'] === 'number') geo.geoUpdateInterval = root['geo-update-interval']
    if (typeof root['geosite-matcher'] === 'string') geo.geositeMatcher = root['geosite-matcher'] as GeoSettings['geositeMatcher']
  }
  return geo
}

function parseSnifferSettings(snifferRaw: unknown, snifferFields?: FormMetaField[]): SnifferSettings {
  const d: SnifferSettings = { enable: false, overrideDestination: false }
  if (!snifferRaw || typeof snifferRaw !== 'object') return d
  const o = snifferRaw as Record<string, unknown>
  if (snifferFields?.length) {
    const parsed = parseYamlToStateFields(snifferFields, o)
    Object.assign(d, parsed)
  } else {
    if (typeof o.enable === 'boolean') d.enable = o.enable
    if (typeof o['force-dns-mapping'] === 'boolean') d.forceDnsMapping = o['force-dns-mapping']
    if (typeof o['parse-pure-ip'] === 'boolean') d.parsePureIp = o['parse-pure-ip']
    if (typeof o['override-destination'] === 'boolean') d.overrideDestination = o['override-destination']
    if (Array.isArray(o['force-domain'])) d.forceDomain = (o['force-domain'] as unknown[]).filter((x): x is string => typeof x === 'string')
    if (Array.isArray(o['skip-src-address'])) d.skipSrcAddress = (o['skip-src-address'] as unknown[]).filter((x): x is string => typeof x === 'string')
    if (Array.isArray(o['skip-dst-address'])) d.skipDstAddress = (o['skip-dst-address'] as unknown[]).filter((x): x is string => typeof x === 'string')
    if (Array.isArray(o['skip-domain'])) d.skipDomain = (o['skip-domain'] as unknown[]).filter((x): x is string => typeof x === 'string')
  }

  // Parse nested sniff protocols (not covered by flat form-meta fields).
  const sniffRaw = o.sniff
  if (sniffRaw && typeof sniffRaw === 'object' && !Array.isArray(sniffRaw)) {
    const sniffObj = sniffRaw as Record<string, unknown>
    const order = ['HTTP', 'TLS', 'QUIC'] as const
    const sniffOut: NonNullable<SnifferSettings['sniff']> = {}
    let any = false

    for (const proto of order) {
      if (!(proto in sniffObj)) continue
      any = true
      const protoRaw = sniffObj[proto]
      const cfg: NonNullable<SnifferSettings['sniff']>[typeof proto] = {}

      if (protoRaw && typeof protoRaw === 'object' && !Array.isArray(protoRaw)) {
        const po = protoRaw as Record<string, unknown>
        if (Array.isArray(po.ports)) {
          const ports = (po.ports as unknown[])
            .map((x) => {
              if (typeof x === 'number' && Number.isFinite(x)) return x
              if (typeof x === 'string') {
                const s = x.trim()
                return s ? s : null
              }
              return null
            })
            .filter((x): x is string | number => x !== null)
          if (ports.length) cfg.ports = ports
        }
        if (typeof po['override-destination'] === 'boolean') cfg.overrideDestination = po['override-destination']
      }

      sniffOut[proto] = cfg
    }

    if (any) d.sniff = sniffOut
  }

  // Deprecated fields (still may appear in configs)
  if (d.sniffing == null && Array.isArray(o.sniffing)) {
    const list = (o.sniffing as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
    if (list.length) d.sniffing = list
  }
  if (d.portWhitelist == null && Array.isArray(o['port-whitelist'])) {
    const list = (o['port-whitelist'] as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    if (list.length) d.portWhitelist = list
  }

  return d
}

function parseTlsSettings(tlsRaw: unknown, tlsFields?: FormMetaField[]): TlsSettings {
  const t: TlsSettings = {}
  if (!tlsRaw || typeof tlsRaw !== 'object') return t
  const o = tlsRaw as Record<string, unknown>
  if (tlsFields?.length) {
    const parsed = parseYamlToStateFields(tlsFields, o)
    Object.assign(t, parsed)
  } else {
    if (typeof o.certificate === 'string') t.certificate = o.certificate
    if (typeof o['private-key'] === 'string') t.privateKey = o['private-key']
    if (typeof o['client-auth-type'] === 'string') t.clientAuthType = o['client-auth-type'] as TlsSettings['clientAuthType']
    if (typeof o['client-auth-cert'] === 'string') t.clientAuthCert = o['client-auth-cert']
  }
  return t
}

/**
 * Parse Mihomo/Clash YAML config string into partial MihomoState.
 * Does not restore linksRaw (proxies are already parsed).
 * When options.formMeta is provided, general and dns sections are parsed via form-meta mapping.
 */
export function parseYamlToState(
  yamlString: string,
  options?: { formMeta?: ParseYamlFormMeta }
): ParseYamlResult {
  const errors: string[] = []
  const state: ParseYamlResult['state'] = {}

  let doc: unknown
  try {
    doc = yamlParse(yamlString, { strict: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(msg)
    return { state: {}, errors }
  }

  if (!doc || typeof doc !== 'object') {
    errors.push('YAML is empty or not an object')
    return { state: {}, errors }
  }

  const root = doc as Record<string, unknown>

  if (root.proxies != null) {
    state.proxies = parseProxies(root.proxies)
  }

  if (root['proxy-providers'] != null) {
    state.subs = parseProxyProviders(root['proxy-providers'])
  }

  if (root['proxy-groups'] != null) {
    state.groups = parseProxyGroups(root['proxy-groups'])
  }

  const hasGeneral = ['mode', 'mixed-port', 'allow-lan', 'bind-address', 'log-level'].some(
    (k) => root[k] != null
  )
  if (hasGeneral) {
    state.generalSettings =
      options?.formMeta?.general?.fields?.length
        ? parseGeneralSettingsFromMeta(root, options.formMeta.general.fields)
        : parseGeneralSettings(root)
    state.useGeneralSettings = true
  }

  const hasExternal = ['external-controller', 'secret', 'external-controller-unix', 'external-controller-pipe', 'external-controller-tls', 'external-doh-server', 'external-controller-cors'].some(
    (k) => root[k] != null
  )
  if (hasExternal) {
    state.externalSettings =
      options?.formMeta?.external?.fields?.length
        ? parseExternalSettingsFromMeta(root, options.formMeta.external.fields)
        : parseExternalSettings(root)
    state.useExternalSettings = true
  }

  if (root.dns != null) {
    state.dnsSettings =
      options?.formMeta?.dns?.fields?.length
        ? parseDnsSettingsFromMeta(root.dns, options.formMeta.dns.fields)
        : parseDnsSettings(root.dns)
    state.useDnsSettings = true
  }

  if (root.listeners != null && Array.isArray(root.listeners)) {
    state.listeners = parseListeners(root.listeners)
    state.useListeners = true
  }

  if (root.tunnels != null && Array.isArray(root.tunnels)) {
    state.tunnels = parseTunnels(root.tunnels)
    state.useTunnels = true
  }

  const hasGeo = root['geodata-mode'] != null || root['geox-url'] != null || root['geo-auto-update'] != null || root['geo-update-interval'] != null || root['geosite-matcher'] != null
  if (hasGeo) {
    state.geoSettings = parseGeoSettingsFromRoot(root, options?.formMeta?.geo?.fields)
    state.useGeoSettings = true
  }

  if (root.sniffer != null) {
    state.snifferSettings = parseSnifferSettings(root.sniffer, options?.formMeta?.sniffer?.fields)
    state.useSnifferSettings = true
  }

  if (root.tls != null) {
    state.tlsSettings = parseTlsSettings(root.tls, options?.formMeta?.tls?.fields)
    state.useTlsSettings = true
  }

  const groupNames = (state.groups ?? []).map((g) => g.name)

  if (root['rule-providers'] != null) {
    state.ruleProviders = parseRuleProviders(root['rule-providers'])
  }

  if (root['sub-rules'] != null && typeof root['sub-rules'] === 'object' && !Array.isArray(root['sub-rules'])) {
    const raw = root['sub-rules'] as Record<string, unknown>
    const subRules: Record<string, string[]> = {}
    for (const [key, val] of Object.entries(raw)) {
      if (Array.isArray(val) && val.every((v) => typeof v === 'string')) {
        subRules[key] = val as string[]
      }
    }
    if (Object.keys(subRules).length > 0) state.subRules = subRules
  }

  if (root.rules != null && Array.isArray(root.rules)) {
    const rules = root.rules as string[]
    const rulesGeosite = new Map<string, { action: string; target: string }>()
    const rulesGeoip = new Map<string, { action: string; target: string }>()
    const manualRules: ManualRule[] = []
    const ruleOrder: RuleEntry[] = []
    let matchPolicy = 'DIRECT'

    for (const line of rules) {
      if (typeof line !== 'string') continue
      const entry = parseRuleLine(line)
      if (!entry) continue

      if ('kind' in entry) {
        if (entry.kind === 'MATCH') {
          matchPolicy = entry.policy
          ruleOrder.push({ kind: 'MATCH', key: 'MATCH', policy: entry.policy })
          continue
        }
        if (entry.kind === 'GEOSITE') {
          rulesGeosite.set(entry.key, {
            action: entry.policy === 'REJECT' ? 'BLOCK' : 'PROXY',
            target: entry.policy,
          })
          ruleOrder.push(entry)
          continue
        }
        if (entry.kind === 'GEOIP') {
          rulesGeoip.set(entry.key, {
            action: entry.policy === 'REJECT' ? 'BLOCK' : 'PROXY',
            target: entry.policy,
          })
          ruleOrder.push(entry)
          continue
        }
        if (entry.kind === 'RULE-SET') {
          const rp = state.ruleProviders?.find((x) => x.name === entry.key)
          if (rp) rp.policy = entry.policy
          ruleOrder.push(entry)
          continue
        }
        ruleOrder.push(entry)
        continue
      }

      manualRules.push(entry)
      ruleOrder.push({
        kind: 'MANUAL',
        key: `${entry.type},${entry.value}`,
        policy: entry.policy,
      })
    }

    state.rulesGeosite = rulesGeosite
    state.rulesGeoip = rulesGeoip
    state.manualRules = manualRules
    state.ruleOrder = ruleOrder
    state.match = matchStateFromPolicy(matchPolicy, groupNames)

    for (const rp of state.ruleProviders ?? []) {
      if (rp.policy) continue
      const last = ruleOrder.filter((e) => e.kind === 'RULE-SET' && e.key === rp.name).pop()
      if (last) rp.policy = last.policy
    }
  }

  return { state, errors }
}
