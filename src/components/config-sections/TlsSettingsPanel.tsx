import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { TlsSettings } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { resolveStateKey } from '@/lib/mihomo/form-meta-utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'
import { Textarea } from '@/components/ui/textarea'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const tlsFields = (formMeta.tls as { fields: FormMetaField[] } | undefined)?.fields ?? []

interface TlsSettingsPanelProps {
  settings: TlsSettings
  useTlsSettings: boolean
  advancedTlsYaml: string
  useAdvancedTlsYaml: boolean
  customTlsYaml: string
  onSettingsChange: (patch: Partial<TlsSettings>) => void
  onUseToggle: (enabled: boolean) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

export function TlsSettingsPanel({
  settings,
  useTlsSettings,
  advancedTlsYaml,
  useAdvancedTlsYaml,
  customTlsYaml,
  onSettingsChange,
  onUseToggle,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: TlsSettingsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.tlsSettingsTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useTlsSettings}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('mihomo.tlsAdvancedYaml')}</span>
          <Switch checked={useAdvancedTlsYaml} onCheckedChange={onAdvancedToggle} />
        </div>
        {useAdvancedTlsYaml ? (
          <Textarea
            value={advancedTlsYaml}
            onChange={(e) => onAdvancedYamlChange(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
            rows={10}
            placeholder="tls:\n  certificate: /path/to/cert.pem\n  private-key: /path/to/key.pem"
          />
        ) : (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {tlsFields.map((field) => {
              const stateKey = resolveStateKey(field) as keyof TlsSettings
              const value = settings[stateKey] ?? field.default
              return (
                <FormFieldByMeta
                  key={field.key}
                  field={field}
                  value={value}
                  onChange={(v) => onSettingsChange({ [stateKey]: v } as Partial<TlsSettings>)}
                  idPrefix="tls"
                  emptyOptionForEnum={field.key === 'client_auth_type'}
                />
              )
            })}
          </div>
        )}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
          <Textarea
            value={customTlsYaml}
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
