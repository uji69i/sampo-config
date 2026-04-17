import type { ReactNode } from 'react'
import { HelpCircle, ExternalLink } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { getRejectPolicyClassName, cn } from '@/lib/utils'
import type { FormMetaField } from '@/lib/mihomo/form-meta-types'
import { Label } from './label'
import { Input } from './input'
import { Checkbox } from './checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Textarea } from './textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

export interface FormFieldByMetaProps {
  field: FormMetaField
  value: unknown
  onChange: (value: unknown) => void
  idPrefix: string
  policyOptions?: Array<{ value: string; label: string }>
  inputMin?: number
  inputMax?: number
  /** When true and field has enum, add a "—" option with value 'empty'; onChange(undefined) when selected. */
  emptyOptionForEnum?: boolean
  /** 'grid' = two columns (label max 30% | control), 'inline' = label and control in one flex row. Default 'grid'. */
  layout?: 'grid' | 'inline'
}

export function FormFieldByMeta({
  field,
  value,
  onChange,
  idPrefix,
  policyOptions,
  inputMin,
  inputMax,
  emptyOptionForEnum,
  layout = 'grid',
}: FormFieldByMetaProps) {
  const { t } = useTranslation()
  const id = `${idPrefix}-${field.key}`
  const label = t(field.i18nKey)

  const descKey = field.descriptionKey ?? field.i18nKey + '.desc'
  const helpKey = field.helpKey ?? field.i18nKey + '.help'
  const defaultLinkKey = field.i18nKey + '.link'
  const linkUrlRaw = field.link ?? (field.linkKey ? t(field.linkKey) : t(defaultLinkKey))
  const hasLink = Boolean(
    linkUrlRaw && linkUrlRaw !== defaultLinkKey && linkUrlRaw.trim() !== ''
  )
  const linkUrl = hasLink ? linkUrlRaw : ''
  const descText = t(descKey)
  const hasDesc = Boolean(descText && descText !== descKey)
  const helpText = t(helpKey)
  const hasHelp = Boolean(helpText && helpText !== helpKey)

  const labelCell = (
    <div className="min-w-0 py-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Label
          htmlFor={id}
          className="text-sm text-muted-foreground break-words shrink-0"
        >
          {label}
        </Label>
        {hasHelp && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label={helpText}
              >
                <HelpCircle className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">{helpText}</TooltipContent>
          </Tooltip>
        )}
        {field.deprecated && (
          <span className="text-xs font-medium text-amber-500/80 leading-none">deprecated</span>
        )}
        {hasLink && (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex"
            aria-label={t('common.docs') || 'Documentation'}
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      {hasDesc && (
        <p className="text-xs text-muted-foreground/70 mt-0.5 leading-tight wrap-break-word">{descText}</p>
      )}
    </div>
  )

  const useGrid = layout === 'grid'

  /** Two-column grid: label (max 30%, wrap) | control */
  const gridRow = (control: ReactNode) =>
    useGrid ? (
      <div className="grid grid-cols-[minmax(0,30%)_1fr] gap-x-4 gap-y-1 items-start">
        {labelCell}
        <div className="min-w-0 pt-1">{control}</div>
      </div>
    ) : (
      <div className="flex flex-wrap items-start gap-2">
        {labelCell}
        <div className="min-w-0">{control}</div>
      </div>
    )

  if (field.key === 'proxy' && policyOptions) {
    const str = value != null ? String(value) : ''
    const proxyValue = str || 'empty'
    return gridRow(
      <Select
        value={proxyValue}
        onValueChange={(v) => onChange(v === 'empty' ? undefined : v)}
      >
        <SelectTrigger id={id} className={cn('w-full min-w-[120px]', getRejectPolicyClassName(str))}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="empty">—</SelectItem>
          {policyOptions.map((o) => (
            <SelectItem key={o.value} value={o.value} className={getRejectPolicyClassName(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === 'boolean') {
    const effective =
      value !== undefined && value !== null ? Boolean(value) : (field.default as boolean | undefined)
    const checked = effective === true
    return gridRow(
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        aria-label={label}
      />
    )
  }

  if (field.type === 'number') {
    const num = typeof value === 'number' ? value : (field.default as number) ?? 0
    return gridRow(
      <Input
        id={id}
        type="number"
        min={inputMin}
        max={inputMax}
        value={num}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-24"
      />
    )
  }

  if (field.enum) {
    const hasEmpty = emptyOptionForEnum === true
    /** Radix Select forbids empty string as SelectItem value; use sentinel for enum '' */
    const EMPTY_ENUM_SENTINEL = '__empty_enum__'
    const toSelectValue = (v: string) => (v === '' ? EMPTY_ENUM_SENTINEL : v)
    const fromSelectValue = (v: string) => (v === EMPTY_ENUM_SENTINEL ? '' : v)
    const str =
      value != null && value !== ''
        ? toSelectValue(String(value))
        : hasEmpty
          ? 'empty'
          : toSelectValue((field.default as string) ?? (field.enum[0] ?? ''))
    return gridRow(
      <Select
        value={str}
        onValueChange={(v) =>
          onChange(hasEmpty && v === 'empty' ? undefined : fromSelectValue(v))
        }
      >
        <SelectTrigger id={id} className="w-[130px]">
          <SelectValue placeholder={hasEmpty ? '—' : undefined} />
        </SelectTrigger>
        <SelectContent>
          {hasEmpty && (
            <SelectItem value="empty">—</SelectItem>
          )}
          {field.enum.map((opt) => (
            <SelectItem key={opt === '' ? EMPTY_ENUM_SENTINEL : opt} value={toSelectValue(opt)}>
              {opt === '' ? '—' : opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === 'array') {
    const arr = Array.isArray(value) ? value : []
    const text = (arr as unknown[]).map(String).join('\n')
    return gridRow(
      <Textarea
        id={id}
        value={text}
        onChange={(e) => {
          const next = e.target.value
            .split(/\n/)
            .map((s) => s.trim())
            .filter(Boolean)
          onChange(next)
        }}
        className="font-mono text-sm min-h-[60px] w-full"
        placeholder={label}
      />
    )
  }

  // string
  const str = value != null ? String(value) : (field.default as string) ?? ''
  const placeholder = field.key === 'listen' ? '0.0.0.0' : label
  const defaultValue = (field.default as string) ?? ''
  return gridRow(
    <Input
      id={id}
      type="text"
      value={str}
      onChange={(e) => {
        const next = e.target.value.trim()
        onChange(next || defaultValue)
      }}
      placeholder={placeholder}
      className="w-full min-w-[100px]"
    />
  )
}
