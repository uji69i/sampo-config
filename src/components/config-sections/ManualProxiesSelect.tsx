"use client"

import * as React from 'react'
import { Check, X, ArrowRight } from 'lucide-react'
import { cn, getRejectPolicyClassName } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface ManualProxiesSelectProps {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  allowCustom?: boolean
  className?: string
  'aria-label'?: string
  addCustomLabel?: (term: string) => string
  emptyLabel?: string
  onNavigateToProxy?: (name: string) => void
  navigableNames?: Set<string> | string[]
  gotoAriaLabel?: string
}

export function ManualProxiesSelect({
  options,
  value,
  onChange,
  placeholder = 'Add…',
  allowCustom = false,
  className,
  'aria-label': ariaLabel,
  addCustomLabel = (term) => `Add "${term}"`,
  emptyLabel = 'No results found.',
  onNavigateToProxy,
  gotoAriaLabel,
}: ManualProxiesSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const optionsSet = React.useMemo(() => new Set(options), [options])
  const valueSet = React.useMemo(() => new Set(value), [value])

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, search])

  const canAddCustom =
    allowCustom &&
    search.trim() !== '' &&
    !optionsSet.has(search.trim()) &&
    !valueSet.has(search.trim())

  const toggle = React.useCallback(
    (item: string) => {
      if (valueSet.has(item)) {
        onChange(value.filter((v) => v !== item))
      } else {
        onChange([...value, item])
      }
    },
    [value, valueSet, onChange]
  )

  const addCustom = React.useCallback(() => {
    const term = search.trim()
    if (!term || valueSet.has(term)) return
    onChange([...value, term])
    setSearch('')
  }, [search, value, valueSet, onChange])

  const remove = React.useCallback(
    (item: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onChange(value.filter((v) => v !== item))
    },
    [value, onChange]
  )

  const handleGoto = React.useCallback(
    (item: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onNavigateToProxy?.(item)
    },
    [onNavigateToProxy]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          tabIndex={0}
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className={cn('gap-0.5 pr-0.5 font-normal shrink-0', getRejectPolicyClassName(item))}
                >
                  <span className="max-w-[120px] truncate">{item}</span>
                  {onNavigateToProxy && (
                    <button
                      type="button"
                      onClick={(e) => handleGoto(item, e)}
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                      aria-label={gotoAriaLabel ? `${gotoAriaLabel} ${item}` : undefined}
                      title={gotoAriaLabel}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => remove(item, e)}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
            ))
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {filteredOptions.map((opt) => (
              <CommandItem
                key={opt}
                value={opt}
                onSelect={() => toggle(opt)}
                className={cn('cursor-pointer', getRejectPolicyClassName(opt))}
              >
                {valueSet.has(opt) ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{opt}</span>
              </CommandItem>
            ))}
            {canAddCustom && (
              <CommandItem
                value="__add_custom__"
                onSelect={addCustom}
                className="cursor-pointer text-muted-foreground"
              >
                <span className="h-4 w-4 shrink-0" />
                {addCustomLabel(search.trim())}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
