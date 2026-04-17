import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { RuleProvider } from '@/lib/mihomo/types'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const BEHAVIORS = ['classical', 'domain', 'ipcidr'] as const

interface RuleProvidersProps {
  providers: RuleProvider[]
  groupNames: string[]
  onAdd: (rp: RuleProvider) => void
  onUpdate: (index: number, provider: RuleProvider) => void
  onRemove: (index: number) => void
}

/** RULE-SET rule-providers: name, URL, behavior, policy. */
export function RuleProviders({
  providers,
  groupNames,
  onAdd,
  onUpdate,
  onRemove,
}: RuleProvidersProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [behavior, setBehavior] = useState<'domain' | 'ipcidr' | 'classical'>('classical')
  const [policy, setPolicy] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const policyOptions = [
    { value: '', label: t('mihomo.ruleActionPlaceholder') },
    { value: 'DIRECT', label: 'DIRECT' },
    { value: 'REJECT', label: 'REJECT' },
    ...groupNames.map((n) => ({ value: n, label: n })),
  ]

  const resetForm = () => {
    setName('')
    setUrl('')
    setPolicy('')
    setBehavior('classical')
    setEditingIndex(null)
  }

  const handleAdd = () => {
    const n = name.trim()
    const u = url.trim()
    if (!n || !u) return
    onAdd({
      name: n,
      url: u,
      behavior: behavior || 'classical',
      format: 'yaml',
      policy: policy || undefined,
    })
    resetForm()
  }

  const handleEdit = (idx: number) => {
    const rp = providers[idx]
    if (!rp) return
    setEditingIndex(idx)
    setName(rp.name)
    setUrl(rp.url)
    setBehavior(rp.behavior ?? 'classical')
    setPolicy(rp.policy ?? '')
  }

  const handleSave = () => {
    if (editingIndex === null) return
    const u = url.trim()
    if (!u) return
    const rp = providers[editingIndex]
    if (!rp) return
    onUpdate(editingIndex, {
      ...rp,
      url: u,
      behavior: behavior || 'classical',
      format: 'yaml',
      policy: policy || undefined,
    })
    resetForm()
  }

  const handleCancel = () => {
    resetForm()
  }

  return (
    <SectionCollapsible open={open} onOpenChange={setOpen} title={t('mihomo.ruleProvidersTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('mihomo.ruleProvidersSub')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            placeholder={t('mihomo.ruleProvidersNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[120px]"
            disabled={editingIndex !== null}
          />
          <Input
            type="url"
            placeholder={t('mihomo.ruleProvidersUrlPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 min-w-[160px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={behavior} onValueChange={(v) => setBehavior(v as 'domain' | 'ipcidr' | 'classical')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BEHAVIORS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={policy === '' ? 'empty' : policy} onValueChange={(v) => setPolicy(v === 'empty' ? '' : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('mihomo.ruleActionPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {policyOptions.map((o) => (
                <SelectItem key={o.value === '' ? 'empty' : o.value} value={o.value === '' ? 'empty' : o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editingIndex === null ? (
            <Button type="button" onClick={handleAdd}>
              {t('mihomo.addRuleProviderButton')}
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
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 min-h-[80px]">
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mihomo.noRuleProviders')}</p>
          ) : (
            providers.map((rp, idx) => (
              <div
                key={`rp-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-border last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <strong className="text-sm shrink-0">{rp.name}</strong>
                  <Badge variant="secondary" className="text-xs shrink-0">RULE-SET → {rp.policy ?? '?'}</Badge>
                  <span className="text-xs text-muted-foreground truncate">{rp.url}</span>
                  <span className="text-xs text-muted-foreground shrink-0">behavior: {rp.behavior ?? 'classical'} · format: {rp.format ?? 'yaml'}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(idx)}>
                    {t('mihomo.editSub')}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => onRemove(idx)}>
                    {t('mihomo.delete')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCollapsible>
  )
}
