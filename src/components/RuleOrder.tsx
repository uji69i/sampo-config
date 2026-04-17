import React from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { RuleEntry } from '@/lib/mihomo/types'
import { cn } from '@/lib/utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

function isoToFlag(iso: string): string {
  const s = iso.toUpperCase()
  if (!/^[A-Z]{2}$/.test(s)) return ''
  const A = 0x1f1e6
  const base = 'A'.codePointAt(0)!
  return String.fromCodePoint(
    A + (s.codePointAt(0)! - base),
    A + (s.codePointAt(1)! - base)
  )
}

export type RuleOrderDirection = 'up' | 'down' | 'top' | 'bottom'

/** Compute new movable order after moving item at index by direction; MATCH stays last. */
function moveByDirection(
  movable: RuleEntry[],
  index: number,
  direction: RuleOrderDirection
): RuleEntry[] {
  if (index < 0 || index >= movable.length) return movable
  const from = index
  let to = from
  if (direction === 'up') to = Math.max(0, from - 1)
  else if (direction === 'down') to = Math.min(movable.length - 1, from + 1)
  else if (direction === 'top') to = 0
  else if (direction === 'bottom') to = movable.length - 1
  if (from === to) return movable
  const next = [...movable]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)
  return next
}

interface RuleOrderProps {
  entries: RuleEntry[]
  onReorder: (entries: RuleEntry[]) => void
}

function kindLabel(t: (key: string) => string, e: RuleEntry): string {
  switch (e.kind) {
    case 'GEOSITE':
      return t('mihomo.ruleOrderKindGeosite')
    case 'GEOIP':
      return t('mihomo.ruleOrderKindGeoip')
    case 'RULE-SET':
      return t('mihomo.ruleOrderKindRuleSet')
    case 'MANUAL':
      return t('mihomo.ruleOrderKindManual')
    case 'MATCH':
      return t('mihomo.ruleOrderKindMatch')
    default:
      return e.kind
  }
}

interface SortableRuleRowProps {
  entry: RuleEntry
  index: number
  onMove: (index: number, direction: RuleOrderDirection) => void
  kindLabelText: string
  buttonTitles: { top: string; up: string; down: string; bottom: string }
  dragHint: string
}

function SortableRuleRow({ entry, index, onMove, kindLabelText, buttonTitles, dragHint }: SortableRuleRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2',
        isDragging && 'opacity-50 shadow-md'
      )}
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing p-1 -m-1 rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={dragHint}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Badge variant="secondary" className="shrink-0">
          {kindLabelText}
        </Badge>
        {entry.kind === 'GEOIP' ? (
          <span className="text-sm">
            {isoToFlag(entry.key)} {entry.key}
          </span>
        ) : (
          <span className="text-sm truncate">{entry.key}</span>
        )}
      </div>
      <div className="flex gap-0.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, 'top')}
          title={buttonTitles.top}
        >
          ⇡
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, 'up')}
          title={buttonTitles.up}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, 'down')}
          title={buttonTitles.down}
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, 'bottom')}
          title={buttonTitles.bottom}
        >
          ⇣
        </Button>
      </div>
    </div>
  )
}

/** Order of rules (first match wins); drag to reorder or use buttons, MATCH stays last. */
export function RuleOrder({ entries, onReorder }: RuleOrderProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [activeId, setActiveId] = React.useState<number | null>(null)
  const matchKind = 'MATCH'
  const movable = entries.filter((e) => e.kind !== matchKind)
  const matchEntry = entries.find((e) => e.kind === matchKind)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id))
  }

  const handleMove = (index: number, direction: RuleOrderDirection) => {
    const newMovable = moveByDirection(movable, index, direction)
    const fullOrder = matchEntry ? [...newMovable, matchEntry] : newMovable
    onReorder(fullOrder)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (over == null || active.id === over.id) return
    const oldIndex = Number(active.id)
    const newIndex = Number(over.id)
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex) || oldIndex === newIndex) return
    if (oldIndex < 0 || oldIndex >= movable.length || newIndex < 0 || newIndex >= movable.length) return
    const newMovable = arrayMove(movable, oldIndex, newIndex)
    const fullOrder = matchEntry ? [...newMovable, matchEntry] : newMovable
    onReorder(fullOrder)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sortableIds = movable.map((_, i) => i)

  return (
    <SectionCollapsible open={open} onOpenChange={setOpen} title={t('mihomo.ruleOrderTitle')}>
      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('mihomo.ruleOrderEmpty')}</p>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2" role="list">
                  {movable.map((entry, index) => (
                    <div key={`sortable-${index}-${entry.kind}-${entry.key}`} role="listitem">
                      <SortableRuleRow
                        entry={entry}
                        index={index}
                        onMove={handleMove}
                        kindLabelText={kindLabel(t, entry)}
                        buttonTitles={{
                          top: t('mihomo.ruleOrderTop'),
                          up: t('mihomo.ruleOrderUp'),
                          down: t('mihomo.ruleOrderDown'),
                          bottom: t('mihomo.ruleOrderBottom'),
                        }}
                        dragHint={t('mihomo.ruleOrderDragHint')}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId != null && movable[activeId] != null ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 shadow-lg cursor-grabbing">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Badge variant="secondary" className="shrink-0">
                        {kindLabel(t, movable[activeId])}
                      </Badge>
                      {movable[activeId].kind === 'GEOIP' ? (
                        <span className="text-sm">
                          {isoToFlag(movable[activeId].key)} {movable[activeId].key}
                        </span>
                      ) : (
                        <span className="text-sm truncate">{movable[activeId].key}</span>
                      )}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {matchEntry && (
              <div className="flex items-center rounded-lg border border-border bg-muted/50 p-2">
                <Badge variant="secondary">{kindLabel(t, matchEntry)}</Badge>
              </div>
            )}
          </>
        )}
      </div>
    </SectionCollapsible>
  )
}
