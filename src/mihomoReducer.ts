import { parseMany } from '@/lib/mihomo/parser'
import {
  ensureAutoProxyGroup,
  resolveProxyNameConflicts,
  buildRuleEntriesArray,
} from '@/lib/mihomo/state-helpers'
import type {
  MihomoState,
  MihomoProxy,
  ProxyGroup,
  Subscription,
  RuleProvider,
  ManualRule,
  RuleEntry,
  MatchState,
  ServiceTemplate,
  GeneralSettings,
  ExternalSettings,
  DnsSettings,
  GeoSettings,
  SnifferSettings,
  TlsSettings,
  Listener,
  TunnelEntry,
} from '@/lib/mihomo/types'

const defaultGeneralSettings: GeneralSettings = {
  mode: 'rule',
  allowLan: false,
  ipv6: false,
  logLevel: 'info',
  unifiedDelay: true,
  tcpConcurrent: false,
}

const defaultExternalSettings: ExternalSettings = {}

const defaultDnsSettings: DnsSettings = {
  enable: false,
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

const defaultSnifferSettings: SnifferSettings = {
  enable: false,
  overrideDestination: false,
}

/** Initial state for the Mihomo config generator (no proxies, no rules). */
export function createInitialState(): MihomoState {
  return {
    proxies: [],
    extraProxies: [],
    groups: [],
    geosite: [],
    geoip: [],
    rulesGeosite: new Map(),
    rulesGeoip: new Map(),
    subs: [],
    match: { mode: 'auto', value: '' },
    ruleProviders: [],
    manualRules: [],
    ruleOrder: [],
    subRules: {},
    linksRaw: '',
    advancedSubsYaml: '',
    advancedGroupsYaml: '',
    advancedRulesYaml: '',
    useAdvancedSubsYaml: false,
    useAdvancedGroupsYaml: false,
    useAdvancedRulesYaml: false,
    serviceTemplates: [],
    enabledTemplates: new Map(),
    generalSettings: defaultGeneralSettings,
    dnsSettings: defaultDnsSettings,
    listeners: [],
    useGeneralSettings: false,
    customGeneralYaml: '',
    externalSettings: defaultExternalSettings,
    useExternalSettings: false,
    customExternalYaml: '',
    useDnsSettings: false,
    advancedDnsYaml: '',
    useAdvancedDnsYaml: false,
    customDnsYaml: '',
    advancedListenersYaml: '',
    useAdvancedListenersYaml: false,
    customListenersYaml: '',
    useListeners: false,
    tunnels: [],
    useTunnels: false,
    advancedTunnelsYaml: '',
    useAdvancedTunnelsYaml: false,
    customTunnelsYaml: '',
    geoSettings: { geodataMode: false },
    useGeoSettings: false,
    customGeoYaml: '',
    snifferSettings: defaultSnifferSettings,
    useSnifferSettings: false,
    advancedSnifferYaml: '',
    useAdvancedSnifferYaml: false,
    customSnifferYaml: '',
    tlsSettings: {},
    useTlsSettings: false,
    advancedTlsYaml: '',
    useAdvancedTlsYaml: false,
    customTlsYaml: '',
    advancedGeneralYaml: '',
    useAdvancedGeneralYaml: false,
    advancedExternalYaml: '',
    useAdvancedExternalYaml: false,
    advancedGeoYaml: '',
    useAdvancedGeoYaml: false,
  }
}

/** Actions: SET_LINKS_RAW/BUILD_PROXIES (input), ADD_SUB/ADD_GROUP (sources & groups), SET_*_POLICY/MOVE_RULE (rules), TOGGLE_TEMPLATE (service templates). */
export type MihomoAction =
  | { type: 'SET_LINKS_RAW'; payload: string }
  | { type: 'BUILD_PROXIES' }
  | { type: 'SET_SUBS'; payload: Subscription[] }
  | { type: 'ADD_SUB'; payload: Subscription }
  | { type: 'REMOVE_SUB'; payload: number }
  | { type: 'UPDATE_SUB'; payload: { index: number; sub: Partial<Subscription> } }
  | { type: 'SET_GROUPS'; payload: ProxyGroup[] }
  | { type: 'ADD_GROUP'; payload: ProxyGroup }
  | { type: 'UPDATE_GROUP'; payload: { index: number; group: Partial<ProxyGroup> } }
  | { type: 'REMOVE_GROUP'; payload: number }
  | { type: 'SET_GEOSITE'; payload: string[] }
  | { type: 'SET_GEOIP'; payload: string[] }
  | { type: 'SET_RULES_GEOSITE'; payload: Map<string, { action: string; target: string }> }
  | { type: 'SET_RULES_GEOIP'; payload: Map<string, { action: string; target: string }> }
  | { type: 'SET_GEOSITE_POLICY'; payload: { name: string; target: string } }
  | { type: 'SET_GEOIP_POLICY'; payload: { code: string; target: string } }
  | { type: 'SET_MATCH'; payload: MatchState }
  | { type: 'SET_RULE_PROVIDERS'; payload: RuleProvider[] }
  | { type: 'ADD_RULE_PROVIDER'; payload: RuleProvider }
  | { type: 'UPDATE_RULE_PROVIDER'; payload: { index: number; provider: RuleProvider } }
  | { type: 'REMOVE_RULE_PROVIDER'; payload: number }
  | { type: 'ADD_MANUAL_RULE'; payload: ManualRule }
  | { type: 'UPDATE_MANUAL_RULE'; payload: { index: number; rule: ManualRule } }
  | { type: 'REMOVE_MANUAL_RULE'; payload: number }
  | { type: 'SET_RULE_ORDER'; payload: RuleEntry[] }
  | { type: 'MOVE_RULE'; payload: { index: number; direction: 'up' | 'down' | 'top' | 'bottom' } }
  | { type: 'REBUILD_RULE_ORDER' }
  | { type: 'SET_ADVANCED_SUBS_YAML'; payload: string }
  | { type: 'SET_ADVANCED_GROUPS_YAML'; payload: string }
  | { type: 'SET_ADVANCED_RULES_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_SUBS'; payload: boolean }
  | { type: 'SET_USE_ADVANCED_GROUPS'; payload: boolean }
  | { type: 'SET_USE_ADVANCED_RULES'; payload: boolean }
  | { type: 'SET_SERVICE_TEMPLATES'; payload: ServiceTemplate[] }
  | { type: 'TOGGLE_TEMPLATE'; payload: { id: string; policy: string } }
  | { type: 'SET_TEMPLATE_POLICY'; payload: { id: string; policy: string } }
  | { type: 'SET_GENERAL_SETTINGS'; payload: Partial<GeneralSettings> }
  | { type: 'SET_USE_GENERAL_SETTINGS'; payload: boolean }
  | { type: 'SET_CUSTOM_GENERAL_YAML'; payload: string }
  | { type: 'SET_EXTERNAL_SETTINGS'; payload: Partial<ExternalSettings> }
  | { type: 'SET_USE_EXTERNAL_SETTINGS'; payload: boolean }
  | { type: 'SET_CUSTOM_EXTERNAL_YAML'; payload: string }
  | { type: 'SET_DNS_SETTINGS'; payload: Partial<DnsSettings> }
  | { type: 'SET_USE_DNS_SETTINGS'; payload: boolean }
  | { type: 'SET_ADVANCED_DNS_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_DNS'; payload: boolean }
  | { type: 'SET_CUSTOM_DNS_YAML'; payload: string }
  | { type: 'ADD_LISTENER'; payload: { listener: Listener; autoBind?: boolean } }
  | { type: 'UPDATE_LISTENER'; payload: { index: number; listener: Partial<Listener> } }
  | { type: 'REMOVE_LISTENER'; payload: number }
  | { type: 'SET_ADVANCED_LISTENERS_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_LISTENERS'; payload: boolean }
  | { type: 'SET_CUSTOM_LISTENERS_YAML'; payload: string }
  | { type: 'SET_USE_LISTENERS'; payload: boolean }
  | { type: 'SET_TUNNELS'; payload: TunnelEntry[] }
  | { type: 'ADD_TUNNEL'; payload: TunnelEntry }
  | { type: 'UPDATE_TUNNEL'; payload: { index: number; entry: TunnelEntry | Partial<TunnelEntry> } }
  | { type: 'REMOVE_TUNNEL'; payload: number }
  | { type: 'SET_ADVANCED_TUNNELS_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_TUNNELS'; payload: boolean }
  | { type: 'SET_CUSTOM_TUNNELS_YAML'; payload: string }
  | { type: 'SET_USE_TUNNELS'; payload: boolean }
  | { type: 'SET_GEO_SETTINGS'; payload: Partial<GeoSettings> }
  | { type: 'SET_USE_GEO_SETTINGS'; payload: boolean }
  | { type: 'SET_CUSTOM_GEO_YAML'; payload: string }
  | { type: 'SET_SNIFFER_SETTINGS'; payload: Partial<SnifferSettings> }
  | { type: 'SET_USE_SNIFFER_SETTINGS'; payload: boolean }
  | { type: 'SET_ADVANCED_SNIFFER_YAML'; payload: string }
  | { type: 'SET_CUSTOM_SNIFFER_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_SNIFFER'; payload: boolean }
  | { type: 'SET_TLS_SETTINGS'; payload: Partial<TlsSettings> }
  | { type: 'SET_USE_TLS_SETTINGS'; payload: boolean }
  | { type: 'SET_ADVANCED_TLS_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_TLS'; payload: boolean }
  | { type: 'SET_CUSTOM_TLS_YAML'; payload: string }
  | { type: 'SET_ADVANCED_GENERAL_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_GENERAL'; payload: boolean }
  | { type: 'SET_ADVANCED_EXTERNAL_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_EXTERNAL'; payload: boolean }
  | { type: 'SET_ADVANCED_GEO_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_GEO'; payload: boolean }
  | { type: 'SET_SUB_RULES'; payload: Record<string, string[]> }
  | { type: 'ADD_SUB_RULE_SET'; payload: { name: string; rules: string[] } }
  | { type: 'UPDATE_SUB_RULE_SET'; payload: { oldName?: string; name: string; rules: string[] } }
  | { type: 'REMOVE_SUB_RULE_SET'; payload: string }
  | { type: 'IMPORT_YAML'; payload: Partial<MihomoState> }
  | { type: 'IMPORT_SERIALIZED'; payload: Partial<MihomoState> }
  | { type: 'ADD_EXTRA_PROXIES'; payload: MihomoProxy[] }
  | { type: 'UPDATE_EXTRA_PROXY'; payload: { index: number; patch: Partial<MihomoProxy> } }
  | { type: 'REMOVE_EXTRA_PROXY'; payload: number }
  | { type: 'CLEAR_EXTRA_PROXIES' }

/**
 * Returns a shallow clone of a Map.  Required for reducer immutability: spreading
 * an object that contains a Map copies the *reference*, not the Map itself, so
 * the previous and next state would share the same Map instance and mutations
 * in the next state would silently corrupt the previous one.
 */
function cloneMap<K, V>(m: Map<K, V>): Map<K, V> {
  return new Map(m)
}

/**
 * Merges a partial state payload into the current state, returning a new
 * MihomoState object.  Map fields (rulesGeosite, rulesGeoip, enabledTemplates)
 * are shallow-cloned to preserve reducer immutability.
 *
 * Used by both IMPORT_YAML and IMPORT_SERIALIZED to avoid duplicating ~50 lines
 * of conditional spread logic.  The returned object is intentionally mutable so
 * callers can apply post-processing (re-parsing linksRaw, clearing extraProxies,
 * ensureAutoProxyGroup) before returning.
 */
function applyPartialState(state: MihomoState, p: Partial<MihomoState>): MihomoState {
  return {
    ...state,
    ...(p.linksRaw != null && { linksRaw: p.linksRaw }),
    ...(p.proxies != null && { proxies: p.proxies }),
    ...(p.extraProxies != null && { extraProxies: p.extraProxies }),
    ...(p.groups != null && { groups: p.groups }),
    ...(p.subs != null && { subs: p.subs }),
    ...(p.ruleProviders != null && { ruleProviders: p.ruleProviders }),
    ...(p.rulesGeosite != null && { rulesGeosite: cloneMap(p.rulesGeosite) }),
    ...(p.rulesGeoip != null && { rulesGeoip: cloneMap(p.rulesGeoip) }),
    ...(p.manualRules != null && { manualRules: p.manualRules }),
    ...(p.ruleOrder != null && { ruleOrder: p.ruleOrder }),
    ...(p.subRules != null && { subRules: p.subRules }),
    ...(p.match != null && { match: p.match }),
    ...(p.enabledTemplates != null && { enabledTemplates: cloneMap(p.enabledTemplates) }),
    ...(p.advancedSubsYaml != null && { advancedSubsYaml: p.advancedSubsYaml }),
    ...(p.advancedGroupsYaml != null && { advancedGroupsYaml: p.advancedGroupsYaml }),
    ...(p.advancedRulesYaml != null && { advancedRulesYaml: p.advancedRulesYaml }),
    ...(p.useAdvancedSubsYaml != null && { useAdvancedSubsYaml: p.useAdvancedSubsYaml }),
    ...(p.useAdvancedGroupsYaml != null && { useAdvancedGroupsYaml: p.useAdvancedGroupsYaml }),
    ...(p.generalSettings != null && { generalSettings: p.generalSettings }),
    ...(p.useGeneralSettings != null && { useGeneralSettings: p.useGeneralSettings }),
    ...(p.customGeneralYaml != null && { customGeneralYaml: p.customGeneralYaml }),
    ...(p.externalSettings != null && { externalSettings: p.externalSettings }),
    ...(p.useExternalSettings != null && { useExternalSettings: p.useExternalSettings }),
    ...(p.customExternalYaml != null && { customExternalYaml: p.customExternalYaml }),
    ...(p.dnsSettings != null && { dnsSettings: p.dnsSettings }),
    ...(p.useDnsSettings != null && { useDnsSettings: p.useDnsSettings }),
    ...(p.advancedDnsYaml != null && { advancedDnsYaml: p.advancedDnsYaml }),
    ...(p.useAdvancedDnsYaml != null && { useAdvancedDnsYaml: p.useAdvancedDnsYaml }),
    ...(p.customDnsYaml != null && { customDnsYaml: p.customDnsYaml }),
    ...(p.listeners != null && { listeners: p.listeners }),
    ...(p.useListeners != null && { useListeners: p.useListeners }),
    ...(p.advancedListenersYaml != null && { advancedListenersYaml: p.advancedListenersYaml }),
    ...(p.useAdvancedListenersYaml != null && { useAdvancedListenersYaml: p.useAdvancedListenersYaml }),
    ...(p.customListenersYaml != null && { customListenersYaml: p.customListenersYaml }),
    ...(p.tunnels != null && { tunnels: p.tunnels }),
    ...(p.useTunnels != null && { useTunnels: p.useTunnels }),
    ...(p.advancedTunnelsYaml != null && { advancedTunnelsYaml: p.advancedTunnelsYaml }),
    ...(p.useAdvancedTunnelsYaml != null && { useAdvancedTunnelsYaml: p.useAdvancedTunnelsYaml }),
    ...(p.customTunnelsYaml != null && { customTunnelsYaml: p.customTunnelsYaml }),
    ...(p.geoSettings != null && { geoSettings: p.geoSettings }),
    ...(p.useGeoSettings != null && { useGeoSettings: p.useGeoSettings }),
    ...(p.customGeoYaml != null && { customGeoYaml: p.customGeoYaml }),
    ...(p.snifferSettings != null && { snifferSettings: p.snifferSettings }),
    ...(p.useSnifferSettings != null && { useSnifferSettings: p.useSnifferSettings }),
    ...(p.advancedSnifferYaml != null && { advancedSnifferYaml: p.advancedSnifferYaml }),
    ...(p.useAdvancedSnifferYaml != null && { useAdvancedSnifferYaml: p.useAdvancedSnifferYaml }),
    ...(p.customSnifferYaml != null && { customSnifferYaml: p.customSnifferYaml }),
    ...(p.tlsSettings != null && { tlsSettings: p.tlsSettings }),
    ...(p.useTlsSettings != null && { useTlsSettings: p.useTlsSettings }),
    ...(p.advancedTlsYaml != null && { advancedTlsYaml: p.advancedTlsYaml }),
    ...(p.useAdvancedTlsYaml != null && { useAdvancedTlsYaml: p.useAdvancedTlsYaml }),
    ...(p.customTlsYaml != null && { customTlsYaml: p.customTlsYaml }),
    ...(p.advancedGeneralYaml != null && { advancedGeneralYaml: p.advancedGeneralYaml }),
    ...(p.useAdvancedGeneralYaml != null && { useAdvancedGeneralYaml: p.useAdvancedGeneralYaml }),
    ...(p.advancedExternalYaml != null && { advancedExternalYaml: p.advancedExternalYaml }),
    ...(p.useAdvancedExternalYaml != null && { useAdvancedExternalYaml: p.useAdvancedExternalYaml }),
    ...(p.advancedGeoYaml != null && { advancedGeoYaml: p.advancedGeoYaml }),
    ...(p.useAdvancedGeoYaml != null && { useAdvancedGeoYaml: p.useAdvancedGeoYaml }),
  }
}

/** Reducer: BUILD_PROXIES parses links and ensures auto group; REBUILD_RULE_ORDER merges new rules with user order; template actions update enabledTemplates. */
export function mihomoReducer(state: MihomoState, action: MihomoAction): MihomoState {
  switch (action.type) {
    case 'SET_LINKS_RAW':
      return { ...state, linksRaw: action.payload }
    case 'BUILD_PROXIES': {
      const { proxies: fromLinks } = parseMany(state.linksRaw, { collectErrors: true })
      const proxies = [...fromLinks, ...state.extraProxies]
      const groups = [...state.groups]
      resolveProxyNameConflicts(proxies, groups)
      const next: MihomoState = {
        ...state,
        proxies,
        groups,
      }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'ADD_EXTRA_PROXIES':
      return {
        ...state,
        extraProxies: [...state.extraProxies, ...action.payload],
      }
    case 'UPDATE_EXTRA_PROXY': {
      const { index, patch } = action.payload
      if (index < 0 || index >= state.extraProxies.length) return state
      const extraProxies = state.extraProxies.map((p, i) =>
        i === index ? { ...p, ...patch } : p
      )
      return { ...state, extraProxies }
    }
    case 'REMOVE_EXTRA_PROXY': {
      const index = action.payload
      if (index < 0 || index >= state.extraProxies.length) return state
      const extraProxies = state.extraProxies.filter((_, i) => i !== index)
      return { ...state, extraProxies }
    }
    case 'CLEAR_EXTRA_PROXIES':
      return { ...state, extraProxies: [] }
    case 'SET_SUBS':
      return { ...state, subs: action.payload }
    case 'ADD_SUB': {
      const subs = [...state.subs, action.payload]
      const next = { ...state, subs }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'REMOVE_SUB': {
      const subs = state.subs.filter((_, i) => i !== action.payload)
      const next = { ...state, subs }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'UPDATE_SUB': {
      const { index, sub } = action.payload
      const subs = state.subs.map((s, i) =>
        i === index ? { ...s, ...sub } : s
      )
      return { ...state, subs }
    }
    case 'SET_GROUPS':
      return { ...state, groups: action.payload }
    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, action.payload] }
    case 'UPDATE_GROUP': {
      const { index, group } = action.payload
      const groups = state.groups.map((g, i) =>
        i === index ? { ...g, ...group } : g
      )
      return { ...state, groups }
    }
    case 'REMOVE_GROUP': {
      const groups = state.groups.filter((_, i) => i !== action.payload)
      return { ...state, groups }
    }
    case 'SET_GEOSITE':
      return { ...state, geosite: action.payload }
    case 'SET_GEOIP':
      return { ...state, geoip: action.payload }
    case 'SET_RULES_GEOSITE':
      return { ...state, rulesGeosite: cloneMap(action.payload) }
    case 'SET_RULES_GEOIP':
      return { ...state, rulesGeoip: cloneMap(action.payload) }
    case 'SET_GEOSITE_POLICY': {
      const rulesGeosite = cloneMap(state.rulesGeosite)
      rulesGeosite.set(action.payload.name, {
        action: action.payload.target === 'REJECT' ? 'BLOCK' : 'PROXY',
        target: action.payload.target,
      })
      return { ...state, rulesGeosite }
    }
    case 'SET_GEOIP_POLICY': {
      const rulesGeoip = cloneMap(state.rulesGeoip)
      rulesGeoip.set(action.payload.code, {
        action: action.payload.target === 'REJECT' ? 'BLOCK' : 'PROXY',
        target: action.payload.target,
      })
      return { ...state, rulesGeoip }
    }
    case 'SET_MATCH':
      return { ...state, match: action.payload }
    case 'SET_RULE_PROVIDERS':
      return { ...state, ruleProviders: action.payload }
    case 'ADD_RULE_PROVIDER':
      return {
        ...state,
        ruleProviders: [...state.ruleProviders, action.payload],
      }
    case 'UPDATE_RULE_PROVIDER': {
      const { index, provider } = action.payload
      if (index < 0 || index >= state.ruleProviders.length) return state
      const ruleProviders = [...state.ruleProviders]
      ruleProviders[index] = provider
      return { ...state, ruleProviders }
    }
    case 'REMOVE_RULE_PROVIDER': {
      const ruleProviders = state.ruleProviders.filter(
        (_, i) => i !== action.payload
      )
      return { ...state, ruleProviders }
    }
    case 'ADD_MANUAL_RULE':
      return {
        ...state,
        manualRules: [...state.manualRules, action.payload],
      }
    case 'UPDATE_MANUAL_RULE': {
      const { index, rule } = action.payload
      if (index < 0 || index >= state.manualRules.length) return state
      const manualRules = [...state.manualRules]
      manualRules[index] = rule
      return { ...state, manualRules }
    }
    case 'REMOVE_MANUAL_RULE': {
      const manualRules = state.manualRules.filter(
        (_, i) => i !== action.payload
      )
      return { ...state, manualRules }
    }
    case 'SET_RULE_ORDER':
      return { ...state, ruleOrder: action.payload }
    case 'MOVE_RULE': {
      const { index, direction } = action.payload
      const entries = [...state.ruleOrder]
      const matchIdx = entries.findIndex((e) => e.kind === 'MATCH')
      const lastIdx = matchIdx >= 0 ? matchIdx : entries.length
      const movable = entries.filter((_, i) => i !== lastIdx)
      const matchEntry = matchIdx >= 0 ? entries[matchIdx] : null
      if (index < 0 || index >= movable.length) return state
      const from = index
      let to = from
      if (direction === 'up') to = Math.max(0, from - 1)
      else if (direction === 'down') to = Math.min(movable.length - 1, from + 1)
      else if (direction === 'top') to = 0
      else if (direction === 'bottom') to = movable.length - 1
      if (from === to) return state
      const [removed] = movable.splice(from, 1)
      movable.splice(to, 0, removed)
      const ruleOrder = matchEntry ? [...movable, matchEntry] : movable
      return { ...state, ruleOrder }
    }
    case 'REBUILD_RULE_ORDER': {
      const raw = buildRuleEntriesArray(state)
      const matchEntry = raw.find((e) => e.kind === 'MATCH') ?? null
      const nonMatch = raw.filter((e) => e.kind !== 'MATCH')
      const byKey = new Map(
        nonMatch.map((e) => [e.kind + ':' + e.key, e])
      )
      const prev = state.ruleOrder.filter((e) => e.kind !== 'MATCH')
      const next: RuleEntry[] = []
      for (const old of prev) {
        const key = old.kind + ':' + old.key
        const fresh = byKey.get(key)
        if (fresh) {
          next.push(fresh)
          byKey.delete(key)
        }
      }
      for (const e of byKey.values()) next.push(e)
      if (matchEntry) next.push(matchEntry)
      return { ...state, ruleOrder: next }
    }
    case 'SET_ADVANCED_SUBS_YAML':
      return { ...state, advancedSubsYaml: action.payload }
    case 'SET_ADVANCED_GROUPS_YAML':
      return { ...state, advancedGroupsYaml: action.payload }
    case 'SET_ADVANCED_RULES_YAML':
      return { ...state, advancedRulesYaml: action.payload }
    case 'SET_USE_ADVANCED_SUBS':
      return { ...state, useAdvancedSubsYaml: action.payload }
    case 'SET_USE_ADVANCED_GROUPS':
      return { ...state, useAdvancedGroupsYaml: action.payload }
    case 'SET_USE_ADVANCED_RULES':
      return { ...state, useAdvancedRulesYaml: action.payload }
    case 'SET_SERVICE_TEMPLATES':
      return { ...state, serviceTemplates: action.payload }
    case 'TOGGLE_TEMPLATE': {
      const { id, policy } = action.payload
      const enabled = new Map(state.enabledTemplates)
      if (enabled.has(id)) enabled.delete(id)
      else enabled.set(id, policy)
      return { ...state, enabledTemplates: enabled }
    }
    case 'SET_TEMPLATE_POLICY': {
      const { id, policy } = action.payload
      const enabled = new Map(state.enabledTemplates)
      if (enabled.has(id)) enabled.set(id, policy)
      return { ...state, enabledTemplates: enabled }
    }
    case 'SET_GENERAL_SETTINGS':
      return {
        ...state,
        generalSettings: { ...state.generalSettings, ...action.payload },
      }
    case 'SET_USE_GENERAL_SETTINGS':
      return { ...state, useGeneralSettings: action.payload }
    case 'SET_CUSTOM_GENERAL_YAML':
      return { ...state, customGeneralYaml: action.payload }
    case 'SET_EXTERNAL_SETTINGS':
      return {
        ...state,
        externalSettings: { ...state.externalSettings, ...action.payload },
      }
    case 'SET_USE_EXTERNAL_SETTINGS':
      return { ...state, useExternalSettings: action.payload }
    case 'SET_CUSTOM_EXTERNAL_YAML':
      return { ...state, customExternalYaml: action.payload }
    case 'SET_DNS_SETTINGS':
      return {
        ...state,
        dnsSettings: { ...state.dnsSettings, ...action.payload },
      }
    case 'SET_USE_DNS_SETTINGS':
      return { ...state, useDnsSettings: action.payload }
    case 'SET_ADVANCED_DNS_YAML':
      return { ...state, advancedDnsYaml: action.payload }
    case 'SET_USE_ADVANCED_DNS':
      return { ...state, useAdvancedDnsYaml: action.payload }
    case 'SET_CUSTOM_DNS_YAML':
      return { ...state, customDnsYaml: action.payload }
    case 'ADD_LISTENER': {
      const { listener } = action.payload
      const listeners = [...state.listeners, listener]
      const next = { ...state, listeners }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'UPDATE_LISTENER': {
      const { index, listener: patch } = action.payload
      if (index < 0 || index >= state.listeners.length) return state
      const oldListener = state.listeners[index]
      const newName = patch.name !== undefined ? patch.name : oldListener.name
      const oldName = oldListener.name
      const listeners = state.listeners.map((l, i) =>
        i === index ? { ...l, ...patch } : l
      )
      let groups = state.groups
      let manualRules = state.manualRules
      if (newName !== oldName) {
        // Cascade: rename any group whose name matches the old listener name.
        // This is intentional — ADD_LISTENER auto-creates a group with the same name,
        // so renaming the listener should rename that group too. If users have groups
        // with the same name independently, they will be renamed as well (by design).
        groups = state.groups.map((g) =>
          g.name === oldName ? { ...g, name: newName } : g
        )
        manualRules = state.manualRules.map((r) =>
          r.type === 'IN-NAME' && (r.value === oldName || r.policy === oldName)
            ? { ...r, value: newName, policy: newName }
            : r
        )
      }
      return { ...state, listeners, groups, manualRules }
    }
    case 'REMOVE_LISTENER': {
      const index = action.payload
      if (index < 0 || index >= state.listeners.length) return state
      const removedName = state.listeners[index].name
      const listeners = state.listeners.filter((_, i) => i !== index)
      const groups = state.groups.filter((g) => g.name !== removedName)
      const manualRules = state.manualRules.filter(
        (r) => !(r.type === 'IN-NAME' && r.value === removedName)
      )
      return { ...state, listeners, groups, manualRules }
    }
    case 'SET_ADVANCED_LISTENERS_YAML':
      return { ...state, advancedListenersYaml: action.payload }
    case 'SET_USE_ADVANCED_LISTENERS':
      return { ...state, useAdvancedListenersYaml: action.payload }
    case 'SET_CUSTOM_LISTENERS_YAML':
      return { ...state, customListenersYaml: action.payload }
    case 'SET_USE_LISTENERS':
      return { ...state, useListeners: action.payload }
    case 'SET_TUNNELS':
      return { ...state, tunnels: action.payload }
    case 'ADD_TUNNEL':
      return { ...state, tunnels: [...state.tunnels, action.payload] }
    case 'UPDATE_TUNNEL': {
      const { index, entry } = action.payload
      if (index < 0 || index >= state.tunnels.length) return state
      const current = state.tunnels[index]
      let nextEntry: TunnelEntry
      if (typeof entry === 'string') {
        nextEntry = entry
      } else if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
        const base = typeof current === 'object' && current !== null && !Array.isArray(current) ? current : { network: [], address: '', target: '', proxy: '' }
        nextEntry = { ...base, ...entry }
      } else {
        return state
      }
      const tunnels = state.tunnels.map((t, i) => (i === index ? nextEntry : t))
      return { ...state, tunnels }
    }
    case 'REMOVE_TUNNEL': {
      const index = action.payload
      if (index < 0 || index >= state.tunnels.length) return state
      return { ...state, tunnels: state.tunnels.filter((_, i) => i !== index) }
    }
    case 'SET_SUB_RULES':
      return { ...state, subRules: { ...action.payload } }
    case 'ADD_SUB_RULE_SET': {
      const { name, rules } = action.payload
      if (!name.trim()) return state
      return {
        ...state,
        subRules: { ...state.subRules, [name.trim()]: rules ?? [] },
      }
    }
    case 'UPDATE_SUB_RULE_SET': {
      const { oldName, name, rules } = action.payload
      const key = name.trim()
      if (!key) return state
      const next = { ...state.subRules }
      if (oldName != null && oldName !== key) delete next[oldName]
      next[key] = rules ?? []
      return { ...state, subRules: next }
    }
    case 'REMOVE_SUB_RULE_SET': {
      const name = action.payload
      const next = { ...state.subRules }
      delete next[name]
      return { ...state, subRules: next }
    }
    case 'SET_ADVANCED_TUNNELS_YAML':
      return { ...state, advancedTunnelsYaml: action.payload }
    case 'SET_USE_ADVANCED_TUNNELS':
      return { ...state, useAdvancedTunnelsYaml: action.payload }
    case 'SET_CUSTOM_TUNNELS_YAML':
      return { ...state, customTunnelsYaml: action.payload }
    case 'SET_USE_TUNNELS':
      return { ...state, useTunnels: action.payload }
    case 'SET_GEO_SETTINGS':
      return {
        ...state,
        geoSettings: { ...state.geoSettings, ...action.payload },
      }
    case 'SET_USE_GEO_SETTINGS':
      return {
        ...state,
        useGeoSettings: action.payload,
      }
    case 'SET_CUSTOM_GEO_YAML':
      return { ...state, customGeoYaml: action.payload }
    case 'SET_SNIFFER_SETTINGS':
      return {
        ...state,
        snifferSettings: { ...state.snifferSettings, ...action.payload },
      }
    case 'SET_USE_SNIFFER_SETTINGS':
      return { ...state, useSnifferSettings: action.payload }
    case 'SET_ADVANCED_SNIFFER_YAML':
      return { ...state, advancedSnifferYaml: action.payload }
    case 'SET_USE_ADVANCED_SNIFFER':
      return { ...state, useAdvancedSnifferYaml: action.payload }
    case 'SET_CUSTOM_SNIFFER_YAML':
      return { ...state, customSnifferYaml: action.payload }
    case 'SET_TLS_SETTINGS':
      return {
        ...state,
        tlsSettings: { ...state.tlsSettings, ...action.payload },
      }
    case 'SET_USE_TLS_SETTINGS':
      return { ...state, useTlsSettings: action.payload }
    case 'SET_ADVANCED_TLS_YAML':
      return { ...state, advancedTlsYaml: action.payload }
    case 'SET_USE_ADVANCED_TLS':
      return { ...state, useAdvancedTlsYaml: action.payload }
    case 'SET_CUSTOM_TLS_YAML':
      return { ...state, customTlsYaml: action.payload }
    case 'SET_ADVANCED_GENERAL_YAML':
      return { ...state, advancedGeneralYaml: action.payload }
    case 'SET_USE_ADVANCED_GENERAL':
      return { ...state, useAdvancedGeneralYaml: action.payload }
    case 'SET_ADVANCED_EXTERNAL_YAML':
      return { ...state, advancedExternalYaml: action.payload }
    case 'SET_USE_ADVANCED_EXTERNAL':
      return { ...state, useAdvancedExternalYaml: action.payload }
    case 'SET_ADVANCED_GEO_YAML':
      return { ...state, advancedGeoYaml: action.payload }
    case 'SET_USE_ADVANCED_GEO':
      return { ...state, useAdvancedGeoYaml: action.payload }
    case 'IMPORT_YAML': {
      const p = action.payload
      const next = applyPartialState(state, p)
      if (p.proxies != null && !p.linksRaw) next.extraProxies = []
      ensureAutoProxyGroup(next)
      return next
    }
    case 'IMPORT_SERIALIZED': {
      const p = action.payload
      const next = applyPartialState(state, p)
      if (p.linksRaw != null && p.linksRaw.trim()) {
        const { proxies: fromLinks } = parseMany(p.linksRaw, { collectErrors: true })
        const proxies = [...fromLinks, ...next.extraProxies]
        const groups = [...next.groups]
        resolveProxyNameConflicts(proxies, groups)
        next.proxies = proxies
        next.groups = groups
        next.extraProxies = [...fromLinks, ...(next.extraProxies ?? [])]
      } else if (p.proxies != null) {
        next.proxies = p.proxies
        if (p.extraProxies == null) {
          next.extraProxies = [...p.proxies]
        }
      }
      ensureAutoProxyGroup(next)
      return next
    }
    default:
      return state
  }
}
