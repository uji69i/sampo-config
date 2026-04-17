import { describe, it, expect } from 'vitest'
import { createInitialState, mihomoReducer } from '../mihomoReducer'
import type { MihomoProxy, RuleEntry } from '@/lib/mihomo/types'

describe('createInitialState', () => {
  it('returns state with empty proxies, groups, rules', () => {
    const state = createInitialState()
    expect(state.proxies).toEqual([])
    expect(state.groups).toEqual([])
    expect(state.manualRules).toEqual([])
    expect(state.ruleOrder).toEqual([])
    expect(state.subs).toEqual([])
  })
  it('has useGeneralSettings false and default generalSettings', () => {
    const state = createInitialState()
    expect(state.useGeneralSettings).toBe(false)
    expect(state.generalSettings.mode).toBe('rule')
    expect(state.generalSettings.allowLan).toBe(false)
  })
})

describe('mihomoReducer', () => {
  it('SET_LINKS_RAW updates linksRaw', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, { type: 'SET_LINKS_RAW', payload: 'vless://...' })
    expect(next.linksRaw).toBe('vless://...')
  })

  it('BUILD_PROXIES with empty linksRaw keeps proxies empty', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, { type: 'BUILD_PROXIES' })
    expect(next.proxies).toEqual([])
  })

  it('SET_GROUPS replaces groups', () => {
    const state = createInitialState()
    const groups = [
      { name: 'G', type: 'select' as const, proxies: [], manual: [] },
    ]
    const next = mihomoReducer(state, { type: 'SET_GROUPS', payload: groups })
    expect(next.groups).toHaveLength(1)
    expect(next.groups[0].name).toBe('G')
  })

  it('ADD_GROUP appends group', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, {
      type: 'ADD_GROUP',
      payload: { name: 'PROXY', type: 'select', proxies: [], manual: [] },
    })
    expect(next.groups).toHaveLength(1)
    expect(next.groups[0].name).toBe('PROXY')
  })

  it('SET_USE_GENERAL_SETTINGS toggles flag', () => {
    const state = createInitialState()
    expect(state.useGeneralSettings).toBe(false)
    const next = mihomoReducer(state, { type: 'SET_USE_GENERAL_SETTINGS', payload: true })
    expect(next.useGeneralSettings).toBe(true)
  })

  it('SET_GENERAL_SETTINGS merges into generalSettings', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, {
      type: 'SET_GENERAL_SETTINGS',
      payload: { mode: 'global', mixedPort: 7890 },
    })
    expect(next.generalSettings.mode).toBe('global')
    expect(next.generalSettings.mixedPort).toBe(7890)
  })

  it('SET_MATCH updates match policy', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, {
      type: 'SET_MATCH',
      payload: { mode: 'group', value: 'PROXY' },
    })
    expect(next.match.mode).toBe('group')
    expect(next.match.value).toBe('PROXY')
  })

  it('SET_RULE_ORDER updates ruleOrder', () => {
    const state = createInitialState()
    const entries = [{ kind: 'MATCH' as const, key: 'MATCH', policy: 'DIRECT' }]
    const next = mihomoReducer(state, { type: 'SET_RULE_ORDER', payload: entries })
    expect(next.ruleOrder).toHaveLength(1)
    expect(next.ruleOrder[0].policy).toBe('DIRECT')
  })

  it('ADD_MANUAL_RULE appends manual rule', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN-SUFFIX', value: 'example.com', policy: 'DIRECT' },
    })
    expect(next.manualRules).toHaveLength(1)
    expect(next.manualRules[0].type).toBe('DOMAIN-SUFFIX')
    expect(next.manualRules[0].value).toBe('example.com')
  })

  it('REMOVE_GROUP removes by index', () => {
    const state = createInitialState()
    let next = mihomoReducer(state, {
      type: 'ADD_GROUP',
      payload: { name: 'A', type: 'select', proxies: [], manual: [] },
    })
    next = mihomoReducer(next, {
      type: 'ADD_GROUP',
      payload: { name: 'B', type: 'select', proxies: [], manual: [] },
    })
    expect(next.groups).toHaveLength(2)
    next = mihomoReducer(next, { type: 'REMOVE_GROUP', payload: 0 })
    expect(next.groups).toHaveLength(1)
    expect(next.groups[0].name).toBe('B')
  })
})

describe('UPDATE_LISTENER cascade', () => {
  it('renames a group whose name matches the old listener name', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_LISTENER',
      payload: { listener: { name: 'vpn', type: 'mixed', port: 7000 } },
    })
    state = mihomoReducer(state, {
      type: 'ADD_GROUP',
      payload: { name: 'vpn', type: 'select', proxies: [], manual: [] },
    })
    const next = mihomoReducer(state, {
      type: 'UPDATE_LISTENER',
      payload: { index: 0, listener: { name: 'vpn2' } },
    })
    expect(next.listeners[0].name).toBe('vpn2')
    const renamedGroup = next.groups.find((g) => g.name === 'vpn2')
    expect(renamedGroup).toBeDefined()
    expect(next.groups.find((g) => g.name === 'vpn')).toBeUndefined()
  })

  it('renames IN-NAME manual rules referencing the old listener name', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_LISTENER',
      payload: { listener: { name: 'vpn', type: 'mixed', port: 7000 } },
    })
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'IN-NAME', value: 'vpn', policy: 'vpn' },
    })
    const next = mihomoReducer(state, {
      type: 'UPDATE_LISTENER',
      payload: { index: 0, listener: { name: 'vpn2' } },
    })
    expect(next.manualRules[0].value).toBe('vpn2')
    expect(next.manualRules[0].policy).toBe('vpn2')
  })

  it('does not cascade when listener name is unchanged', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_LISTENER',
      payload: { listener: { name: 'vpn', type: 'mixed', port: 7000 } },
    })
    state = mihomoReducer(state, {
      type: 'ADD_GROUP',
      payload: { name: 'vpn', type: 'select', proxies: [], manual: [] },
    })
    const next = mihomoReducer(state, {
      type: 'UPDATE_LISTENER',
      payload: { index: 0, listener: { port: 8000 } },
    })
    expect(next.listeners[0].port).toBe(8000)
    expect(next.groups.find((g) => g.name === 'vpn')).toBeDefined()
  })

  it('returns same state for out-of-range index', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, {
      type: 'UPDATE_LISTENER',
      payload: { index: 99, listener: { name: 'x' } },
    })
    expect(next).toBe(state)
  })
})

describe('REBUILD_RULE_ORDER', () => {
  it('produces only MATCH when state is empty', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    expect(next.ruleOrder).toHaveLength(1)
    expect(next.ruleOrder[0].kind).toBe('MATCH')
  })

  it('MATCH is always the last entry', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN', value: 'example.com', policy: 'DIRECT' },
    })
    const next = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    expect(next.ruleOrder[next.ruleOrder.length - 1].kind).toBe('MATCH')
  })

  it('preserves user-defined order for existing entries', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN', value: 'a.com', policy: 'DIRECT' },
    })
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN', value: 'b.com', policy: 'DIRECT' },
    })
    // First rebuild to initialise order
    state = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    // Reverse order via SET_RULE_ORDER (move b before a)
    const reversed: RuleEntry[] = [
      state.ruleOrder[1], // b entry
      state.ruleOrder[0], // a entry
      state.ruleOrder[2], // MATCH
    ]
    state = mihomoReducer(state, { type: 'SET_RULE_ORDER', payload: reversed })
    // Rebuild — existing entries keep their reversed order
    const next = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    expect(next.ruleOrder[0].key).toBe('DOMAIN,b.com')
    expect(next.ruleOrder[1].key).toBe('DOMAIN,a.com')
  })

  it('appends new entries after preserved ones, before MATCH', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN', value: 'a.com', policy: 'DIRECT' },
    })
    state = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    // Add a second rule without rebuilding
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN', value: 'b.com', policy: 'DIRECT' },
    })
    const next = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    const nonMatch = next.ruleOrder.filter((e) => e.kind !== 'MATCH')
    expect(nonMatch[0].key).toBe('DOMAIN,a.com')
    expect(nonMatch[1].key).toBe('DOMAIN,b.com')
    expect(next.ruleOrder[next.ruleOrder.length - 1].kind).toBe('MATCH')
  })

  it('removes entries whose source rule no longer exists', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN', value: 'gone.com', policy: 'DIRECT' },
    })
    state = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    expect(state.ruleOrder.some((e) => e.key === 'DOMAIN,gone.com')).toBe(true)
    // Remove the rule
    state = mihomoReducer(state, { type: 'REMOVE_MANUAL_RULE', payload: 0 })
    const next = mihomoReducer(state, { type: 'REBUILD_RULE_ORDER' })
    expect(next.ruleOrder.some((e) => e.key === 'DOMAIN,gone.com')).toBe(false)
  })
})

describe('MOVE_RULE', () => {
  function stateWithOrder(entries: RuleEntry[]) {
    const state = createInitialState()
    return mihomoReducer(state, { type: 'SET_RULE_ORDER', payload: entries })
  }

  const e = (key: string): RuleEntry => ({ kind: 'MANUAL', key, policy: 'DIRECT' })
  const match: RuleEntry = { kind: 'MATCH', key: 'MATCH', policy: 'DIRECT' }

  it('moves entry up by one', () => {
    const state = stateWithOrder([e('a'), e('b'), e('c'), match])
    const next = mihomoReducer(state, { type: 'MOVE_RULE', payload: { index: 1, direction: 'up' } })
    expect(next.ruleOrder[0].key).toBe('b')
    expect(next.ruleOrder[1].key).toBe('a')
  })

  it('moves entry down by one', () => {
    const state = stateWithOrder([e('a'), e('b'), e('c'), match])
    const next = mihomoReducer(state, { type: 'MOVE_RULE', payload: { index: 0, direction: 'down' } })
    expect(next.ruleOrder[0].key).toBe('b')
    expect(next.ruleOrder[1].key).toBe('a')
  })

  it('moves entry to top', () => {
    const state = stateWithOrder([e('a'), e('b'), e('c'), match])
    const next = mihomoReducer(state, { type: 'MOVE_RULE', payload: { index: 2, direction: 'top' } })
    expect(next.ruleOrder[0].key).toBe('c')
  })

  it('moves entry to bottom (before MATCH)', () => {
    const state = stateWithOrder([e('a'), e('b'), e('c'), match])
    const next = mihomoReducer(state, { type: 'MOVE_RULE', payload: { index: 0, direction: 'bottom' } })
    expect(next.ruleOrder[2].key).toBe('a')
    expect(next.ruleOrder[3].kind).toBe('MATCH')
  })

  it('MATCH stays last after move', () => {
    const state = stateWithOrder([e('a'), e('b'), match])
    const next = mihomoReducer(state, { type: 'MOVE_RULE', payload: { index: 0, direction: 'down' } })
    expect(next.ruleOrder[next.ruleOrder.length - 1].kind).toBe('MATCH')
  })

  it('returns same state for out-of-range index', () => {
    const state = stateWithOrder([e('a'), match])
    const next = mihomoReducer(state, { type: 'MOVE_RULE', payload: { index: 99, direction: 'up' } })
    expect(next).toBe(state)
  })

  it('returns same state when already at boundary (up at 0)', () => {
    const state = stateWithOrder([e('a'), e('b'), match])
    const next = mihomoReducer(state, { type: 'MOVE_RULE', payload: { index: 0, direction: 'up' } })
    expect(next).toBe(state)
  })
})

describe('IMPORT_YAML', () => {
  it('clones Map fields — returned Maps are not same reference as payload', () => {
    const state = createInitialState()
    const geosite = new Map([['google', { action: 'PROXY', target: 'PROXY' }]])
    const geoip = new Map([['CN', { action: 'PROXY', target: 'PROXY' }]])
    const next = mihomoReducer(state, {
      type: 'IMPORT_YAML',
      payload: { rulesGeosite: geosite, rulesGeoip: geoip },
    })
    expect(next.rulesGeosite).not.toBe(geosite)
    expect(next.rulesGeoip).not.toBe(geoip)
    expect(next.rulesGeosite.get('google')).toEqual({ action: 'PROXY', target: 'PROXY' })
  })

  it('calls ensureAutoProxyGroup when subs are present', () => {
    const state = createInitialState()
    const next = mihomoReducer(state, {
      type: 'IMPORT_YAML',
      payload: {
        subs: [{ name: 'my-sub', url: 'http://example.com', interval: 3600, fetchMode: 'DIRECT', type: 'http' }],
      },
    })
    // ensureAutoProxyGroup creates an auto group when subs are present
    expect(next.groups.length).toBeGreaterThan(0)
  })

  it('clears extraProxies when proxies are imported without linksRaw', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_EXTRA_PROXIES',
      payload: [{ name: 'extra', type: 'ss', server: 'x', port: 1 } as unknown as MihomoProxy],
    })
    expect(state.extraProxies).toHaveLength(1)
    const next = mihomoReducer(state, {
      type: 'IMPORT_YAML',
      payload: { proxies: [] },
    })
    expect(next.extraProxies).toHaveLength(0)
  })

  it('does NOT clear extraProxies when linksRaw is also present', () => {
    let state = createInitialState()
    state = mihomoReducer(state, {
      type: 'ADD_EXTRA_PROXIES',
      payload: [{ name: 'extra', type: 'ss', server: 'x', port: 1 } as unknown as MihomoProxy],
    })
    const next = mihomoReducer(state, {
      type: 'IMPORT_YAML',
      payload: { proxies: [], linksRaw: 'vless://...' },
    })
    expect(next.extraProxies).toHaveLength(1)
  })
})

describe('IMPORT_SERIALIZED', () => {
  it('parses linksRaw and populates proxies', () => {
    const state = createInitialState()
    // Valid vless link (minimal)
    const linksRaw =
      'vless://00000000-0000-0000-0000-000000000000@127.0.0.1:443?type=tcp#test-proxy'
    const next = mihomoReducer(state, {
      type: 'IMPORT_SERIALIZED',
      payload: { linksRaw },
    })
    expect(next.linksRaw).toBe(linksRaw)
    expect(next.proxies.length).toBeGreaterThan(0)
    expect(next.proxies[0].name).toBe('test-proxy')
    expect(next.extraProxies.length).toBe(next.proxies.length)
    expect(next.extraProxies[0].name).toBe('test-proxy')
  })

  it('does not throw on empty payload', () => {
    const state = createInitialState()
    expect(() => mihomoReducer(state, { type: 'IMPORT_SERIALIZED', payload: {} })).not.toThrow()
  })

  it('clones Map fields', () => {
    const state = createInitialState()
    const geosite = new Map([['youtube', { action: 'PROXY', target: 'PROXY' }]])
    const next = mihomoReducer(state, {
      type: 'IMPORT_SERIALIZED',
      payload: { rulesGeosite: geosite },
    })
    expect(next.rulesGeosite).not.toBe(geosite)
    expect(next.rulesGeosite.get('youtube')).toEqual({ action: 'PROXY', target: 'PROXY' })
  })

  it('uses p.proxies when linksRaw is absent', () => {
    const state = createInitialState()
    const proxy = { name: 'static', type: 'ss', server: 'x', port: 1 } as unknown as MihomoProxy
    const next = mihomoReducer(state, {
      type: 'IMPORT_SERIALIZED',
      payload: { proxies: [proxy] },
    })
    expect(next.proxies[0].name).toBe('static')
    expect(next.extraProxies).toHaveLength(1)
    expect(next.extraProxies[0].name).toBe('static')
  })

  it('preserves extraProxies from payload when provided', () => {
    const state = createInitialState()
    const proxy = { name: 'static', type: 'ss', server: 'x', port: 1 } as unknown as MihomoProxy
    const extra = { name: 'extra', type: 'ss', server: 'y', port: 2 } as unknown as MihomoProxy
    const proxies = [proxy]
    const extraProxies = [extra]
    const next = mihomoReducer(state, {
      type: 'IMPORT_SERIALIZED',
      payload: { proxies, extraProxies },
    })
    expect(next.proxies[0].name).toBe('static')
    expect(next.extraProxies).toHaveLength(1)
    expect(next.extraProxies[0].name).toBe('extra')
  })
})
