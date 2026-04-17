import { useTranslation } from '@/i18n/useTranslation'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface AdvancedRulesPanelProps {
  enabled: boolean
  yaml: string
  onToggle: (enabled: boolean) => void
  onYamlChange: (value: string) => void
}

export function AdvancedRulesPanel({ enabled, yaml, onToggle, onYamlChange }: AdvancedRulesPanelProps) {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <b className="text-sm">{t('mihomo.advancedRulesTitle')}</b>
          <p className="text-xs text-muted-foreground">{t('mihomo.advancedRulesHint')}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <Textarea
          value={yaml}
          onChange={(e) => onYamlChange(e.target.value)}
          className="font-mono text-sm"
          spellCheck={false}
          rows={8}
        />
      )}
    </>
  )
}
