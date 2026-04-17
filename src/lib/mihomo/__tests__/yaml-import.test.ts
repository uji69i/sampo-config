import { describe, it, expect } from 'vitest'
import { parseYamlToState } from '../yaml-import'

describe('parseYamlToState (sniffer)', () => {
  it('parses sniffer.sniff protocols and deprecated keys', () => {
    const yaml = `
sniffer:
  enable: true
  sniff:
    TLS:
    QUIC:
      ports: [443, 8443]
    HTTP:
      ports: [80, 8080-8880]
      override-destination: true
  sniffing:
    - tls
    - http
  port-whitelist:
    - "80"
    - "443"
`.trim()

    const { state, errors } = parseYamlToState(yaml)
    expect(errors).toEqual([])
    expect(state.useSnifferSettings).toBe(true)
    expect(state.snifferSettings).toBeDefined()

    const s = state.snifferSettings!
    expect(s.enable).toBe(true)
    expect(s.sniff).toBeDefined()
    expect(s.sniff!.TLS).toBeDefined()
    expect(s.sniff!.HTTP?.ports).toEqual([80, '8080-8880'])
    expect(s.sniff!.HTTP?.overrideDestination).toBe(true)
    expect(s.sniff!.QUIC?.ports).toEqual([443, 8443])
    expect(s.sniffing).toEqual(['tls', 'http'])
    expect(s.portWhitelist).toEqual(['80', '443'])
  })
})

