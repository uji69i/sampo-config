const META_RULES_BASE =
  'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/release/'
const META_RULES_RELEASE =
  'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/'

export interface GeoPreset {
  value: string
  comment: string
}

export const MMDB_PRESETS: GeoPreset[] = [
  { value: `${META_RULES_BASE}GeoLite2-ASN.mmdb`, comment: 'GeoLite2-ASN (ASN lookup)' },
  { value: `${META_RULES_BASE}country-lite.mmdb`, comment: 'country-lite (lightweight)' },
  { value: `${META_RULES_BASE}country.mmdb`, comment: 'country (full)' },
]

export const ASN_PRESETS: GeoPreset[] = [
  { value: `${META_RULES_RELEASE}GeoLite2-ASN.mmdb`, comment: 'GeoLite2-ASN.mmdb (latest)' },
  { value: `${META_RULES_BASE}GeoLite2-ASN.mmdb`, comment: 'GeoLite2-ASN.mmdb (release branch)' },
]

export const GEOIP_PRESETS: GeoPreset[] = [
  { value: `${META_RULES_BASE}geoip-lite.dat`, comment: 'geoip-lite.dat' },
  { value: `${META_RULES_BASE}geoip-lite.db`, comment: 'geoip-lite.db' },
  { value: `${META_RULES_BASE}geoip-lite.metadb`, comment: 'geoip-lite.metadb' },
  { value: `${META_RULES_BASE}geoip.dat`, comment: 'geoip.dat' },
  { value: `${META_RULES_BASE}geoip.db`, comment: 'geoip.db' },
  { value: `${META_RULES_BASE}geoip.metadb`, comment: 'geoip.metadb' },
]

export const GEOSITE_PRESETS: GeoPreset[] = [
  { value: `${META_RULES_BASE}geosite-lite.dat`, comment: 'geosite-lite.dat' },
  { value: `${META_RULES_BASE}geosite-lite.db`, comment: 'geosite-lite.db' },
  { value: `${META_RULES_BASE}geosite.dat`, comment: 'geosite.dat' },
  { value: `${META_RULES_BASE}geosite.db`, comment: 'geosite.db' },
]
