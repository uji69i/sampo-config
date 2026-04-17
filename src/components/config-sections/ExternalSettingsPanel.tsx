import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { ExternalSettings } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { resolveStateKey } from '@/lib/mihomo/form-meta-utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const allExternalFields = (formMeta.external as { fields: FormMetaField[] }).fields

const UI_URL_KEY = 'external_ui_url'
const externalFields = allExternalFields.filter((f) => f.key !== UI_URL_KEY)
const uiUrlField = allExternalFields.find((f) => f.key === UI_URL_KEY)!

interface DashboardPreset {
  label: string
  url: string
}

const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    label: 'zashboard',
    url: 'https://github.com/Zephyruso/zashboard/releases/latest/download/dist-cdn-fonts.zip',
  },
  {
    label: 'metacubexd',
    url: 'https://github.com/MetaCubeX/metacubexd/releases/download/v1.241.2/compressed-dist.tgz',
  },
]

interface ExternalSettingsPanelProps {
  settings: ExternalSettings
  useExternalSettings: boolean
  advancedExternalYaml: string
  useAdvancedExternalYaml: boolean
  customExternalYaml: string
  onSettingsChange: (patch: Partial<ExternalSettings>) => void
  onUseToggle: (enabled: boolean) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

export function ExternalSettingsPanel({
  settings,
  useExternalSettings,
  advancedExternalYaml,
  useAdvancedExternalYaml,
  customExternalYaml,
  onSettingsChange,
  onUseToggle,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: ExternalSettingsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const currentUiUrl = settings.externalUiUrl ?? ''
  const matchedPreset = DASHBOARD_PRESETS.find((p) => p.url === currentUiUrl)?.label ?? 'custom'

  function handlePresetSelect(presetLabel: string) {
    if (presetLabel === 'custom') return
    const preset = DASHBOARD_PRESETS.find((p) => p.label === presetLabel)
    if (preset) onSettingsChange({ externalUiUrl: preset.url })
  }

  const uiUrlDescKey = uiUrlField.i18nKey + '.desc'
  const uiUrlDescText = t(uiUrlDescKey)
  const hasDesc = uiUrlDescText !== uiUrlDescKey

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.externalSettingsTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useExternalSettings}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('mihomo.externalAdvancedYaml')}</span>
          <Switch checked={useAdvancedExternalYaml} onCheckedChange={onAdvancedToggle} />
        </div>
        {useAdvancedExternalYaml ? (
          <Textarea
            value={advancedExternalYaml}
            onChange={(e) => onAdvancedYamlChange(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
            rows={10}
            placeholder={'external-controller: 0.0.0.0:9090\nsecret: ""\nexternal-ui: /path/to/ui'}
          />
        ) : (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {externalFields.map((field) => {
              const stateKey = resolveStateKey(field) as keyof ExternalSettings
              const value = settings[stateKey] ?? field.default
              return (
                <FormFieldByMeta
                  key={field.key}
                  field={field}
                  value={value}
                  onChange={(v) => onSettingsChange({ [stateKey]: v } as Partial<ExternalSettings>)}
                  idPrefix="external"
                />
              )
            })}

            {/* external-ui-url: preset select + editable input */}
            <div className="grid grid-cols-[minmax(0,30%)_1fr] gap-x-4 gap-y-1 items-start">
              <div className="min-w-0 py-1">
                <Label htmlFor="external-external_ui_url" className="text-sm text-muted-foreground">
                  {t(uiUrlField.i18nKey)}
                </Label>
                {hasDesc && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5 leading-tight">{uiUrlDescText}</p>
                )}
              </div>
              <div className="min-w-0 pt-1 space-y-1.5">
                <Select value={matchedPreset} onValueChange={handlePresetSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {DASHBOARD_PRESETS.map((p) => (
                      <SelectItem key={p.label} value={p.label}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="external-external_ui_url"
                  type="text"
                  value={currentUiUrl}
                  onChange={(e) => onSettingsChange({ externalUiUrl: e.target.value })}
                  placeholder="https://..."
                  className="font-mono text-xs w-full"
                />
              </div>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
          <Textarea
            value={customExternalYaml}
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
