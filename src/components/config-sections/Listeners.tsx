import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { Listener, ListenerType } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const listenerMeta = formMeta.listeners as {
  commonFields: FormMetaField[]
  types: Record<string, { fields: FormMetaField[] }>
}

const commonFields = listenerMeta.commonFields
const typeField = commonFields.find((f) => f.key === 'type')
const LISTENER_TYPE_OPTIONS: ListenerType[] = (typeField?.enum ?? []) as ListenerType[]

function getTypeFields(listenerType: string): FormMetaField[] {
  const typeConfig = listenerMeta.types[listenerType]
  return typeConfig?.fields ?? []
}

interface ListenersProps {
  listeners: Listener[]
  useListeners: boolean
  useAdvancedListenersYaml: boolean
  advancedListenersYaml: string
  customListenersYaml: string
  policyOptions: Array<{ value: string; label: string }>
  onUseToggle: (enabled: boolean) => void
  onAddListener: (listener: Listener) => void
  onUpdateListener: (index: number, patch: Partial<Listener>) => void
  onRemoveListener: (index: number) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

export function Listeners({
  listeners,
  useListeners,
  useAdvancedListenersYaml,
  advancedListenersYaml,
  customListenersYaml,
  policyOptions,
  onUseToggle,
  onAddListener,
  onUpdateListener,
  onRemoveListener,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: ListenersProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const newTypeOption = typeField?.enum?.[0] ?? 'mixed'
  const [newType, setNewType] = useState<ListenerType>((newTypeOption as ListenerType) ?? 'mixed')

  const handleAdd = () => {
    const name = `listener-${listeners.length + 1}`
    const port = 7000 + listeners.length
    const listenDefault = (commonFields.find((f) => f.key === 'listen')?.default as string) ?? '0.0.0.0'
    const udpDefault = newType === 'mixed' || newType === 'socks'
    onAddListener({
      name,
      type: newType,
      port,
      listen: listenDefault,
      udp: udpDefault,
    })
  }

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.listenersTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useListeners}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('mihomo.listenersSub')}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('mihomo.listenersAdvancedYaml')}</span>
              <Switch checked={useAdvancedListenersYaml} onCheckedChange={onAdvancedToggle} />
            </div>
            {useAdvancedListenersYaml ? (
              <Textarea
                value={advancedListenersYaml}
                onChange={(e) => onAdvancedYamlChange(e.target.value)}
                className="font-mono text-sm"
                spellCheck={false}
                rows={12}
                placeholder="listeners:\n  - name: mixed-in\n    type: mixed\n    port: 7080\n    listen: 0.0.0.0\n    udp: true"
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 rounded-lg border border-border p-3">
                    <Label className="text-sm text-muted-foreground shrink-0">
                      {typeField ? t(typeField.i18nKey) : t('mihomo.listenersType')}
                    </Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as ListenerType)}>
                      <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LISTENER_TYPE_OPTIONS.map((ty) => (
                          <SelectItem key={ty} value={ty}>
                            {ty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={handleAdd} className="shrink-0">
                      {t('mihomo.listenersAddButton')}
                    </Button>
                </div>
                <div className="space-y-3">
                  {listeners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('mihomo.listenersEmpty')}</p>
                  ) : (
                    listeners.map((l, idx) => {
                      const typeFields = getTypeFields(l.type)
                      const extra = l.extraFields ?? {}
                      const cardTitle = (l.name && String(l.name).trim()) || `Listener ${idx + 1}`
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-border bg-muted/30 p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate min-w-0" title={cardTitle}>
                              {cardTitle}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() => onRemoveListener(idx)}
                              aria-label={t('mihomo.remove')}
                            >
                              ×
                            </Button>
                          </div>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {commonFields.map((field) => {
                              const value = l[field.key as keyof Listener] ?? field.default
                              const onChangeCommon = (v: unknown) => {
                                if (field.key === 'name' && (v === '' || v == null)) {
                                  onUpdateListener(idx, { name: l.name })
                                  return
                                }
                                onUpdateListener(idx, { [field.key]: v } as Partial<Listener>)
                              }
                              return (
                                <div key={field.key} className="min-w-0">
                                  <FormFieldByMeta
                                    field={field}
                                    value={value}
                                    onChange={onChangeCommon}
                                    idPrefix={`listener-${idx}`}
                                    policyOptions={field.key === 'proxy' ? policyOptions : undefined}
                                    inputMin={field.key === 'port' ? 1 : undefined}
                                    inputMax={field.key === 'port' ? 65535 : undefined}
                                  />
                                </div>
                              )
                            })}
                          </div>
                          {typeFields.length > 0 && (
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-3 border-t border-border">
                              {typeFields.map((field) => (
                                <div key={field.key} className="min-w-0">
                                  <FormFieldByMeta
                                    field={field}
                                    value={extra[field.yamlKey] ?? field.default}
                                    onChange={(v) =>
                                      onUpdateListener(idx, {
                                        extraFields: { ...l.extraFields, [field.yamlKey]: v },
                                      })
                                    }
                                    idPrefix={`listener-${idx}-extra`}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
              <Textarea
                value={customListenersYaml}
                onChange={(e) => onCustomYamlChange(e.target.value)}
                className="font-mono text-sm"
                spellCheck={false}
                rows={4}
              />
            </div>
      </div>
    </SectionCollapsible>
  )
}
