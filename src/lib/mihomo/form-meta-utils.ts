import type { FormMetaField } from './form-meta-types'

export function resolveStateKey(field: FormMetaField): string {
  return field.stateKey ?? field.key
}

export function buildYamlToStateMap(
  fields: FormMetaField[]
): Record<string, { stateKey: string; type: string; default?: unknown }> {
  const map: Record<string, { stateKey: string; type: string; default?: unknown }> = {}
  for (const f of fields) {
    map[f.yamlKey] = {
      stateKey: resolveStateKey(f),
      type: f.type,
      default: f.default,
    }
  }
  return map
}

export function buildStateToYamlMap(fields: FormMetaField[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of fields) {
    map[resolveStateKey(f)] = f.yamlKey
  }
  return map
}

function yamlQuote(s: string | null | undefined): string | null {
  if (s == null) return null
  const cleaned = String(s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  return `"${cleaned}"`
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function coerceValue(value: unknown, type: string, defaultVal: unknown): unknown {
  if (value === undefined || value === null) return defaultVal
  switch (type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : value === 'true' || value === true
    case 'number':
      return typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : defaultVal
    case 'array':
      return Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\n/).map((s) => s.trim()).filter(Boolean) : defaultVal
    case 'string':
    default:
      return typeof value === 'string' ? value : String(value)
  }
}

/**
 * Emit YAML lines for flat (and nested) fields from state using form-meta.
 * State keys are camelCase (stateKey); output uses yamlKey (kebab-case, may contain '.').
 */
export function emitFieldsToYaml(
  fields: FormMetaField[],
  state: Record<string, unknown>,
  baseIndent = 0
): string[] {
  const lines: string[] = []
  const nestedByPrefix: Record<string, FormMetaField[]> = {}
  const flat: FormMetaField[] = []

  for (const f of fields) {
    if (f.yamlKey.includes('.')) {
      const prefix = f.yamlKey.split('.')[0]!
      if (!nestedByPrefix[prefix]) nestedByPrefix[prefix] = []
      nestedByPrefix[prefix].push(f)
    } else {
      flat.push(f)
    }
  }

  function emitLine(text: string, indent: number) {
    lines.push(' '.repeat(baseIndent + indent) + text)
  }

  for (const field of flat) {
    const stateKey = resolveStateKey(field)
    let value = state[stateKey]
    if (value === undefined) value = field.default
    if (value == null && field.type !== 'boolean') continue
    if (field.type === 'boolean' && value == null) value = field.default ?? false
    if (value === '' && field.type === 'string' && field.key !== 'password') continue

    if (field.type === 'boolean') {
      emitLine(`${field.yamlKey}: ${value ? 'true' : 'false'}`, 0)
      continue
    }
    if (field.type === 'number') {
      if (typeof value !== 'number') continue
      emitLine(`${field.yamlKey}: ${value}`, 0)
      continue
    }
    if (field.type === 'array') {
      const arr = Array.isArray(value) ? value as string[] : []
      if (arr.length === 0) continue
      emitLine(`${field.yamlKey}:`, 0)
      for (const it of arr) emitLine(`- ${yamlQuote(it) ?? '""'}`, 2)
      continue
    }
    emitLine(`${field.yamlKey}: ${yamlQuote(String(value)) ?? '""'}`, 0)
  }

  for (const [prefix, nestedFields] of Object.entries(nestedByPrefix)) {
    const innerLines: string[] = []
    for (const field of nestedFields) {
      const stateKey = resolveStateKey(field)
      let value = state[stateKey]
      if (value === undefined) value = field.default
      const suffix = field.yamlKey.slice(prefix.length + 1)
      if (field.type === 'boolean') {
        if (value == null) value = field.default ?? false
        innerLines.push(' '.repeat(2) + `${suffix}: ${value ? 'true' : 'false'}`)
        continue
      }
      if (field.type === 'array') {
        const arr = Array.isArray(value) ? (value as string[]) : []
        if (arr.length === 0) continue
        innerLines.push(' '.repeat(2) + `${suffix}:`)
        for (const it of arr) {
          innerLines.push(' '.repeat(4) + `- ${yamlQuote(it) ?? '""'}`)
        }
        continue
      }
      if (value == null || value === '') continue
      if (field.type === 'number') {
        innerLines.push(' '.repeat(2) + `${suffix}: ${value}`)
        continue
      }
      innerLines.push(' '.repeat(2) + `${suffix}: ${yamlQuote(String(value)) ?? '""'}`)
    }
    if (innerLines.length > 0) {
      emitLine(`${prefix}:`, 0)
      for (const line of innerLines) {
        lines.push(' '.repeat(baseIndent) + line)
      }
    }
  }

  return lines
}

/**
 * Parse flat (and nested) YAML object into state using form-meta mapping.
 * yamlKey may contain '.' for nested keys.
 */
export function parseYamlToStateFields(
  fields: FormMetaField[],
  yamlObj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const f of fields) {
    const raw = getByPath(yamlObj, f.yamlKey)
    const stateKey = resolveStateKey(f)
    result[stateKey] = coerceValue(raw, f.type, f.default)
  }
  return result
}
