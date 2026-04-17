import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { getRejectPolicyClassName, cn } from '@/lib/utils'
import { normalizeManualRule } from '@/lib/mihomo/validators'
import type { ManualRule, ManualRuleType } from '@/lib/mihomo/types'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

const MANUAL_RULE_TYPES: ManualRuleType[] = [
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'IP-CIDR',
  'IP-ASN',
  'PROCESS-NAME',
  'PROCESS-PATH',
  'IN-NAME',
  'IN-PORT',
  'IN-TYPE',
  'IN-USER',
]

interface ManualRulesProps {
  rules: ManualRule[]
  groupNames: string[]
  onAdd: (rule: ManualRule) => void
  onUpdate: (index: number, rule: ManualRule) => void
  onRemove: (index: number) => void
}

/** User-added DOMAIN-SUFFIX, IP-CIDR, PROCESS-NAME rules. */
export function ManualRules({
  rules,
  groupNames,
  onAdd,
  onUpdate,
  onRemove,
}: ManualRulesProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ManualRuleType>('DOMAIN-SUFFIX')
  const [value, setValue] = useState('')
  const [policy, setPolicy] = useState('')
  const [error, setError] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const policyOptions = [
    { value: '', label: '—' },
    { value: 'DIRECT', label: 'DIRECT' },
    { value: 'REJECT', label: 'REJECT' },
    ...groupNames.map((n) => ({ value: n, label: n })),
  ]

  const resetForm = () => {
    setType('DOMAIN-SUFFIX')
    setValue('')
    setPolicy('')
    setError('')
    setEditingIndex(null)
  }

  const handleAdd = () => {
    setError('')
    const raw = value.trim()
    const pol = policy.trim()
    if (!raw || !pol) {
      setError(t('mihomo.manualRulesFillAll'))
      return
    }
    const result = normalizeManualRule(type, raw)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onAdd({
      type,
      value: result.value,
      policy: pol,
    })
    resetForm()
  }

  const handleEdit = (idx: number) => {
    const r = rules[idx]
    if (!r) return
    setEditingIndex(idx)
    setType(r.type)
    setValue(r.value)
    setPolicy(r.policy)
    setError('')
  }

  const handleSave = () => {
    if (editingIndex === null) return
    setError('')
    const raw = value.trim()
    const pol = policy.trim()
    if (!raw || !pol) {
      setError(t('mihomo.manualRulesFillAll'))
      return
    }
    const result = normalizeManualRule(type, raw)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onUpdate(editingIndex, {
      type,
      value: result.value,
      policy: pol,
    })
    resetForm()
  }

  const handleCancel = () => {
    resetForm()
  }

  return (
    <SectionCollapsible open={open} onOpenChange={setOpen} title={t('mihomo.manualRulesTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('mihomo.manualRulesSub')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={(v) => setType(v as ManualRuleType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_RULE_TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>{ty}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder={t('mihomo.manualRulesValuePlaceholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 min-w-[120px]"
          />
          <Select value={policy || 'empty'} onValueChange={(v) => setPolicy(v === 'empty' ? '' : v)}>
            <SelectTrigger className={cn('w-[120px]', getRejectPolicyClassName(policy))}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {policyOptions.map((o) => (
                <SelectItem key={o.value || 'empty'} value={o.value || 'empty'} className={getRejectPolicyClassName(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editingIndex === null ? (
            <Button type="button" onClick={handleAdd}>
              {t('mihomo.manualRulesAddButton')}
            </Button>
          ) : (
            <>
              <Button type="button" onClick={handleSave}>
                {t('mihomo.saveSub')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('mihomo.cancelSub')}
              </Button>
            </>
          )}
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">{t('mihomo.manualRulesHint')}</p>
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 min-h-[60px]">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mihomo.manualRulesEmpty')}</p>
          ) : (
            rules.map((r, idx) => (
              <div
                key={`manual-${idx}`}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <Badge variant="secondary" className="text-xs shrink-0">{r.type}</Badge>
                  <span className="font-mono text-sm truncate">
                    {r.type},{r.value},<span className={getRejectPolicyClassName(r.policy)}>{r.policy}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(idx)}>
                    {t('mihomo.editSub')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(idx)} aria-label={t('mihomo.delete')}>✕</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCollapsible>
  )
}
