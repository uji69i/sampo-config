import { describe, it, expect } from 'vitest'
import { parse as yamlParse } from 'yaml'
import { createInitialState, mihomoReducer } from '../mihomoReducer'
import { buildFullConfig } from '@/lib/mihomo/yaml-gen'

describe('full-config', () => {
  it('buildFullConfig produces parseable YAML with proxies, groups, rules', () => {
    let state = createInitialState()
    state = mihomoReducer(state, { type: 'SET_USE_GENERAL_SETTINGS', payload: true })
    state = mihomoReducer(state, {
      type: 'SET_GENERAL_SETTINGS',
      payload: { mode: 'rule', mixedPort: 7890 },
    })
    state = mihomoReducer(state, {
      type: 'SET_GROUPS',
      payload: [
        { name: 'PROXY', type: 'select', proxies: [], manual: [] },
      ],
    })
    state = mihomoReducer(state, {
      type: 'SET_RULE_ORDER',
      payload: [{ kind: 'MATCH', key: 'MATCH', policy: 'PROXY' }],
    })
    state = mihomoReducer(state, {
      type: 'ADD_MANUAL_RULE',
      payload: { type: 'DOMAIN-SUFFIX', value: 'example.com', policy: 'DIRECT' },
    })
    state = mihomoReducer(state, {
      type: 'IMPORT_YAML',
      payload: {
        proxies: [
          { name: 'p1', type: 'vless', server: 's.example.com', port: 443, uuid: 'u1' },
        ],
      },
    })
    state = mihomoReducer(state, {
      type: 'SET_GROUPS',
      payload: [
        { name: 'PROXY', type: 'select', proxies: ['p1'], manual: [] },
      ],
    })

    const yamlString = buildFullConfig(state, {})
    expect(yamlString).toBeTruthy()

    const parsed = yamlParse(yamlString) as Record<string, unknown>
    expect(parsed).toHaveProperty('mode')
    expect(parsed).toHaveProperty('proxy-groups')
    expect(parsed).toHaveProperty('rules')
    expect(Array.isArray(parsed['proxy-groups'])).toBe(true)
    expect(Array.isArray(parsed['rules'])).toBe(true)
    expect((parsed['proxy-groups'] as unknown[]).length).toBeGreaterThanOrEqual(1)
    expect((parsed['rules'] as unknown[]).length).toBeGreaterThanOrEqual(1)
  })
})
