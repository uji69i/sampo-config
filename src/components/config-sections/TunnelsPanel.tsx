import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { TunnelEntry, TunnelEntryObject } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const tunnelMeta = (formMeta as { tunnels?: { fields: FormMetaField[] } }).tunnels
const tunnelFields: FormMetaField[] = tunnelMeta?.fields ?? [
  { key: 'network', yamlKey: 'network', type: 'array', required: false, i18nKey: 'mihomo.form.tunnels.network' },
  { key: 'address', yamlKey: 'address', type: 'string', required: false, i18nKey: 'mihomo.form.tunnels.address' },
  { key: 'target', yamlKey: 'target', type: 'string', required: false, i18nKey: 'mihomo.form.tunnels.target' },
  { key: 'proxy', yamlKey: 'proxy', type: 'string', required: false, i18nKey: 'mihomo.form.tunnels.proxy' },
]

interface TunnelsPanelProps {
  tunnels: TunnelEntry[]
  useTunnels: boolean
  useAdvancedTunnelsYaml: boolean
  advancedTunnelsYaml: string
  customTunnelsYaml: string
  policyOptions?: Array<{ value: string; label: string }>
  onUseToggle: (enabled: boolean) => void
  onAddTunnel: (entry: TunnelEntry) => void
  onUpdateTunnel: (index: number, entry: TunnelEntry | Partial<TunnelEntryObject>) => void
  onRemoveTunnel: (index: number) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

export function TunnelsPanel({
  tunnels,
  useTunnels,
  useAdvancedTunnelsYaml,
  advancedTunnelsYaml,
  customTunnelsYaml,
  policyOptions,
  onUseToggle,
  onAddTunnel,
  onUpdateTunnel,
  onRemoveTunnel,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: TunnelsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const defaultObjectEntry: TunnelEntryObject = {
    network: [],
    address: '',
    target: '',
    proxy: '',
  }

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.tunnelsTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useTunnels}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('mihomo.tunnelsSub')}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('mihomo.tunnelsAdvancedYaml')}</span>
              <Switch checked={useAdvancedTunnelsYaml} onCheckedChange={onAdvancedToggle} />
            </div>
            {useAdvancedTunnelsYaml ? (
              <Textarea
                value={advancedTunnelsYaml}
                onChange={(e) => onAdvancedYamlChange(e.target.value)}
                className="font-mono text-sm"
                spellCheck={false}
                rows={10}
                placeholder="tunnels:\n  - tcp/udp,127.0.0.1:6553,114.114.114.114:53,proxy\n  - network: [tcp, udp]\n    address: 127.0.0.1:7777\n    target: target.com\n    proxy: proxy"
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                  <Button type="button" onClick={() => onAddTunnel(defaultObjectEntry)}>
                    {t('mihomo.tunnelsAddButton')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onAddTunnel('tcp,127.0.0.1:8080,target:80,proxy')}
                  >
                    {t('mihomo.tunnelsAddOneLine')}
                  </Button>
                </div>
                <div className="space-y-3">
                  {tunnels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('mihomo.tunnelsEmpty')}</p>
                  ) : (
                    tunnels.map((entry, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                      >
                        {typeof entry === 'string' ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={entry}
                              onChange={(e) => onUpdateTunnel(idx, e.target.value)}
                              className="font-mono text-sm flex-1"
                              placeholder="tcp/udp,127.0.0.1:6553,114.114.114.114:53,proxy"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveTunnel(idx)}
                              aria-label={t('mihomo.remove')}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {tunnelFields.map((field) => {
                              const value = (entry as unknown as Record<string, unknown>)[field.key] ?? field.default
                              const onChange = (v: unknown) => {
                                if (field.key === 'network') {
                                  onUpdateTunnel(idx, { network: Array.isArray(v) ? v : [] })
                                  return
                                }
                                onUpdateTunnel(idx, { [field.key]: v } as Partial<TunnelEntryObject>)
                              }
                              return (
                                <FormFieldByMeta
                                  key={field.key}
                                  field={field}
                                  value={value}
                                  onChange={onChange}
                                  idPrefix={`tunnel-${idx}`}
                                  policyOptions={field.key === 'proxy' ? policyOptions : undefined}
                                />
                              )
                            })}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveTunnel(idx)}
                              aria-label={t('mihomo.remove')}
                            >
                              ×
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
              <Textarea
                value={customTunnelsYaml}
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
