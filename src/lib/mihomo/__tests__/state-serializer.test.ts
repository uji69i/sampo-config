import { describe, it, expect } from 'vitest'
import {
  serializeStateToUrl,
  deserializeStateFromUrl,
  MAX_URL_LENGTH,
} from '../state-serializer'
import type { MihomoState } from '../types'

/** Minimal valid MihomoState for testing */
function makeState(overrides: Partial<MihomoState> = {}): MihomoState {
  return {
    linksRaw: '',
    proxies: [],
    extraProxies: [],
    subs: [],
    groups: [],
    geosite: [],
    geoip: [],
    rulesGeosite: new Map(),
    rulesGeoip: new Map(),
    match: { mode: 'auto', value: '' },
    ruleProviders: [],
    manualRules: [],
    ruleOrder: [],
    subRules: {},
    enabledTemplates: new Map(),
    serviceTemplates: [],
    advancedSubsYaml: '',
    advancedGroupsYaml: '',
    advancedRulesYaml: '',
    useAdvancedSubsYaml: false,
    useAdvancedGroupsYaml: false,
    useAdvancedRulesYaml: false,
    generalSettings: { mode: 'rule', allowLan: false, ipv6: false, logLevel: 'info', unifiedDelay: true, tcpConcurrent: false },
    useGeneralSettings: false,
    customGeneralYaml: '',
    externalSettings: {},
    useExternalSettings: false,
    customExternalYaml: '',
    dnsSettings: { enable: false, enhancedMode: 'redir-host', fakeIpFilter: [], ipv6: false, useHosts: true, useSystemHosts: true, defaultNameserver: [], nameserver: [], fallback: [], nameserverPolicy: [], proxyServerNameserver: [], directNameserver: [], proxyServerNameserverPolicy: [] },
    useDnsSettings: false,
    advancedDnsYaml: '',
    useAdvancedDnsYaml: false,
    customDnsYaml: '',
    listeners: [],
    useListeners: false,
    advancedListenersYaml: '',
    useAdvancedListenersYaml: false,
    customListenersYaml: '',
    tunnels: [],
    useTunnels: false,
    advancedTunnelsYaml: '',
    useAdvancedTunnelsYaml: false,
    customTunnelsYaml: '',
    geoSettings: {},
    useGeoSettings: false,
    customGeoYaml: '',
    snifferSettings: { enable: false, overrideDestination: false },
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
    ...overrides,
  }
}

describe('serializeStateToUrl / deserializeStateFromUrl round-trips', () => {
  it('empty state serializes without throwing and deserializes to null-ish result', () => {
    const state = makeState()
    expect(() => serializeStateToUrl(state)).not.toThrow()
    const encoded = serializeStateToUrl(state)
    // No relevant data — decoded partial may be empty but must not throw
    const decoded = deserializeStateFromUrl(encoded)
    expect(decoded).not.toBeNull()
  })

  it('round-trips linksRaw', () => {
    const state = makeState({ linksRaw: 'vless://example' })
    const encoded = serializeStateToUrl(state)
    const decoded = deserializeStateFromUrl(encoded)
    expect(decoded?.linksRaw).toBe('vless://example')
  })

  it('round-trips subs array', () => {
    const state = makeState({
      subs: [{ name: 'my-sub', url: 'http://sub.example.com', interval: 3600, fetchMode: 'DIRECT', type: 'http' }],
    })
    const encoded = serializeStateToUrl(state)
    const decoded = deserializeStateFromUrl(encoded)
    expect(decoded?.subs).toHaveLength(1)
    expect(decoded?.subs?.[0].name).toBe('my-sub')
  })

  it('round-trips groups array', () => {
    const state = makeState({
      groups: [{ name: 'PROXY', type: 'select', proxies: [], manual: [] }],
    })
    const encoded = serializeStateToUrl(state)
    const decoded = deserializeStateFromUrl(encoded)
    expect(decoded?.groups?.[0].name).toBe('PROXY')
  })

  it('round-trips match state', () => {
    const state = makeState({
      match: { mode: 'builtin', value: 'DIRECT' },
    })
    const encoded = serializeStateToUrl(state)
    const decoded = deserializeStateFromUrl(encoded)
    expect(decoded?.match?.mode).toBe('builtin')
    expect(decoded?.match?.value).toBe('DIRECT')
  })

  it('round-trips rulesGeosite Map — converts to record and back', () => {
    const rulesGeosite = new Map([
      ['google', { action: 'PROXY', target: 'PROXY' }],
      ['cn', { action: 'BLOCK', target: 'REJECT' }],
    ]) as MihomoState['rulesGeosite']
    const state = makeState({ rulesGeosite })
    const encoded = serializeStateToUrl(state)
    const decoded = deserializeStateFromUrl(encoded)
    expect(decoded?.rulesGeosite).toBeInstanceOf(Map)
    expect(decoded?.rulesGeosite?.get('google')).toEqual({ action: 'PROXY', target: 'PROXY' })
    expect(decoded?.rulesGeosite?.get('cn')).toEqual({ action: 'BLOCK', target: 'REJECT' })
  })

  it('round-trips rulesGeoip Map', () => {
    const rulesGeoip = new Map([
      ['CN', { action: 'PROXY', target: 'PROXY' }],
    ]) as MihomoState['rulesGeoip']
    const state = makeState({ rulesGeoip })
    const decoded = deserializeStateFromUrl(serializeStateToUrl(state))
    expect(decoded?.rulesGeoip?.get('CN')).toEqual({ action: 'PROXY', target: 'PROXY' })
  })

  it('round-trips enabledTemplates Map', () => {
    const enabledTemplates = new Map([['tmpl-1', 'PROXY']]) as MihomoState['enabledTemplates']
    const state = makeState({ enabledTemplates })
    const decoded = deserializeStateFromUrl(serializeStateToUrl(state))
    expect(decoded?.enabledTemplates?.get('tmpl-1')).toBe('PROXY')
  })

  it('corrupted input returns null', () => {
    expect(deserializeStateFromUrl('not-valid-base64!!!')).toBeNull()
    expect(deserializeStateFromUrl('')).toBeNull()
    expect(deserializeStateFromUrl('AAAA')).toBeNull()
  })

  it('migrates geodataMode from old generalSettings location to geoSettings', () => {
    // Construct a state with no geoSettings but simulate the old serialized format
    // by directly testing the deserialization path (inject raw via encoding)
    const state = makeState({
      useGeneralSettings: true,
      // @ts-expect-error — simulate old format where geodataMode lived in generalSettings
      generalSettings: { mode: 'rule', allowLan: false, ipv6: false, logLevel: 'info', unifiedDelay: true, tcpConcurrent: false, geodataMode: true },
    })
    const encoded = serializeStateToUrl(state)
    const decoded = deserializeStateFromUrl(encoded)
    // After migration the geodataMode should live in geoSettings
    expect(decoded?.geoSettings?.geodataMode).toBe(true)
  })

  it('encoded length does not exceed MAX_URL_LENGTH for a typical non-trivial config', () => {
    const state = makeState({
      linksRaw: 'vless://example',
      subs: [{ name: 'sub', url: 'http://example.com', interval: 3600, fetchMode: 'DIRECT', type: 'http' }],
      groups: [{ name: 'PROXY', type: 'select', proxies: [], manual: [] }],
      manualRules: [{ type: 'DOMAIN', value: 'example.com', policy: 'DIRECT' }],
    })
    const encoded = serializeStateToUrl(state)
    const fullUrl = 'https://example.com/?config=' + encoded
    expect(fullUrl.length).toBeLessThan(MAX_URL_LENGTH)
  })
})
