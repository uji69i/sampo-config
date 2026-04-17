import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { MihomoProxy } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const proxyMeta = formMeta.proxies as {
  commonFields: FormMetaField[]
  types: Record<string, { fields: FormMetaField[] }>
} | undefined

const commonFields = proxyMeta?.commonFields ?? []
const typeField = commonFields.find((f) => f.key === 'type')
const PROXY_TYPE_OPTIONS: string[] = (typeField?.enum ?? []) as string[]

function getTypeFields(proxyType: string): FormMetaField[] {
  if (!proxyMeta?.types) return []
  const typeConfig = proxyMeta.types[proxyType]
  return typeConfig?.fields ?? []
}

function getProxyFieldValue(proxy: MihomoProxy, field: FormMetaField): unknown {
  if (field.yamlKey.includes('.')) {
    const parts = field.yamlKey.split('.')
    let cur: unknown = proxy
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return field.default
      cur = (cur as Record<string, unknown>)[p]
    }
    return cur ?? field.default
  }
  const yamlVal = proxy[field.yamlKey]
  if (yamlVal !== undefined) return yamlVal
  if (field.stateKey && proxy[field.stateKey] !== undefined) return proxy[field.stateKey]
  return field.default
}

function buildPatchForField(
  proxy: MihomoProxy,
  field: FormMetaField,
  value: unknown
): Partial<MihomoProxy> {
  if (field.yamlKey.includes('.')) {
    const parts = field.yamlKey.split('.')
    const prefix = parts[0]!
    const rest = parts.slice(1).join('.')
    const existing = (proxy[prefix] as Record<string, unknown>) ?? {}
    return {
      [prefix]: { ...existing, [rest]: value },
    } as Partial<MihomoProxy>
  }
  return { [field.yamlKey]: value } as Partial<MihomoProxy>
}

function buildDefaultProxy(proxyType: string): MihomoProxy {
  const base: MihomoProxy = {
    name: 'proxy-1',
    type: proxyType,
    server: '',
    port: 443,
  }
  const typeFields = getTypeFields(proxyType)
  for (const field of typeFields) {
    if (field.default === undefined) continue
    if (field.yamlKey.includes('.')) {
      const parts = field.yamlKey.split('.')
      const prefix = parts[0]!
      const rest = parts.slice(1).join('.')
      const existing = (base[prefix] as Record<string, unknown>) ?? {}
      ;(base as Record<string, unknown>)[prefix] = { ...existing, [rest]: field.default }
    } else {
      ;(base as Record<string, unknown>)[field.yamlKey] = field.default
    }
  }
  return base
}

interface ManualProxiesPanelProps {
  extraProxies: MihomoProxy[]
  onAddProxy: (proxy: MihomoProxy) => void
  onUpdateProxy: (index: number, patch: Partial<MihomoProxy>) => void
  onRemoveProxy: (index: number) => void
}

export function ManualProxiesPanel({
  extraProxies,
  onAddProxy,
  onUpdateProxy,
  onRemoveProxy,
}: ManualProxiesPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const newTypeOption = PROXY_TYPE_OPTIONS[0] ?? 'ss'
  const [newType, setNewType] = useState<string>(newTypeOption)

  const handleAdd = () => {
    const name = `proxy-${extraProxies.length + 1}`
    const defaultProxy = buildDefaultProxy(newType)
    onAddProxy({ ...defaultProxy, name })
  }

  if (!proxyMeta) {
    return null
  }

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.manualProxiesTitle')}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('mihomo.manualProxiesSub')}</p>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <Label className="text-sm text-muted-foreground">
                  {typeField ? t(typeField.i18nKey) : t('mihomo.manualProxiesType')}
                </Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROXY_TYPE_OPTIONS.map((ty) => (
                      <SelectItem key={ty} value={ty}>
                        {ty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <Button type="button" onClick={handleAdd}>
                {t('mihomo.manualProxiesAdd')}
              </Button>
            </div>
            <div className="space-y-3">
              {extraProxies.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('mihomo.manualProxiesEmpty')}</p>
              ) : (
                extraProxies.map((proxy, idx) => {
                  const typeFields = getTypeFields(proxy.type ?? 'ss')
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{proxy.name || `proxy-${idx + 1}`}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveProxy(idx)}
                          aria-label={t('mihomo.remove')}
                          className="shrink-0"
                        >
                          ×
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {commonFields.map((field) => {
                          const value = getProxyFieldValue(proxy, field)
                          const onChangeCommon = (v: unknown) => {
                            if (field.key === 'name' && (v === '' || v == null)) {
                              onUpdateProxy(idx, { name: proxy.name })
                              return
                            }
                            const patch = buildPatchForField(proxy, field, v)
                            onUpdateProxy(idx, patch)
                          }
                          return (
                            <FormFieldByMeta
                              key={field.key}
                              field={field}
                              value={value}
                              onChange={onChangeCommon}
                              idPrefix={`proxy-${idx}`}
                              inputMin={field.key === 'port' ? 1 : undefined}
                              inputMax={field.key === 'port' ? 65535 : undefined}
                            />
                          )
                        })}
                      </div>
                      {typeFields.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          {typeFields.map((field) => {
                            const value = getProxyFieldValue(proxy, field)
                            return (
                              <FormFieldByMeta
                                key={field.key}
                                field={field}
                                value={value}
                                onChange={(v) => {
                                  const patch = buildPatchForField(proxy, field, v)
                                  onUpdateProxy(idx, patch)
                                }}
                                idPrefix={`proxy-${idx}-extra`}
                                inputMin={field.key === 'port' ? 1 : undefined}
                                inputMax={field.key === 'port' ? 65535 : undefined}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
      </div>
    </SectionCollapsible>
  )
}
