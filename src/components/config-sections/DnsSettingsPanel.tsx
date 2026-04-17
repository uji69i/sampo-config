import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { DnsSettings } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { resolveStateKey } from '@/lib/mihomo/form-meta-utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'
import { Textarea } from '@/components/ui/textarea'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const dnsFields = (formMeta.dns as { fields: FormMetaField[] }).fields

/** Complex fields rendered only in advanced YAML (object/structured in state) */
const COMPLEX_DNS_KEYS = new Set(['fallback_filter', 'nameserver_policy', 'proxy_server_nameserver_policy'])

const simpleDnsFields = dnsFields.filter((f) => !COMPLEX_DNS_KEYS.has(f.key))

interface DnsSettingsPanelProps {
  settings: DnsSettings
  useDnsSettings: boolean
  advancedDnsYaml: string
  useAdvancedDnsYaml: boolean
  customDnsYaml: string
  onSettingsChange: (patch: Partial<DnsSettings>) => void
  onUseToggle: (enabled: boolean) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

export function DnsSettingsPanel({
  settings,
  useDnsSettings,
  advancedDnsYaml,
  useAdvancedDnsYaml,
  customDnsYaml,
  onSettingsChange,
  onUseToggle,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: DnsSettingsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.dnsSettingsTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useDnsSettings}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('mihomo.dnsAdvancedYaml')}</span>
          <Switch checked={useAdvancedDnsYaml} onCheckedChange={onAdvancedToggle} />
        </div>
        {useAdvancedDnsYaml ? (
          <Textarea
            value={advancedDnsYaml}
            onChange={(e) => onAdvancedYamlChange(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
            rows={10}
            placeholder="dns:\n  enable: true\n  nameserver:\n    - tls://1.1.1.1"
          />
        ) : (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {simpleDnsFields.map((field) => {
              const stateKey = resolveStateKey(field) as keyof DnsSettings
              const value = settings[stateKey] ?? field.default
              const emptyOptionForEnum = field.key === 'cache_algorithm'
              return (
                <FormFieldByMeta
                  key={field.key}
                  field={field}
                  value={value}
                  onChange={(v) => onSettingsChange({ [stateKey]: v } as Partial<DnsSettings>)}
                  idPrefix="dns"
                  emptyOptionForEnum={emptyOptionForEnum}
                />
              )
            })}
          </div>
        )}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
          <Textarea
            value={customDnsYaml}
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
