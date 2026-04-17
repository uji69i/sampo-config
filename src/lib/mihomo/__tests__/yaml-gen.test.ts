import { describe, it, expect } from 'vitest'
import type { GeneralSettings, MihomoProxy, ProxyGroup, MihomoState } from '../types'
import {
  emitGeneralSettingsYaml,
  emitSnifferYaml,
  emitProxiesYaml,
  emitGroupsYaml,
  emitRulesYaml,
  emitSubRulesYaml,
  buildFullConfig,
} from '../yaml-gen'

describe('emitGeneralSettingsYaml', () => {
  it('emits mode and booleans when no formMeta', () => {
    const settings: GeneralSettings = {
      mode: 'rule',
      allowLan: false,
      ipv6: false,
      logLevel: 'info',
      unifiedDelay: true,
      tcpConcurrent: false,
    }
    const yaml = emitGeneralSettingsYaml(settings)
    expect(yaml).toContain('mode: "rule"')
    expect(yaml).toContain('allow-lan: false')
    expect(yaml).toContain('log-level: "info"')
  })

  it('emits mixed-port when set', () => {
    const settings: GeneralSettings = {
      mode: 'global',
      mixedPort: 7890,
      allowLan: true,
      ipv6: false,
      logLevel: 'info',
      unifiedDelay: false,
      tcpConcurrent: false,
    }
    const yaml = emitGeneralSettingsYaml(settings)
    expect(yaml).toContain('mixed-port: 7890')
    expect(yaml).toContain('allow-lan: true')
  })
})

describe('emitProxiesYaml', () => {
  it('emits proxies block with one proxy', () => {
    const proxies: MihomoProxy[] = [
      {
        name: 'my-vless',
        type: 'vless',
        server: 'example.com',
        port: 443,
        uuid: 'abc-123',
      },
    ]
    const yaml = emitProxiesYaml(proxies)
    expect(yaml).toContain('proxies:')
    expect(yaml).toContain('name: "my-vless"')
    expect(yaml).toContain('type: "vless"')
    expect(yaml).toContain('server: example.com')
    expect(yaml).toContain('port: 443')
  })

  it('returns proxies header when empty list', () => {
    const yaml = emitProxiesYaml([])
    expect(yaml).toContain('proxies:')
    expect(yaml.trimEnd()).toBe('proxies:')
  })
})

describe('emitGroupsYaml', () => {
  it('emits proxy-groups with one select group', () => {
    const groups: ProxyGroup[] = [
      {
        name: 'PROXY',
        type: 'select',
        proxies: ['my-vless'],
        manual: [],
      },
    ]
    const yaml = emitGroupsYaml(groups)
    expect(yaml).toContain('proxy-groups:')
    expect(yaml).toContain('name: PROXY')
    expect(yaml).toContain('type: select')
    expect(yaml).toContain('my-vless')
  })

  it('returns empty string when no groups', () => {
    expect(emitGroupsYaml([])).toBe('')
  })

  it('emits icon with same indent as type (4 spaces) for valid YAML', () => {
    const groups: ProxyGroup[] = [
      {
        name: 'G',
        type: 'select',
        proxies: [],
        manual: [],
        icon: 'https://cdn.example.com/icon.png',
      },
    ]
    const yaml = emitGroupsYaml(groups)
    expect(yaml).toContain('type: select')
    expect(yaml).toContain('icon:')
    const iconLine = yaml.split('\n').find((l) => l.trimStart().startsWith('icon:'))
    expect(iconLine).toBeDefined()
    expect(iconLine!.startsWith('    icon:')).toBe(true)
  })
})

describe('emitRulesYaml', () => {
  it('emits MATCH rule with policy from state', () => {
    const state = createMinimalState()
    state.groups = [{ name: 'PROXY', type: 'select', proxies: [], manual: [] }]
    state.ruleOrder = [{ kind: 'MATCH', key: 'MATCH', policy: 'PROXY' }]
    const yaml = emitRulesYaml(state, state.ruleOrder)
    expect(yaml).toContain('rules:')
    expect(yaml).toContain('MATCH,PROXY')
  })
})

describe('emitSubRulesYaml', () => {
  it('emits sub-rules section', () => {
    const yaml = emitSubRulesYaml({
      mylist: ['DOMAIN-SUFFIX,example.com,DIRECT', 'MATCH,PROXY'],
    })
    expect(yaml).toContain('sub-rules:')
    expect(yaml).toContain('mylist:')
    expect(yaml).toContain('DOMAIN-SUFFIX,example.com,DIRECT')
  })

  it('returns empty string for empty subRules object', () => {
    expect(emitSubRulesYaml({})).toBe('')
  })
})

describe('emitSnifferYaml', () => {
  it('emits sniff protocols with ports and per-protocol override', () => {
    const yaml = emitSnifferYaml({
      enable: true,
      forceDnsMapping: true,
      parsePureIp: true,
      overrideDestination: false,
      sniff: {
        HTTP: { ports: [80, '8080-8880'], overrideDestination: true },
        TLS: { ports: [443, 8443] },
        QUIC: { ports: [443, 8443] },
      },
    })
    expect(yaml).toContain('sniffer:')
    expect(yaml).toContain('enable: true')
    expect(yaml).toContain('force-dns-mapping: true')
    expect(yaml).toContain('parse-pure-ip: true')
    expect(yaml).toContain('sniff:')
    expect(yaml).toContain('HTTP:')
    expect(yaml).toContain('ports: [80, 8080-8880]')
    expect(yaml).toContain('override-destination: true')
    expect(yaml).toContain('TLS:')
    expect(yaml).toContain('ports: [443, 8443]')
    expect(yaml).toContain('QUIC:')
  })

  it('omits ports and override-destination when unset', () => {
    const yaml = emitSnifferYaml({
      enable: true,
      sniff: { TLS: {} },
    })
    expect(yaml).toContain('sniff:')
    expect(yaml).toContain('TLS:')
    expect(yaml).not.toContain('ports:')
    expect(yaml).not.toContain('override-destination:')
  })

  it('emits deprecated keys when provided', () => {
    const yaml = emitSnifferYaml({
      enable: true,
      sniffing: ['tls', 'http'],
      portWhitelist: ['80', '443'],
    })
    expect(yaml).toContain('sniffing:')
    expect(yaml).toContain('port-whitelist:')
  })
})

describe('buildFullConfig', () => {
  it('returns string with rules section for initial-like state with no sections enabled', () => {
    const state = createMinimalState()
    state.groups = []
    state.ruleOrder = []
    const yamlEmpty = buildFullConfig(state, {})
    expect(typeof yamlEmpty).toBe('string')
    // buildFullConfig still emits rules (MATCH) via buildRuleEntriesArray
    expect(yamlEmpty).toContain('rules:')
  })

  it('includes general section when useGeneralSettings is true', () => {
    const state = createMinimalState()
    state.useGeneralSettings = true
    state.generalSettings = {
      ...state.generalSettings,
      mode: 'rule',
      mixedPort: 7890,
    }
    const yaml = buildFullConfig(state, {})
    expect(yaml).toContain('mode:')
    expect(yaml).toContain('7890')
  })

  it('includes proxies and proxy-groups when state has them', () => {
    const state = createMinimalState()
    state.proxies = [
      { name: 'p1', type: 'vless', server: 's.example.com', port: 443, uuid: 'u1' },
    ]
    state.groups = [
      { name: 'G', type: 'select', proxies: ['p1'], manual: [] },
    ]
    state.ruleOrder = [{ kind: 'MATCH', key: 'MATCH', policy: 'G' }]
    const yaml = buildFullConfig(state, {})
    expect(yaml).toContain('proxies:')
    expect(yaml).toContain('p1')
    expect(yaml).toContain('proxy-groups:')
    expect(yaml).toContain('name: G')
    expect(yaml).toContain('rules:')
    expect(yaml).toContain('MATCH,G')
  })
})

/** Minimal MihomoState for tests (all required keys). */
function createMinimalState(): MihomoState {
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
    generalSettings: {
      mode: 'rule',
      allowLan: false,
      ipv6: false,
      logLevel: 'info',
      unifiedDelay: true,
      tcpConcurrent: false,
    },
    dnsSettings: {
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
    },
    listeners: [],
    useGeneralSettings: false,
    customGeneralYaml: '',
    externalSettings: {},
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
  }
}
