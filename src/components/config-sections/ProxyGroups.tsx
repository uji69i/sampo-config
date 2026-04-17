import { useTranslation } from '@/i18n/useTranslation'
import type { ProxyGroup } from '@/lib/mihomo/types'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Button } from '@/components/ui/button'
import { FilterInput } from '@/components/ui/filter-input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useMemo, useState } from 'react'
import { ProxyGroupCard } from './ProxyGroupCard'

interface ProxyGroupsProps {
  groups: ProxyGroup[]
  proxyNames: string[]
  onAddGroup: (group: ProxyGroup) => void
  onUpdateGroup: (index: number, patch: Partial<ProxyGroup>) => void
  onRemoveGroup: (index: number) => void
  advancedYaml: string
  advancedEnabled: boolean
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
}


export function ProxyGroups({
  groups,
  proxyNames,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  advancedYaml,
  advancedEnabled,
  onAdvancedYamlChange,
  onAdvancedToggle,
}: ProxyGroupsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [groupsFilter, setGroupsFilter] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const getGroupKey = (g: ProxyGroup, idx: number) => (g.name?.trim() ? g.name.trim() : `group-${idx}`)

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: prev[key] === false,
    }))
  }

  const setAllExpanded = (keys: string[], expanded: boolean) => {
    setExpandedGroups((prev) => {
      const next = { ...prev }
      for (const key of keys) {
        next[key] = expanded
      }
      return next
    })
  }

  const filteredGroups = useMemo(() => {
    const q = groupsFilter.trim().toLowerCase()
    const withIdx = groups.map((g, i) => ({ g, idx: i }))
    if (!q) return withIdx
    return withIdx.filter(
      ({ g }) =>
        g.name.toLowerCase().includes(q) || (g.type && g.type.toLowerCase().includes(q))
    )
  }, [groups, groupsFilter])

  const handleAdd = () => {
    onAddGroup({
      name: `group-${groups.length + 1}`,
      type: 'select',
      icon: '',
      proxies: [],
      manual: [],
    })
  }

  return (
    <SectionCollapsible
      open={open}
      onOpenChange={setOpen}
      title={t('mihomo.groupsTitle')}
      triggerRight={<Button size="sm" onClick={handleAdd}>{t('mihomo.addGroupButton')}</Button>}
    >
      <div className="space-y-4">
        {groups.length > 0 && !advancedEnabled && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <FilterInput
                value={groupsFilter}
                onChange={setGroupsFilter}
                placeholder={t('mihomo.groupsFilterPlaceholder')}
                aria-label={t('mihomo.groupsFilterPlaceholder')}
              />
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const target = (groupsFilter.trim()
                    ? filteredGroups
                    : groups.map((g, idx) => ({ g, idx }))
                  ).map(({ g, idx }) => getGroupKey(g, idx))
                  setAllExpanded(target, true)
                }}
              >
                {t('mihomo.groupsExpandAll')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const target = (groupsFilter.trim()
                    ? filteredGroups
                    : groups.map((g, idx) => ({ g, idx }))
                  ).map(({ g, idx }) => getGroupKey(g, idx))
                  setAllExpanded(target, false)
                }}
              >
                {t('mihomo.groupsCollapseAll')}
              </Button>
            </div>
          </div>
        )}
        {groups.length === 0 && !advancedEnabled ? (
          <p className="text-sm text-muted-foreground">{t('mihomo.emptyGroups')}</p>
        ) : filteredGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('mihomo.groupsFilterEmpty')}</p>
        ) : (
          filteredGroups.map(({ g, idx }) => {
            const key = getGroupKey(g, idx)
            const isCollapsed = expandedGroups[key] === false

            return (
              <ProxyGroupCard
                key={key}
                g={g}
                idx={idx}
                proxyNames={proxyNames}
                otherGroupNames={groups.filter((gr) => gr.name && gr.name !== g.name).map((gr) => gr.name)}
                onUpdate={onUpdateGroup}
                onRemove={onRemoveGroup}
                t={t}
                collapsed={isCollapsed}
                onToggleCollapsed={() => toggleGroup(key)}
              />
            )
          })
        )}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <b className="text-sm">{t('mihomo.advancedGroupsTitle')}</b>
            <p className="text-xs text-muted-foreground">{t('mihomo.advancedGroupsHint')}</p>
          </div>
          <Switch checked={advancedEnabled} onCheckedChange={onAdvancedToggle} />
        </div>
        {advancedEnabled && (
          <Textarea value={advancedYaml} onChange={(e) => onAdvancedYamlChange(e.target.value)} className="font-mono text-sm" spellCheck={false} rows={8} />
        )}
      </div>
    </SectionCollapsible>
  )
}

