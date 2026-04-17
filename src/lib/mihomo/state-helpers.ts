import { AUTO_GROUP_NAME } from './constants'
import type { MihomoProxy, ProxyGroup, MihomoState, RuleEntry } from './types'

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

export function getMatchPolicyTarget(state: MihomoState): string {
  const { match, groups } = state
  if (match.mode === 'builtin' && match.value) return match.value
  if (match.mode === 'group' && match.value) {
    const hasGroup = groups.some((g) => g.name === match.value)
    if (hasGroup) return match.value
  }
  const autoGroup = groups.find((g) => g.name === AUTO_GROUP_NAME)
  if (autoGroup?.name) return autoGroup.name
  if (groups.length) return groups[0].name
  return 'DIRECT'
}

export function buildRuleEntriesArray(state: MihomoState): RuleEntry[] {
  const entries: RuleEntry[] = []

  for (const [name, r] of state.rulesGeosite.entries()) {
    entries.push({
      kind: 'GEOSITE',
      key: name,
      policy: r.target,
    })
  }
  for (const [code, r] of state.rulesGeoip.entries()) {
    entries.push({
      kind: 'GEOIP',
      key: code,
      policy: r.target,
    })
  }
  if (state.ruleProviders?.length) {
    for (const rp of state.ruleProviders) {
      if (!rp.policy) continue
      entries.push({
        kind: 'RULE-SET',
        key: rp.name,
        policy: rp.policy,
      })
    }
  }
  for (const r of state.manualRules || []) {
    entries.push({
      kind: 'MANUAL',
      key: `${r.type},${r.value}`,
      policy: r.policy,
    })
  }
  entries.push({
    kind: 'MATCH',
    key: 'MATCH',
    policy: getMatchPolicyTarget(state),
  })
  return entries
}

export function ensureAutoProxyGroup(state: MihomoState): void {
  if (!state.proxies.length && !state.subs.length) return
  let g = state.groups.find((gr) => gr.name === AUTO_GROUP_NAME)
  if (!g) {
    g = {
      name: AUTO_GROUP_NAME,
      type: 'select',
      icon: '',
      proxies: [],
      manual: [],
      useSubs: [],
    }
    state.groups.unshift(g)
  }
  const allProxyNames = state.proxies.map((p) => p.name).filter(Boolean) as string[]
  const prevProxies = (g.proxies || []).filter((n) => allProxyNames.includes(n))
  g.proxies = uniq([...prevProxies, ...allProxyNames])
  if (state.subs?.length) {
    const allSubsNames = state.subs.map((s) => s.name)
    const prevUse = (g.useSubs || []).filter((n) => allSubsNames.includes(n))
    g.useSubs = uniq([...prevUse, ...allSubsNames])
  } else {
    g.useSubs = []
  }
}

export function resolveProxyNameConflicts(
  proxies: MihomoProxy[],
  groups: ProxyGroup[]
): void {
  if (!proxies?.length) return
  const usedNames = new Set<string>()
  const baseCounters: Record<string, number> = {}
  const baseToNewNames: Record<string, string[]> = {}
  for (const p of proxies) {
    if (!p) continue
    let base = p.name != null ? String(p.name).trim() : ''
    if (!base) base = 'proxy'
    let newName = base
    if (usedNames.has(newName)) {
      let idx = baseCounters[base] ?? 1
      while (usedNames.has(base + '_' + idx)) idx++
      newName = base + '_' + idx
      baseCounters[base] = idx + 1
    } else {
      baseCounters[base] = baseCounters[base] ?? 1
    }
    usedNames.add(newName)
    if (!baseToNewNames[base]) baseToNewNames[base] = []
    baseToNewNames[base].push(newName)
    p.name = newName
  }
  if (!groups?.length) return
  const remapList = (list: string[]): string[] => {
    if (!Array.isArray(list)) return list
    const usagePerBase: Record<string, number> = {}
    return list.map((n) => {
      const base = n != null ? String(n).trim() : ''
      const variants = baseToNewNames[base]
      if (!variants?.length) return n
      const used = usagePerBase[base] ?? 0
      const idx = used < variants.length ? used : variants.length - 1
      usagePerBase[base] = used + 1
      return variants[idx]
    })
  }
  for (const gr of groups) {
    if (!gr) continue
    if (gr.proxies) gr.proxies = remapList(gr.proxies)
    if (gr.manual) gr.manual = remapList(gr.manual)
  }
}
