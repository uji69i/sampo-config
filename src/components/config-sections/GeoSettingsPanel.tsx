import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { GeoSettings } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { resolveStateKey } from '@/lib/mihomo/form-meta-utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Switch } from '@/components/ui/switch'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MMDB_PRESETS, ASN_PRESETS, GEOIP_PRESETS, GEOSITE_PRESETS } from '@/lib/mihomo/geo-presets'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const URL_FIELD_KEYS = new Set(['geoip_url', 'geosite_url', 'mmdb_url', 'asn_url'])
const geoFields = (formMeta.geo as { fields: FormMetaField[] } | undefined)?.fields ?? []
const geoOtherFields = geoFields.filter((f) => !URL_FIELD_KEYS.has(f.key))

const PRESET_PLACEHOLDER = '__preset_placeholder__'

interface GeoSettingsPanelProps {
  settings: GeoSettings
  useGeoSettings: boolean
  advancedGeoYaml: string
  useAdvancedGeoYaml: boolean
  customGeoYaml: string
  onSettingsChange: (patch: Partial<GeoSettings>) => void
  onUseToggle: (enabled: boolean) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  onCustomYamlChange: (value: string) => void
}

function GeoUrlField({
  labelI18nKey,
  value,
  presets,
  onChange,
  idPrefix,
}: {
  labelI18nKey: string
  value: string | undefined
  presets: { value: string; comment: string }[]
  onChange: (url: string | undefined) => void
  idPrefix: string
}) {
  const { t } = useTranslation()
  const label = t(labelI18nKey)
  const current = (value ?? '').trim()
  const selectedPreset = presets.find((p) => p.value === current)
  const selectValue = selectedPreset ? selectedPreset.value : PRESET_PLACEHOLDER

  return (
    <div className="grid grid-cols-[minmax(0,30%)_1fr] gap-x-4 gap-y-1 items-center">
      <Label htmlFor={idPrefix} className="text-sm text-muted-foreground break-words min-w-0 py-1">
        {label}
      </Label>
      <div className="flex gap-2 min-w-0">
        <Input
          id={idPrefix}
          type="url"
          value={current}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          placeholder={label}
          className="flex-1 min-w-0 font-mono text-sm rounded-r-none border-r-0"
        />
        <Select
          value={selectValue}
          onValueChange={(v) => {
            if (v !== PRESET_PLACEHOLDER) onChange(v)
          }}
        >
          <SelectTrigger
            id={`${idPrefix}-preset`}
            className="w-[140px] shrink-0 rounded-l-none -ml-px border-l"
          >
            <SelectValue placeholder={t('mihomo.form.geo.preset')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PRESET_PLACEHOLDER}>{t('mihomo.form.geo.preset')}</SelectItem>
            {presets.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.comment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function GeoSettingsPanel({
  settings,
  useGeoSettings,
  advancedGeoYaml,
  useAdvancedGeoYaml,
  customGeoYaml,
  onSettingsChange,
  onUseToggle,
  onAdvancedYamlChange,
  onAdvancedToggle,
  onCustomYamlChange,
}: GeoSettingsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.geoSettingsTitle')}
      triggerRight={
        <Switch
          variant="success"
          checked={useGeoSettings}
          onCheckedChange={onUseToggle}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('mihomo.geoAdvancedYaml')}</span>
          <Switch checked={useAdvancedGeoYaml} onCheckedChange={onAdvancedToggle} />
        </div>
        {useAdvancedGeoYaml ? (
          <Textarea
            value={advancedGeoYaml}
            onChange={(e) => onAdvancedYamlChange(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
            rows={10}
            placeholder={'geo-auto-update: true\ngeo-update-interval: 24\ngeosite-url: https://example.com/geosite.dat\ngeoip-url: https://example.com/geoip.dat'}
          />
        ) : (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <GeoUrlField
              labelI18nKey="mihomo.form.geo.geoip-url"
              value={settings.geoipUrl}
              presets={GEOIP_PRESETS}
              onChange={(v) => onSettingsChange({ geoipUrl: v })}
              idPrefix="geo-geoip"
            />
            <GeoUrlField
              labelI18nKey="mihomo.form.geo.geosite-url"
              value={settings.geositeUrl}
              presets={GEOSITE_PRESETS}
              onChange={(v) => onSettingsChange({ geositeUrl: v })}
              idPrefix="geo-geosite"
            />
            <GeoUrlField
              labelI18nKey="mihomo.form.geo.mmdb-url"
              value={settings.mmdbUrl}
              presets={MMDB_PRESETS}
              onChange={(v) => onSettingsChange({ mmdbUrl: v })}
              idPrefix="geo-mmdb"
            />
            <GeoUrlField
              labelI18nKey="mihomo.form.geo.asn-url"
              value={settings.asnUrl}
              presets={ASN_PRESETS}
              onChange={(v) => onSettingsChange({ asnUrl: v })}
              idPrefix="geo-asn"
            />
            {geoOtherFields.map((field) => {
              const stateKey = resolveStateKey(field) as keyof GeoSettings
              const value = settings[stateKey] ?? field.default
              const isInterval = field.key === 'geo_update_interval'
              return (
                <FormFieldByMeta
                  key={field.key}
                  field={field}
                  value={value}
                  onChange={(v) => onSettingsChange({ [stateKey]: v } as Partial<GeoSettings>)}
                  idPrefix="geo"
                  inputMin={isInterval ? 1 : undefined}
                  inputMax={isInterval ? 8760 : undefined}
                />
              )
            })}
          </div>
        )}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">{t('mihomo.customYaml')}</span>
          <Textarea
            value={customGeoYaml}
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
