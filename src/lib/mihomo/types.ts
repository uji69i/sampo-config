/**
 * Mihomo config and generator state types.
 * Config-section interfaces (GeneralSettings, DnsSettings, ProxyGroup, Listener, etc.)
 * are generated from form-meta; see packages/shared/src/lib/mihomo/generated/config-types.ts
 * and scripts/build-mihomo-types.ts.
 */

import type {
  GeneralSettings,
  ExternalSettings,
  DnsSettings,
  GeoSettings,
  SnifferSettings,
  TlsSettings,
  ProxyGroup,
  Subscription,
  RuleProvider,
  Listener,
} from './generated/config-types'

export type {
  GeneralSettings,
  ExternalSettings,
  DnsSettings,
  GeoSettings,
  SnifferSettings,
  TlsSettings,
  ProxyGroupType,
  ProxyGroup,
  Subscription,
  RuleProvider,
  ListenerType,
  Listener,
} from './generated/config-types'

/**
 * Proxy object as produced by the link parser (VLESS, VMess, Shadowsocks, Trojan, etc.)
 * and consumed by `buildFullConfig` when generating the `proxies:` YAML block.
 *
 * Typed fields cover the most common parameters shared across proxy types.
 * The `[key: string]: unknown` index signature at the end allows each proxy type
 * to carry additional type-specific fields (e.g. `reality-opts`, `ws-opts`) without
 * requiring this interface to enumerate every sub-type variant.  The index signature
 * also lets `yaml-gen` spread the entire object directly into the YAML output.
 *
 * @remarks Because of the index signature, `keyof MihomoProxy` includes `string`,
 * so code that needs to read a _specific_ field should prefer the named property rather
 * than a dynamic key lookup.
 */
export interface MihomoProxy {
  name?: string
  type: string
  server: string
  port?: number
  uuid?: string
  password?: string
  cipher?: string
  alterId?: number
  network?: string
  flow?: string
  servername?: string
  'client-fingerprint'?: string
  sni?: string
  auth_str?: string
  auth?: string
  token?: string
  protocol?: string
  obfs?: string
  'protocol-param'?: string
  'obfs-param'?: string
  encryption?: string
  tls?: boolean
  udp?: boolean
  insecure?: boolean
  'skip-cert-verify'?: boolean
  'up-mbps'?: number
  'down-mbps'?: number
  alpn?: string[]
  seed?: string
  header?: string
  plugin?: string
  'plugin-opts'?: Record<string, string>
  'ws-opts'?: { path?: string; headers?: Record<string, string> }
  'reality-opts'?: Record<string, string>
  'grpc-opts'?: Record<string, string>
  'h2-opts'?: { path?: string; host?: string | string[] }
  'http-opts'?: { path?: string | string[]; headers?: Record<string, string | string[]> }
  'kcp-opts'?: { seed?: string; header?: { type: string } }
  'tcp-opts'?: { header?: { type: string } }
  [key: string]: unknown
}

/** Rule-provider entry inside a service template (loaded from JSON) */
export interface ServiceTemplateRuleProvider {
  name: string
  behavior: string
  format: string
  url: string
}

/**
 * Service template: pre-defined rule-providers + rule pattern for one service (Telegram, YouTube, etc.).
 * Loaded from public/data/service-templates.json. {policy} in rulePattern is replaced with selected policy.
 */
export interface ServiceTemplate {
  id: string
  name: string
  icon?: string
  ruleProviders: ServiceTemplateRuleProvider[]
  rulePattern: string
}

export type ManualRuleType =
  | 'DOMAIN'
  | 'DOMAIN-SUFFIX'
  | 'DOMAIN-KEYWORD'
  | 'IP-CIDR'
  | 'IP-ASN'
  | 'PROCESS-NAME'
  | 'PROCESS-PATH'
  | 'IN-NAME'
  | 'IN-PORT'
  | 'IN-TYPE'
  | 'IN-USER'

export interface ManualRule {
  type: ManualRuleType
  value: string
  policy: string
}

export type RuleEntryKind =
  | 'GEOSITE'
  | 'GEOIP'
  | 'RULE-SET'
  | 'MANUAL'
  | 'MATCH'
  | 'TEMPLATE'

export interface RuleEntry {
  kind: RuleEntryKind
  key: string
  policy: string
  /** For MANUAL: full rule line key (e.g. "DOMAIN-SUFFIX,example.com") */
  pretty?: string
}

export type MatchMode = 'auto' | 'builtin' | 'group'

export interface MatchState {
  mode: MatchMode
  value: string
}

/** Sniffer protocol names and config (manual; not all form-meta sniffer fields use this shape) */
export type SniffProtocolName = 'HTTP' | 'TLS' | 'QUIC'

export interface SniffProtocolConfig {
  ports?: Array<string | number>
  overrideDestination?: boolean
}

export type SniffProtocols = Partial<Record<SniffProtocolName, SniffProtocolConfig>>

/**
 * Tunnel entry in expanded object form — maps to a full YAML object under `tunnels:`.
 * @example
 * ```yaml
 * tunnels:
 *   - network: [tcp, udp]
 *     address: 0.0.0.0:80
 *     target: google.com:80
 *     proxy: PROXY
 * ```
 */
export interface TunnelEntryObject {
  network: string[]
  address: string
  target: string
  proxy: string
}

/**
 * A single entry in the `tunnels:` YAML section.
 * Compact string or full object — see TunnelEntryObject.
 */
export type TunnelEntry = string | TunnelEntryObject

/**
 * Full state of the Mihomo config generator.
 * Flow: linksRaw → (BUILD_PROXIES) → proxies; subs/groups define proxy-groups;
 * rulesGeosite/rulesGeoip/ruleProviders/manualRules + enabledTemplates → rules; MATCH = default policy.
 */
export interface MihomoState {
  proxies: MihomoProxy[]
  extraProxies: MihomoProxy[]
  groups: ProxyGroup[]
  geosite: string[]
  geoip: string[]
  rulesGeosite: Map<string, { action: string; target: string }>
  rulesGeoip: Map<string, { action: string; target: string }>
  subs: Subscription[]
  match: MatchState
  ruleProviders: RuleProvider[]
  manualRules: ManualRule[]
  ruleOrder: RuleEntry[]
  subRules: Record<string, string[]>
  linksRaw: string
  advancedSubsYaml: string
  advancedGroupsYaml: string
  advancedRulesYaml: string
  useAdvancedSubsYaml: boolean
  useAdvancedGroupsYaml: boolean
  useAdvancedRulesYaml: boolean
  serviceTemplates: ServiceTemplate[]
  enabledTemplates: Map<string, string>
  generalSettings: GeneralSettings
  dnsSettings: DnsSettings
  listeners: Listener[]
  useGeneralSettings: boolean
  customGeneralYaml: string
  useDnsSettings: boolean
  advancedDnsYaml: string
  useAdvancedDnsYaml: boolean
  customDnsYaml: string
  advancedListenersYaml: string
  useAdvancedListenersYaml: boolean
  useListeners: boolean
  customListenersYaml: string
  tunnels: TunnelEntry[]
  useTunnels: boolean
  advancedTunnelsYaml: string
  useAdvancedTunnelsYaml: boolean
  customTunnelsYaml: string
  geoSettings: GeoSettings
  useGeoSettings: boolean
  customGeoYaml: string
  snifferSettings: SnifferSettings
  useSnifferSettings: boolean
  advancedSnifferYaml: string
  useAdvancedSnifferYaml: boolean
  customSnifferYaml: string
  tlsSettings: TlsSettings
  useTlsSettings: boolean
  advancedTlsYaml: string
  useAdvancedTlsYaml: boolean
  customTlsYaml: string
  advancedGeneralYaml: string
  useAdvancedGeneralYaml: boolean
  advancedExternalYaml: string
  useAdvancedExternalYaml: boolean
  advancedGeoYaml: string
  useAdvancedGeoYaml: boolean
  externalSettings: ExternalSettings
  useExternalSettings: boolean
  customExternalYaml: string
}
