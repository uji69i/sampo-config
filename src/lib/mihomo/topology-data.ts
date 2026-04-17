import type { MihomoState, RuleEntry } from './types'
import { buildRuleEntriesArray } from './state-helpers'

export interface SankeyNode {
  name: string
  /** Optional: 0 = kind, 1 = rule key, 2 = policy */
  depth?: number
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface TopologyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

export interface BuildTopologyOptions {
  /** Expand policy groups into sub-groups and providers (chain view) */
  expandChains?: boolean
}

const MAX_CHAIN_DEPTH = 4
const CHAIN_PREFIXES = ['⟩ ', '⟩⟩ ', '⟩⟩⟩ ', '⟩⟩⟩⟩ '] as const
/** Longest first for prefix stripping */
const CHAIN_PREFIXES_DESC = [...CHAIN_PREFIXES].reverse()

function depthPrefix(depth: number): string {
  return CHAIN_PREFIXES[Math.min(depth - 1, CHAIN_PREFIXES.length - 1)] ?? ''
}

function stripPrefix(name: string): string {
  for (const p of CHAIN_PREFIXES_DESC) {
    if (name.startsWith(p)) return name.slice(p.length)
  }
  return name
}

function getPrefix(name: string): string {
  for (const p of CHAIN_PREFIXES_DESC) {
    if (name.startsWith(p)) return p
  }
  return ''
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/** Whether there is a path from `from` to `to` in the graph represented by linkMap (keys "source\0target"). Used to avoid adding dialer-proxy edges that would create a cycle. */
function hasPath(linkMap: Map<string, number>, from: string, to: string): boolean {
  if (from === to) return true
  const outEdges = new Map<string, string[]>()
  for (const key of linkMap.keys()) {
    const [source, target] = key.split('\0')
    if (!outEdges.has(source)) outEdges.set(source, [])
    outEdges.get(source)!.push(target)
  }
  const visited = new Set<string>()
  const queue: string[] = [from]
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node === to) return true
    if (visited.has(node)) continue
    visited.add(node)
    const next = outEdges.get(node)
    if (next) for (const n of next) if (!visited.has(n)) queue.push(n)
  }
  return false
}

/** Build map: node name (no prefix) -> dialer-proxy target name. From subs (overrideDialerProxy) and proxies (dialer-proxy). */
function buildDialerTargetMap(state: MihomoState): Map<string, string> {
  const map = new Map<string, string>()
  for (const sub of state.subs ?? []) {
    const v = sub.overrideDialerProxy?.trim()
    if (v && sub.name?.trim()) map.set(sub.name.trim(), v)
  }
  for (const p of state.proxies ?? []) {
    const name = p.name?.trim()
    if (!name) continue
    const dialer = (p as Record<string, unknown>)['dialer-proxy']
    if (typeof dialer === 'string' && dialer.trim()) map.set(name, dialer.trim())
  }
  return map
}

/**
 * Build effective rule entries: ruleOrder (or built array) plus TEMPLATE entries for enabled service templates.
 */
function getEffectiveRuleEntries(state: MihomoState): RuleEntry[] {
  const base =
    state.ruleOrder.length > 0
      ? state.ruleOrder
      : buildRuleEntriesArray(state)

  const templateEntries: RuleEntry[] = []
  for (const tpl of state.serviceTemplates) {
    const policy = state.enabledTemplates.get(tpl.id)
    if (!policy) continue
    templateEntries.push({
      kind: 'TEMPLATE',
      key: tpl.name,
      policy,
    })
  }

  return [...base, ...templateEntries]
}

/** Prefixes to make node names unique per level and avoid cycles (Sankey requires DAG). */
const PREFIX_KIND = ''
const PREFIX_KEY = '▸ '
const PREFIX_POLICY = '→ '

/**
 * Convert MihomoState to ECharts Sankey format: nodes and links.
 * Levels: Kind (GEOSITE/GEOIP/...) -> Rule key -> Policy.
 * If expandChains is true, policy groups are expanded into sub-groups and providers (up to MAX_CHAIN_DEPTH).
 */
export function buildTopologyData(
  state: MihomoState,
  options: BuildTopologyOptions = {}
): TopologyData {
  const { expandChains = false } = options
  const entries = getEffectiveRuleEntries(state)
  const nodeSet = new Set<string>()
  const linkMap = new Map<string, number>()

  const groupNames = new Set(state.groups.map((g) => g.name))
  const groupByName = new Map(state.groups.map((g) => [g.name, g]))
  const dialerTargetByNodeName = buildDialerTargetMap(state)

  function addGroupChain(parentNodeName: string, groupName: string, depth: number): void {
    if (depth > MAX_CHAIN_DEPTH) return
    const g = groupByName.get(groupName)
    if (!g) return
    const children = uniq([
      ...(g.proxies ?? []),
      ...(g.manual ?? []),
      ...(g.useSubs ?? []),
    ])
    const prefix = depthPrefix(depth)
    for (const child of children) {
      const childNodeName = prefix + child
      nodeSet.add(childNodeName)
      const linkKey = `${parentNodeName}\0${childNodeName}`
      linkMap.set(linkKey, (linkMap.get(linkKey) ?? 0) + 1)
      if (groupNames.has(child) && depth < MAX_CHAIN_DEPTH) {
        addGroupChain(childNodeName, child, depth + 1)
      }
    }
  }

  for (const e of entries) {
    const kindNode = PREFIX_KIND + e.kind
    const keyNode = PREFIX_KEY + e.key
    const policyNode = PREFIX_POLICY + e.policy

    nodeSet.add(kindNode)
    nodeSet.add(keyNode)
    nodeSet.add(policyNode)

    const link1Key = `${kindNode}\0${keyNode}`
    linkMap.set(link1Key, (linkMap.get(link1Key) ?? 0) + 1)
    const link2Key = `${keyNode}\0${policyNode}`
    linkMap.set(link2Key, (linkMap.get(link2Key) ?? 0) + 1)

    if (expandChains && groupNames.has(e.policy)) {
      addGroupChain(policyNode, e.policy, 1)
    }
  }

  if (expandChains && dialerTargetByNodeName.size > 0) {
    for (const nodeName of Array.from(nodeSet)) {
      const rawName = stripPrefix(nodeName).trim()
      const targetName = dialerTargetByNodeName.get(rawName)
      if (!targetName || targetName === rawName) continue
      const prefix = getPrefix(nodeName)
      const targetNodeName = prefix + targetName
      if (hasPath(linkMap, targetNodeName, nodeName)) continue
      nodeSet.add(targetNodeName)
      const linkKey = `${nodeName}\0${targetNodeName}`
      linkMap.set(linkKey, (linkMap.get(linkKey) ?? 0) + 1)
    }
  }

  const nodes: SankeyNode[] = Array.from(nodeSet).map((name) => ({ name }))
  const links: SankeyLink[] = []
  for (const [linkKey, value] of linkMap) {
    const [source, target] = linkKey.split('\0')
    links.push({ source, target, value })
  }

  return { nodes, links }
}
