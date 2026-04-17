import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { GeneralSettings } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { resolveStateKey } from '@/lib/mihomo/form-meta-utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'
import { Textarea } from '@/components/ui/textarea'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const generalFields = (formMeta.general as { fields: FormMetaField[] }).fields

interface GeneralSettingsPanelProps {
  settings: GeneralSettings
  useGeneralSettings: boolean
  advancedGeneralYaml: string
  useAdvancedGeneralYaml: boolean
  customGeneralYaml: string
  onSettingsChange: (patch: Partial<GeneralSettings>) => void
  onUseToggle: (enabled: boolean) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

export function GeneralSettingsPanel({
  settings,
  useGeneralSettings,
  advancedGeneralYaml,
  useAdvancedGeneralYaml,
  customGeneralYaml,
  onSettingsChange,
  onUseToggle,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: GeneralSettingsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.generalSettingsTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useGeneralSettings}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('mihomo.generalAdvancedYaml')}</span>
          <Switch checked={useAdvancedGeneralYaml} onCheckedChange={onAdvancedToggle} />
        </div>
        {useAdvancedGeneralYaml ? (
          <Textarea
            value={advancedGeneralYaml}
            onChange={(e) => onAdvancedYamlChange(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
            rows={10}
            placeholder="mode: rule&#10;mixed-port: 7890&#10;allow-lan: false&#10;ipv6: false&#10;log-level: info"
          />
        ) : (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {generalFields.map((field) => {
              const stateKey = resolveStateKey(field) as keyof GeneralSettings
              const value = settings[stateKey] ?? field.default
              const isPort = field.key.endsWith('_port') || field.key === 'port'
              return (
                <FormFieldByMeta
                  key={field.key}
                  field={field}
                  value={value}
                  onChange={(v) => onSettingsChange({ [stateKey]: v } as Partial<GeneralSettings>)}
                  idPrefix="general"
                  inputMin={isPort ? 1 : undefined}
                  inputMax={isPort ? 65535 : undefined}
                  emptyOptionForEnum={field.key === 'find_process_mode'}
                />
              )
            })}
          </div>
        )}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
          <Textarea
            value={customGeneralYaml}
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
