import { useState, useMemo } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { getRejectPolicyClassName, cn } from '@/lib/utils'
import type { ServiceTemplate } from '@/lib/mihomo/types'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterInput } from '@/components/ui/filter-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ServiceTemplatesProps {
  templates: ServiceTemplate[]
  enabledTemplates: Map<string, string>
  policyOptions: { value: string; label: string }[]
  onToggle: (id: string, policy: string) => void
  onPolicyChange: (id: string, policy: string) => void
}

/** Service templates (Telegram, YouTube, etc.): checkboxes + policy select per template. */
export function ServiceTemplates({
  templates,
  enabledTemplates,
  policyOptions,
  onToggle,
  onPolicyChange,
}: ServiceTemplatesProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  const filteredTemplates = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(q) || tpl.id.toLowerCase().includes(q)
    )
  }, [templates, filter])

  if (templates.length === 0) return null

  const defaultPolicy = policyOptions[0]?.value ?? 'DIRECT'

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('mihomo.serviceTemplatesHint')}</p>
      <FilterInput
        value={filter}
        onChange={setFilter}
        placeholder={t('mihomo.serviceTemplatesFilterPlaceholder')}
        aria-label={t('mihomo.serviceTemplatesFilterPlaceholder')}
      />
      {filteredTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('mihomo.serviceTemplatesFilterEmpty')}</p>
      ) : (
      <ul className="space-y-3 list-none p-0 m-0">
        {filteredTemplates.map((tpl) => {
          const enabled = enabledTemplates.has(tpl.id)
          const policy = enabledTemplates.get(tpl.id) ?? defaultPolicy
          return (
            <li key={tpl.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Checkbox
                  id={`tpl-${tpl.id}`}
                  checked={enabled}
                  onCheckedChange={(v) => onToggle(tpl.id, v ? policy : '')}
                />
                <Label htmlFor={`tpl-${tpl.id}`} className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                  {tpl.icon && (
                    <img src={tpl.icon} alt="" width={20} height={20} className="shrink-0" />
                  )}
                  <span className="truncate">{tpl.name}</span>
                </Label>
              </div>
              {enabled && (
                <Select value={policy} onValueChange={(v) => onPolicyChange(tpl.id, v)}>
                  <SelectTrigger className={cn('w-[130px]', getRejectPolicyClassName(policy))}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {policyOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} className={getRejectPolicyClassName(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </li>
          )
        })}
      </ul>
      )}
    </div>
  )
}
