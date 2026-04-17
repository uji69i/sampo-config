import pako from 'pako'
import { b64urlToBytes, bytesToB64url } from '../amnezia-config'
import type { MihomoState } from './types'

export const MAX_URL_LENGTH = 8000

interface SerializedState {
  v?: number
  linksRaw?: string
  extraProxies?: MihomoState['extraProxies']
  subs?: MihomoState['subs']
  groups?: MihomoState['groups']
  match?: MihomoState['match']
  ruleProviders?: MihomoState['ruleProviders']
  manualRules?: MihomoState['manualRules']
  ruleOrder?: MihomoState['ruleOrder']
  subRules?: MihomoState['subRules']
  rulesGeosite?: Record<string, { action: string; target: string }>
  rulesGeoip?: Record<string, { action: string; target: string }>
  enabledTemplates?: Record<string, string>
  advancedSubsYaml?: string
  advancedGroupsYaml?: string
  advancedRulesYaml?: string
  useAdvancedSubsYaml?: boolean
  useAdvancedGroupsYaml?: boolean
  useAdvancedRulesYaml?: boolean
  generalSettings?: MihomoState['generalSettings']
  dnsSettings?: MihomoState['dnsSettings']
  listeners?: MihomoState['listeners']
  useGeneralSettings?: boolean
  customGeneralYaml?: string
  externalSettings?: MihomoState['externalSettings']
  useExternalSettings?: boolean
  customExternalYaml?: string
  useDnsSettings?: boolean
  advancedDnsYaml?: string
  useAdvancedDnsYaml?: boolean
  customDnsYaml?: string
  advancedListenersYaml?: string
  useAdvancedListenersYaml?: boolean
  customListenersYaml?: string
  useListeners?: boolean
  tunnels?: MihomoState['tunnels']
  useTunnels?: boolean
  advancedTunnelsYaml?: string
  useAdvancedTunnelsYaml?: boolean
  customTunnelsYaml?: string
  geoSettings?: MihomoState['geoSettings']
  useGeoSettings?: boolean
  customGeoYaml?: string
  snifferSettings?: MihomoState['snifferSettings']
  useSnifferSettings?: boolean
  advancedSnifferYaml?: string
  useAdvancedSnifferYaml?: boolean
  customSnifferYaml?: string
  tlsSettings?: MihomoState['tlsSettings']
  useTlsSettings?: boolean
  advancedTlsYaml?: string
  useAdvancedTlsYaml?: boolean
  customTlsYaml?: string
  advancedGeneralYaml?: string
  useAdvancedGeneralYaml?: boolean
  advancedExternalYaml?: string
  useAdvancedExternalYaml?: boolean
  advancedGeoYaml?: string
  useAdvancedGeoYaml?: boolean
}

function mapToRecord<K extends string, V>(m: Map<K, V>): Record<string, V> {
  const out: Record<string, V> = {}
  m.forEach((v, k) => { out[k] = v })
  return out
}

function recordToMap<K extends string, V>(r: Record<string, V> | undefined): Map<K, V> {
  const m = new Map<K, V>()
  if (!r || typeof r !== 'object') return m
  for (const [k, v] of Object.entries(r)) m.set(k as K, v)
  return m
}

/**
 * Serialize MihomoState to a compressed base64url string for URL params.
 * Omits proxies, geosite, geoip, serviceTemplates (derived or loaded separately).
 * Caller should run BUILD_PROXIES after applying when linksRaw or extraProxies is set.
 */
export function serializeStateToUrl(state: MihomoState): string {
  const raw: SerializedState = { v: 1 }
  if (state.linksRaw) raw.linksRaw = state.linksRaw
  if (state.extraProxies?.length) raw.extraProxies = state.extraProxies
  if (state.subs?.length) raw.subs = state.subs
  if (state.groups?.length) raw.groups = state.groups
  if (state.match && (state.match.mode !== 'auto' || state.match.value))
    raw.match = state.match
  if (state.ruleProviders?.length) raw.ruleProviders = state.ruleProviders
  if (state.manualRules?.length) raw.manualRules = state.manualRules
  if (state.ruleOrder?.length) raw.ruleOrder = state.ruleOrder
  if (state.subRules && Object.keys(state.subRules).length > 0) raw.subRules = state.subRules
  if (state.rulesGeosite?.size) raw.rulesGeosite = mapToRecord(state.rulesGeosite)
  if (state.rulesGeoip?.size) raw.rulesGeoip = mapToRecord(state.rulesGeoip)
  if (state.enabledTemplates?.size) raw.enabledTemplates = mapToRecord(state.enabledTemplates)
  if (state.useAdvancedSubsYaml && state.advancedSubsYaml) {
    raw.useAdvancedSubsYaml = true
    raw.advancedSubsYaml = state.advancedSubsYaml
  }
  if (state.useAdvancedGroupsYaml && state.advancedGroupsYaml) {
    raw.useAdvancedGroupsYaml = true
    raw.advancedGroupsYaml = state.advancedGroupsYaml
  }
  if (state.useAdvancedRulesYaml && state.advancedRulesYaml) {
    raw.useAdvancedRulesYaml = true
    raw.advancedRulesYaml = state.advancedRulesYaml
  }
  if (state.useGeneralSettings) {
    raw.useGeneralSettings = true
    if (state.useAdvancedGeneralYaml && state.advancedGeneralYaml) {
      raw.advancedGeneralYaml = state.advancedGeneralYaml
      raw.useAdvancedGeneralYaml = true
    } else {
      raw.generalSettings = state.generalSettings
    }
  }
  if (state.customGeneralYaml?.trim()) raw.customGeneralYaml = state.customGeneralYaml
  if (state.useExternalSettings) {
    raw.useExternalSettings = true
    if (state.useAdvancedExternalYaml && state.advancedExternalYaml) {
      raw.advancedExternalYaml = state.advancedExternalYaml
      raw.useAdvancedExternalYaml = true
    } else {
      raw.externalSettings = state.externalSettings
    }
  }
  if (state.customExternalYaml?.trim()) raw.customExternalYaml = state.customExternalYaml
  if (state.useDnsSettings) {
    raw.useDnsSettings = true
    raw.dnsSettings = state.dnsSettings
    if (state.useAdvancedDnsYaml && state.advancedDnsYaml)
      raw.advancedDnsYaml = state.advancedDnsYaml
    raw.useAdvancedDnsYaml = state.useAdvancedDnsYaml
  }
  if (state.customDnsYaml?.trim()) raw.customDnsYaml = state.customDnsYaml
  if (state.useListeners) {
    raw.useListeners = true
    if (state.listeners?.length) raw.listeners = state.listeners
    if (state.useAdvancedListenersYaml && state.advancedListenersYaml) {
      raw.useAdvancedListenersYaml = true
      raw.advancedListenersYaml = state.advancedListenersYaml
    }
  }
  if (state.customListenersYaml?.trim()) raw.customListenersYaml = state.customListenersYaml
  if (state.useTunnels) {
    raw.useTunnels = true
    if (state.tunnels?.length) raw.tunnels = state.tunnels
    if (state.useAdvancedTunnelsYaml && state.advancedTunnelsYaml) {
      raw.useAdvancedTunnelsYaml = true
      raw.advancedTunnelsYaml = state.advancedTunnelsYaml
    }
  }
  if (state.customTunnelsYaml?.trim()) raw.customTunnelsYaml = state.customTunnelsYaml
  if (state.useGeoSettings) {
    raw.useGeoSettings = true
    if (state.useAdvancedGeoYaml && state.advancedGeoYaml) {
      raw.advancedGeoYaml = state.advancedGeoYaml
      raw.useAdvancedGeoYaml = true
    } else {
      raw.geoSettings = state.geoSettings
    }
  }
  if (state.customGeoYaml?.trim()) raw.customGeoYaml = state.customGeoYaml
  if (state.useSnifferSettings) {
    raw.useSnifferSettings = true
    raw.snifferSettings = state.snifferSettings
    if (state.useAdvancedSnifferYaml && state.advancedSnifferYaml)
      raw.advancedSnifferYaml = state.advancedSnifferYaml
    raw.useAdvancedSnifferYaml = state.useAdvancedSnifferYaml
  }
  if (state.customSnifferYaml?.trim()) raw.customSnifferYaml = state.customSnifferYaml
  if (state.useTlsSettings) {
    raw.useTlsSettings = true
    raw.tlsSettings = state.tlsSettings
    if (state.useAdvancedTlsYaml && state.advancedTlsYaml)
      raw.advancedTlsYaml = state.advancedTlsYaml
    raw.useAdvancedTlsYaml = state.useAdvancedTlsYaml
  }
  if (state.customTlsYaml?.trim()) raw.customTlsYaml = state.customTlsYaml

  const json = JSON.stringify(raw)
  const compressed = pako.deflate(new TextEncoder().encode(json))
  return bytesToB64url(compressed)
}

/**
 * Deserialize compressed base64url string back to partial MihomoState.
 * Caller should run BUILD_PROXIES when linksRaw or extraProxies is set, and ensureAutoProxyGroup after applying.
 */
export function deserializeStateFromUrl(encoded: string): Partial<MihomoState> | null {
  try {
    const bytes = b64urlToBytes(encoded)
    const decompressed = pako.inflate(bytes, { to: 'string' })
    const raw = JSON.parse(decompressed) as SerializedState
    if (!raw || typeof raw !== 'object') return null

    const state: Partial<MihomoState> = {}
    if (raw.linksRaw != null) state.linksRaw = raw.linksRaw
    if (Array.isArray(raw.extraProxies)) state.extraProxies = raw.extraProxies
    if (Array.isArray(raw.subs)) state.subs = raw.subs
    if (Array.isArray(raw.groups)) state.groups = raw.groups
    if (raw.match) state.match = raw.match
    if (Array.isArray(raw.ruleProviders)) state.ruleProviders = raw.ruleProviders
    if (Array.isArray(raw.manualRules)) state.manualRules = raw.manualRules
    if (Array.isArray(raw.ruleOrder)) state.ruleOrder = raw.ruleOrder
    if (raw.subRules && typeof raw.subRules === 'object' && !Array.isArray(raw.subRules))
      state.subRules = raw.subRules
    if (raw.rulesGeosite)
      state.rulesGeosite = recordToMap(raw.rulesGeosite) as MihomoState['rulesGeosite']
    if (raw.rulesGeoip)
      state.rulesGeoip = recordToMap(raw.rulesGeoip) as MihomoState['rulesGeoip']
    if (raw.enabledTemplates)
      state.enabledTemplates = recordToMap(raw.enabledTemplates) as MihomoState['enabledTemplates']
    if (raw.useAdvancedSubsYaml) {
      state.useAdvancedSubsYaml = true
      state.advancedSubsYaml = raw.advancedSubsYaml ?? ''
    }
    if (raw.useAdvancedGroupsYaml) {
      state.useAdvancedGroupsYaml = true
      state.advancedGroupsYaml = raw.advancedGroupsYaml ?? ''
    }
    if (raw.useAdvancedRulesYaml) {
      state.useAdvancedRulesYaml = true
      state.advancedRulesYaml = raw.advancedRulesYaml ?? ''
    }
    if (raw.useGeneralSettings) {
      state.useGeneralSettings = true
      if (raw.useAdvancedGeneralYaml) {
        state.useAdvancedGeneralYaml = true
        state.advancedGeneralYaml = raw.advancedGeneralYaml ?? ''
      } else if (raw.generalSettings) {
        state.generalSettings = raw.generalSettings
      }
    }
    if (raw.customGeneralYaml != null) state.customGeneralYaml = raw.customGeneralYaml
    if (raw.useExternalSettings) {
      state.useExternalSettings = true
      if (raw.useAdvancedExternalYaml) {
        state.useAdvancedExternalYaml = true
        state.advancedExternalYaml = raw.advancedExternalYaml ?? ''
      } else if (raw.externalSettings) {
        state.externalSettings = raw.externalSettings
      }
    }
    if (raw.customExternalYaml != null) state.customExternalYaml = raw.customExternalYaml
    if (raw.useDnsSettings && raw.dnsSettings) {
      state.useDnsSettings = true
      state.dnsSettings = raw.dnsSettings
      state.advancedDnsYaml = raw.advancedDnsYaml ?? ''
      state.useAdvancedDnsYaml = raw.useAdvancedDnsYaml ?? false
    }
    if (raw.customDnsYaml != null) state.customDnsYaml = raw.customDnsYaml
    if (raw.useListeners) {
      state.useListeners = true
      if (Array.isArray(raw.listeners)) state.listeners = raw.listeners
      if (raw.useAdvancedListenersYaml) {
        state.useAdvancedListenersYaml = true
        state.advancedListenersYaml = raw.advancedListenersYaml ?? ''
      }
    }
    if (raw.customListenersYaml != null) state.customListenersYaml = raw.customListenersYaml
    if (raw.useTunnels) {
      state.useTunnels = true
      if (Array.isArray(raw.tunnels)) state.tunnels = raw.tunnels
      if (raw.useAdvancedTunnelsYaml) {
        state.useAdvancedTunnelsYaml = true
        state.advancedTunnelsYaml = raw.advancedTunnelsYaml ?? ''
      }
    }
    if (raw.customTunnelsYaml != null) state.customTunnelsYaml = raw.customTunnelsYaml
    if (raw.useGeoSettings) {
      state.useGeoSettings = true
      if (raw.useAdvancedGeoYaml) {
        state.useAdvancedGeoYaml = true
        state.advancedGeoYaml = raw.advancedGeoYaml ?? ''
      } else if (raw.geoSettings) {
        state.geoSettings = raw.geoSettings
      }
    }
    // Migrate geodataMode from old URL state (was in generalSettings, now in geoSettings)
    const rawGeneral = raw.generalSettings as Record<string, unknown> | undefined
    if (rawGeneral && 'geodataMode' in rawGeneral && typeof rawGeneral.geodataMode === 'boolean') {
      state.geoSettings = { ...state.geoSettings, geodataMode: rawGeneral.geodataMode }
    }
    if (raw.customGeoYaml != null) state.customGeoYaml = raw.customGeoYaml
    if (raw.useSnifferSettings && raw.snifferSettings) {
      state.useSnifferSettings = true
      state.snifferSettings = raw.snifferSettings
      state.advancedSnifferYaml = raw.advancedSnifferYaml ?? ''
      state.useAdvancedSnifferYaml = raw.useAdvancedSnifferYaml ?? false
    }
    if (raw.customSnifferYaml != null) state.customSnifferYaml = raw.customSnifferYaml
    if (raw.useTlsSettings && raw.tlsSettings) {
      state.useTlsSettings = true
      state.tlsSettings = raw.tlsSettings
      state.advancedTlsYaml = raw.advancedTlsYaml ?? ''
      state.useAdvancedTlsYaml = raw.useAdvancedTlsYaml ?? false
    }
    if (raw.customTlsYaml != null) state.customTlsYaml = raw.customTlsYaml
    return state
  } catch {
    return null
  }
}
