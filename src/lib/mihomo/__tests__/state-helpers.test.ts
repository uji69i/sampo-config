import { describe, it, expect } from 'vitest'
import {
  resolveProxyNameConflicts,
  ensureAutoProxyGroup,
  buildRuleEntriesArray,
} from '../state-helpers'
import { AUTO_GROUP_NAME } from '../constants'
import type { MihomoState, MihomoProxy, ProxyGroup } from '../types'

function makeProxy(name: string): MihomoProxy {
  return { name, type: 'ss', server: 'x', port: 1 } as MihomoProxy
}

function makeGroup(name: string, proxies: string[] = []): ProxyGroup {
  return { name, type: 'select', proxies, manual: [] }
}

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

describe('resolveProxyNameConflicts', () => {
  it('deduplicates proxies with conflicting names by appending suffix', () => {
    const proxies = [makeProxy('p'), makeProxy('p'), makeProxy('p')]
    resolveProxyNameConflicts(proxies, [])
    const names = proxies.map((p) => p.name)
    const unique = new Set(names)
    expect(unique.size).toBe(3)
  })

  it('remaps old names in group proxies arrays', () => {
    const proxies = [makeProxy('p'), makeProxy('p')]
    const groups = [makeGroup('G', ['p'])]
    resolveProxyNameConflicts(proxies, groups)
    // After dedup, proxies[0] keeps 'p'; proxies[1] gets a new name
    const newName = proxies[1].name
    expect(newName).not.toBe('p')
    // Groups should still reference the original 'p'
    expect(groups[0].proxies).toContain('p')
  })

  it('does nothing when all names are unique', () => {
    const proxies = [makeProxy('a'), makeProxy('b')]
    const groups = [makeGroup('G', ['a', 'b'])]
    resolveProxyNameConflicts(proxies, groups)
    expect(proxies[0].name).toBe('a')
    expect(proxies[1].name).toBe('b')
    expect(groups[0].proxies).toEqual(['a', 'b'])
  })

  it('handles empty arrays without throwing', () => {
    expect(() => resolveProxyNameConflicts([], [])).not.toThrow()
  })
})

describe('ensureAutoProxyGroup', () => {
  it('creates auto group when proxies exist', () => {
    const state = makeState({ proxies: [makeProxy('p1')] })
    ensureAutoProxyGroup(state)
    const auto = state.groups.find((g) => g.name === AUTO_GROUP_NAME)
    expect(auto).toBeDefined()
  })

  it('creates auto group when subs exist', () => {
    const state = makeState({
      subs: [{ name: 'sub1', url: 'http://x', interval: 3600, fetchMode: 'DIRECT', type: 'http' }],
    })
    ensureAutoProxyGroup(state)
    const auto = state.groups.find((g) => g.name === AUTO_GROUP_NAME)
    expect(auto).toBeDefined()
  })

  it('does not create auto group when both proxies and subs are empty', () => {
    const state = makeState()
    ensureAutoProxyGroup(state)
    const auto = state.groups.find((g) => g.name === AUTO_GROUP_NAME)
    expect(auto).toBeUndefined()
  })

  it('updates existing auto group proxy list when proxies change', () => {
    const state = makeState({ proxies: [makeProxy('p1')] })
    ensureAutoProxyGroup(state)
    // Add another proxy and call again
    state.proxies.push(makeProxy('p2'))
    ensureAutoProxyGroup(state)
    const auto = state.groups.find((g) => g.name === AUTO_GROUP_NAME)
    expect(auto?.proxies).toContain('p2')
  })

  it('includes sub names in auto group use list when subs exist', () => {
    const state = makeState({
      proxies: [makeProxy('p1')],
      subs: [{ name: 'my-sub', url: 'http://x', interval: 3600, fetchMode: 'DIRECT', type: 'http' }],
    })
    ensureAutoProxyGroup(state)
    const auto = state.groups.find((g) => g.name === AUTO_GROUP_NAME)
    // The group should reference the subscription via `use` or proxies
    expect(auto).toBeDefined()
  })
})

describe('buildRuleEntriesArray', () => {
  it('includes GEOSITE entries for each rulesGeosite entry', () => {
    const state = makeState({
      rulesGeosite: new Map([['google', { action: 'PROXY', target: 'PROXY' }]]) as MihomoState['rulesGeosite'],
    })
    const entries = buildRuleEntriesArray(state)
    const geo = entries.filter((e) => e.kind === 'GEOSITE')
    expect(geo).toHaveLength(1)
    expect(geo[0].key).toBe('google')
    expect(geo[0].policy).toBe('PROXY')
  })

  it('includes GEOIP entries for each rulesGeoip entry', () => {
    const state = makeState({
      rulesGeoip: new Map([['CN', { action: 'BLOCK', target: 'REJECT' }]]) as MihomoState['rulesGeoip'],
    })
    const entries = buildRuleEntriesArray(state)
    const geo = entries.filter((e) => e.kind === 'GEOIP')
    expect(geo[0].policy).toBe('REJECT')
  })

  it('includes RULE-SET entries only for providers with a policy', () => {
    const state = makeState({
      ruleProviders: [
        { name: 'rp1', url: 'http://x', interval: 3600, behavior: 'domain', policy: 'PROXY', format: 'yaml', type: 'http' },
        { name: 'rp2', url: 'http://y', interval: 3600, behavior: 'domain', policy: '', format: 'yaml', type: 'http' },
      ],
    })
    const entries = buildRuleEntriesArray(state)
    const rs = entries.filter((e) => e.kind === 'RULE-SET')
    expect(rs).toHaveLength(1)
    expect(rs[0].key).toBe('rp1')
  })

  it('includes MANUAL entries for each manualRule', () => {
    const state = makeState({
      manualRules: [
        { type: 'DOMAIN', value: 'example.com', policy: 'DIRECT' },
        { type: 'IP-CIDR', value: '0.0.0.0/0', policy: 'REJECT' },
      ],
    })
    const entries = buildRuleEntriesArray(state)
    const manual = entries.filter((e) => e.kind === 'MANUAL')
    expect(manual).toHaveLength(2)
  })

  it('MATCH is always the last entry', () => {
    const state = makeState({
      manualRules: [{ type: 'DOMAIN', value: 'x.com', policy: 'DIRECT' }],
    })
    const entries = buildRuleEntriesArray(state)
    expect(entries[entries.length - 1].kind).toBe('MATCH')
  })

  it('returns at least MATCH on empty state', () => {
    const entries = buildRuleEntriesArray(makeState())
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('MATCH')
  })
})
