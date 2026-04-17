import { useMemo, useRef, useState } from 'react'
import type { ProxyGroup, ProxyGroupType } from '@/lib/mihomo/types'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { resolveStateKey } from '@/lib/mihomo/form-meta-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormFieldByMeta } from '@/components/ui/form-field-by-meta'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { ManualProxiesSelect } from './ManualProxiesSelect'

import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'

const proxyGroupsMeta = formMeta.proxyGroups as {
  commonFields: FormMetaField[]
  types: Record<string, { fields: FormMetaField[] }>
}
const groupTypeField = proxyGroupsMeta.commonFields.find((f) => f.key === 'type')
/** Proxy group types from form-meta (single source of truth); includes relay. */
export const GROUP_TYPES: ProxyGroupType[] = (groupTypeField?.enum ?? ['select', 'url-test', 'fallback', 'load-balance']) as ProxyGroupType[]
/** commonFields that appear in the advanced section (not name, type, proxies, use) */
const ADVANCED_COMMON_KEYS = new Set(['icon', 'filter', 'exclude_filter', 'exclude_type', 'include_all', 'hidden'])
const advancedCommonFields = proxyGroupsMeta.commonFields.filter((f) => ADVANCED_COMMON_KEYS.has(f.key))

export interface ProxyGroupCardProps {
  g: ProxyGroup
  idx: number
  proxyNames: string[]
  otherGroupNames: string[]
  onUpdate: (index: number, patch: Partial<ProxyGroup>) => void
  onRemove: (index: number) => void
  t: (key: string, params?: Record<string, string | number>) => string
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function ProxyGroupCard({
  g,
  idx,
  proxyNames,
  otherGroupNames,
  onUpdate,
  onRemove,
  t,
  collapsed,
  onToggleCollapsed,
}: ProxyGroupCardProps) {
  const [advOpen, setAdvOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const manualOptions = useMemo(
    () => [...new Set([...proxyNames, ...otherGroupNames, 'DIRECT', 'REJECT'])],
    [proxyNames, otherGroupNames],
  )

  const scrollToProxy = useMemo(() => {
    return (name: string) => {
      const nodes = cardRef.current?.querySelectorAll('[data-proxy-name]') ?? []
      const el = [...nodes].find((node) => node.getAttribute('data-proxy-name') === name)
      if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  const proxiesCount = (g.proxies ?? []).length
  const manualCount = (g.manual ?? []).length

  return (
    <div ref={cardRef} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <Input
            placeholder={t('mihomo.groupNamePlaceholder')}
            value={g.name}
            onChange={(e) => onUpdate(idx, { name: e.target.value.trim() || 'GROUP' })}
            className="min-w-[120px] max-w-[200px]"
          />
          <Select
            value={g.type}
            onValueChange={(v) => onUpdate(idx, { type: v as ProxyGroup['type'] })}
          >
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GROUP_TYPES.map((typeVal) => <SelectItem key={typeVal} value={typeVal}>{typeVal}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span className="whitespace-nowrap">
            {t('mihomo.groupSummaryType', { type: g.type })}
          </span>
          <span className="whitespace-nowrap">
            {t('mihomo.groupSummaryProxies', { count: proxiesCount })}
          </span>
          <span className="whitespace-nowrap">
            {t('mihomo.groupSummaryManual', { count: manualCount })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t('mihomo.groupsExpandAll') : t('mihomo.groupsCollapseAll')}
          >
            {collapsed ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronUpIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <>
          {advancedCommonFields.filter((f) => f.key === 'icon').map((field) => (
            <FormFieldByMeta
              key={field.key}
              field={field}
              value={g[resolveStateKey(field) as keyof ProxyGroup] ?? field.default}
              onChange={(v) => onUpdate(idx, { [resolveStateKey(field)]: v } as Partial<ProxyGroup>)}
              idPrefix={`group-${idx}-icon`}
            />
          ))}
          <div className="space-y-2 py-1">
            <Label className="text-sm text-muted-foreground">{t('mihomo.manualLabel')}</Label>
            <ManualProxiesSelect
              options={manualOptions}
              value={g.manual ?? []}
              onChange={(v) => onUpdate(idx, { manual: v })}
              placeholder={t('mihomo.manualPlaceholder')}
              allowCustom
              aria-label={t('mihomo.manualLabel')}
              addCustomLabel={(term) => t('mihomo.manualAddCustom', { term })}
              emptyLabel={t('mihomo.manualEmpty')}
              navigableNames={proxyNames}
              onNavigateToProxy={scrollToProxy}
              gotoAriaLabel={t('mihomo.manualGotoProxy')}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('mihomo.groupProxiesHint')}</p>
          <div className="flex flex-wrap gap-3">
            {proxyNames.map((n) => (
              <label key={n} data-proxy-name={n} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={(g.proxies ?? []).includes(n)}
                  onCheckedChange={(v) => {
                    const next = v ? [...(g.proxies ?? []), n] : (g.proxies ?? []).filter((x) => x !== n)
                    onUpdate(idx, { proxies: next })
                  }}
                />
                <span>{n}</span>
              </label>
            ))}
          </div>
          <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                {advOpen ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                {t('mihomo.groupAdvancedSection')}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {advancedCommonFields.filter((f) => f.key !== 'icon').map((field) => (
                <FormFieldByMeta
                  key={field.key}
                  field={field}
                  value={g[resolveStateKey(field) as keyof ProxyGroup] ?? field.default}
                  onChange={(v) => onUpdate(idx, { [resolveStateKey(field)]: v } as Partial<ProxyGroup>)}
                  idPrefix={`group-${idx}-adv`}
                />
              ))}
              {(proxyGroupsMeta.types[g.type]?.fields ?? []).map((field) => (
                <FormFieldByMeta
                  key={field.key}
                  field={field}
                  value={g[resolveStateKey(field) as keyof ProxyGroup] ?? field.default}
                  onChange={(v) => onUpdate(idx, { [resolveStateKey(field)]: v } as Partial<ProxyGroup>)}
                  idPrefix={`group-${idx}-type`}
                  inputMin={field.key === 'interval' || field.key === 'tolerance' ? 0 : undefined}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{t('mihomo.updateProxyHint')}</span>
            <Button type="button" variant="destructive" size="sm" onClick={() => onRemove(idx)}>
              {t('mihomo.deleteGroup')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

