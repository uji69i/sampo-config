import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { SnifferSettings } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { resolveStateKey } from '@/lib/mihomo/form-meta-utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const snifferFields = (formMeta.sniffer as { fields: FormMetaField[] } | undefined)?.fields ?? []

interface SnifferSettingsPanelProps {
  settings: SnifferSettings
  useSnifferSettings: boolean
  advancedSnifferYaml: string
  useAdvancedSnifferYaml: boolean
  customSnifferYaml: string
  onSettingsChange: (patch: Partial<SnifferSettings>) => void
  onUseToggle: (enabled: boolean) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

export function SnifferSettingsPanel({
  settings,
  useSnifferSettings,
  advancedSnifferYaml,
  useAdvancedSnifferYaml,
  customSnifferYaml,
  onSettingsChange,
  onUseToggle,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: SnifferSettingsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const regularFields = snifferFields.filter((f) => !f.deprecated)
  const deprecatedFields = snifferFields.filter((f) => f.deprecated)

  const sniff = settings.sniff ?? {}

  const setProtocolEnabled = (proto: 'HTTP' | 'TLS' | 'QUIC', enabled: boolean) => {
    const next = { ...(settings.sniff ?? {}) } as NonNullable<SnifferSettings['sniff']>
    if (enabled) {
      next[proto] = (next[proto] ?? {}) as NonNullable<SnifferSettings['sniff']>[typeof proto]
    } else {
      delete next[proto]
    }
    const hasAny = Object.keys(next).length > 0
    onSettingsChange({ sniff: hasAny ? next : undefined })
  }

  const setProtocolPorts = (proto: 'HTTP' | 'TLS' | 'QUIC', text: string) => {
    const next = { ...(settings.sniff ?? {}) } as NonNullable<SnifferSettings['sniff']>
    const cfg = { ...(next[proto] ?? {}) }
    const ports = text
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (/^\d+$/.test(s) ? parseInt(s, 10) : s))
    cfg.ports = ports.length ? ports : undefined
    next[proto] = cfg
    onSettingsChange({ sniff: next })
  }

  const setProtocolOverrideDestination = (
    proto: 'HTTP' | 'TLS' | 'QUIC',
    mode: 'inherit' | 'true' | 'false'
  ) => {
    const next = { ...(settings.sniff ?? {}) } as NonNullable<SnifferSettings['sniff']>
    const cfg = { ...(next[proto] ?? {}) }
    cfg.overrideDestination = mode === 'inherit' ? undefined : mode === 'true'
    next[proto] = cfg
    onSettingsChange({ sniff: next })
  }

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.snifferSettingsTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useSnifferSettings}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('mihomo.snifferAdvancedYaml')}</span>
          <Switch checked={useAdvancedSnifferYaml} onCheckedChange={onAdvancedToggle} />
        </div>

        {useAdvancedSnifferYaml ? (
          <Textarea
            value={advancedSnifferYaml}
            onChange={(e) => onAdvancedYamlChange(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
            rows={12}
            placeholder={[
              'sniffer:',
              '  enable: true',
              '  force-dns-mapping: true',
              '  parse-pure-ip: true',
              '  override-destination: false',
              '  sniff:',
              '    HTTP:',
              '      ports: [80, 8080-8880]',
              '      override-destination: true',
              '    TLS:',
              '      ports: [443, 8443]',
              '    QUIC:',
              '      ports: [443, 8443]',
              '  # sniffing: [tls, http] # deprecated',
              '  # port-whitelist: ["80", "443"] # deprecated',
            ].join('\n')}
          />
        ) : (
          <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              {regularFields.map((field) => {
                const stateKey = resolveStateKey(field) as keyof SnifferSettings
                const value = settings[stateKey] ?? field.default
                return (
                  <FormFieldByMeta
                    key={field.key}
                    field={field}
                    value={value}
                    onChange={(v) => onSettingsChange({ [stateKey]: v } as Partial<SnifferSettings>)}
                    idPrefix="sniffer"
                  />
                )
              })}
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{t('mihomo.snifferSniffTitle')}</div>

              {(['HTTP', 'TLS', 'QUIC'] as const).map((proto) => {
                const enabled = settings.sniff != null && proto in sniff
                const cfg = (sniff as NonNullable<SnifferSettings['sniff']>)[proto] ?? {}
                const portsText = Array.isArray(cfg.ports) ? cfg.ports.map(String).join('\n') : ''
                const od: 'inherit' | 'true' | 'false' =
                  typeof cfg.overrideDestination === 'boolean'
                    ? cfg.overrideDestination
                      ? 'true'
                      : 'false'
                    : 'inherit'

                return (
                  <div key={proto} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{proto}</div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => setProtocolEnabled(proto, Boolean(v))}
                      />
                    </div>

                    {enabled && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <div className="text-xs text-muted-foreground">
                            {t('mihomo.snifferSniffPorts')}
                          </div>
                          <Textarea
                            value={portsText}
                            onChange={(e) => setProtocolPorts(proto, e.target.value)}
                            className="font-mono text-sm min-h-[88px]"
                            spellCheck={false}
                            placeholder={t('mihomo.snifferSniffPortsPlaceholder')}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-xs text-muted-foreground">
                            {t('mihomo.snifferSniffOverrideDestination')}
                          </div>
                          <Select
                            value={od}
                            onValueChange={(v) =>
                              setProtocolOverrideDestination(
                                proto,
                                v as 'inherit' | 'true' | 'false'
                              )
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">{t('mihomo.snifferInherit')}</SelectItem>
                              <SelectItem value="true">{t('mihomo.snifferTrue')}</SelectItem>
                              <SelectItem value="false">{t('mihomo.snifferFalse')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {deprecatedFields.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{t('mihomo.deprecatedSettings')}</div>
                {deprecatedFields.map((field) => {
                  const stateKey = resolveStateKey(field) as keyof SnifferSettings
                  const value = settings[stateKey] ?? field.default
                  return (
                    <FormFieldByMeta
                      key={field.key}
                      field={field}
                      value={value}
                      onChange={(v) => onSettingsChange({ [stateKey]: v } as Partial<SnifferSettings>)}
                      idPrefix="sniffer"
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
          <Textarea
            value={customSnifferYaml}
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
