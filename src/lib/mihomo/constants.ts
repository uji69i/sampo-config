/** GEO files from mihomo-constructor (raywari) */
export const GEOSITE_URL =
  'https://raywari.github.io/mihomo-constructor/geo/geosite.txt'
export const GEOIP_URL =
  'https://raywari.github.io/mihomo-constructor/geo/geoip.txt'

export const MATCH_AUTO_VALUE = '__auto__'
export const AUTO_GROUP_NAME = 'auto'

export const MATCH_POLICIES = [
  { value: 'DIRECT', labelKey: 'matchPolicyDirect' as const },
  { value: 'REJECT', labelKey: 'matchPolicyReject' as const },
]

export const RULE_BLOCKS = [
  { id: 'GEOSITE' as const, label: 'GEOSITE — domain lists (geosite)' },
  { id: 'GEOIP' as const, label: 'GEOIP — countries & IP ranges' },
  { id: 'RULE-SET' as const, label: 'RULE-SET — rule-providers' },
  { id: 'MANUAL' as const, label: 'MANUAL — manual DOMAIN / IP / PROCESS' },
  { id: 'MATCH' as const, label: 'MATCH — default rule' },
]
