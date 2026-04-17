import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const subRulesMeta = (formMeta as { subRules?: { fields: FormMetaField[] } }).subRules
const subRulesFields: FormMetaField[] = subRulesMeta?.fields ?? [
  { key: 'name', yamlKey: 'name', type: 'string', required: true, i18nKey: 'mihomo.form.subRules.name' },
  { key: 'rules', yamlKey: 'rules', type: 'string', required: false, i18nKey: 'mihomo.form.subRules.rules' },
]
const nameField = subRulesFields.find((f) => f.key === 'name')
const rulesField = subRulesFields.find((f) => f.key === 'rules')

interface SubRulesPanelProps {
  subRules: Record<string, string[]>
  onAddSet: (name: string, rules: string[]) => void
  onUpdateSet: (payload: { oldName?: string; name: string; rules: string[] }) => void
  onRemoveSet: (name: string) => void
}

export function SubRulesPanel({
  subRules,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: SubRulesPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const entries = Object.entries(subRules)

  const handleAdd = () => {
    let n = entries.length + 1
    let name = `sub-rule-${n}`
    while (name in subRules) {
      n += 1
      name = `sub-rule-${n}`
    }
    onAddSet(name, [])
  }

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.subRulesTitle')}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('mihomo.subRulesHint')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleAdd}>
                {t('mihomo.subRulesAdd')}
              </Button>
            </div>
            <div className="space-y-3">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('mihomo.subRulesEmpty')}</p>
              ) : (
                entries.map(([setName, rules]) => (
                  <SubRuleSetCard
                    key={setName}
                    name={setName}
                    rules={rules}
                    existingNames={entries.filter(([n]) => n !== setName).map(([n]) => n)}
                    nameLabel={nameField ? t(nameField.i18nKey) : t('mihomo.form.subRules.name')}
                    rulesLabel={rulesField ? t(rulesField.i18nKey) : t('mihomo.form.subRules.rules')}
                    duplicateWarningText={t('mihomo.subRulesDuplicateName')}
                    removeAriaLabel={t('mihomo.remove')}
                    onUpdate={(payload) => onUpdateSet(payload)}
                    onRemove={() => onRemoveSet(setName)}
                  />
                ))
              )}
            </div>
      </div>
    </SectionCollapsible>
  )
}

interface SubRuleSetCardProps {
  name: string
  rules: string[]
  existingNames: string[]
  nameLabel: string
  rulesLabel: string
  duplicateWarningText: string
  removeAriaLabel: string
  onUpdate: (payload: { oldName?: string; name: string; rules: string[] }) => void
  onRemove: () => void
}

function SubRuleSetCard({
  name,
  rules,
  existingNames,
  nameLabel,
  rulesLabel,
  duplicateWarningText,
  removeAriaLabel,
  onUpdate,
  onRemove,
}: SubRuleSetCardProps) {
  const [localName, setLocalName] = useState(name)
  const [localRulesText, setLocalRulesText] = useState(rules.join('\n'))
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalName(name)
    setLocalRulesText(rules.join('\n'))
    setDuplicateWarning(false)
  }, [name, rules])

  const syncName = (newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setLocalName(name)
      setDuplicateWarning(false)
      return
    }
    if (trimmed !== name && existingNames.includes(trimmed)) {
      setDuplicateWarning(true)
      return
    }
    setDuplicateWarning(false)
    if (trimmed !== name) {
      onUpdate({ oldName: name, name: trimmed, rules })
    }
  }

  const handleRulesChange = (text: string) => {
    setLocalRulesText(text)
    const arr = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    onUpdate({ name, rules: arr })
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col gap-1 min-w-[140px]">
          <Label className="text-sm text-muted-foreground">{nameLabel}</Label>
          <Input
            value={localName}
            onChange={(e) => { setLocalName(e.target.value); setDuplicateWarning(false) }}
            onBlur={() => syncName(localName)}
            className={`font-mono text-sm${duplicateWarning ? ' border-destructive' : ''}`}
          />
          {duplicateWarning && (
            <span className="text-xs text-destructive">{duplicateWarningText}</span>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={removeAriaLabel}>
          ×
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{rulesLabel}</Label>
        <Textarea
          value={localRulesText}
          onChange={(e) => handleRulesChange(e.target.value)}
          className="font-mono text-sm min-h-[80px]"
          spellCheck={false}
          placeholder="DOMAIN,google.com,ss1"
        />
      </div>
    </div>
  )
}
