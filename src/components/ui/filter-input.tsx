import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from './input'

export interface FilterInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  showSearchIcon?: boolean
}

const FilterInput = React.forwardRef<HTMLInputElement, FilterInputProps>(
  ({ value, onChange, className, showSearchIcon = true, ...props }, ref) => {
    const hasValue = value.trim() !== ''

    return (
      <div
        className={cn(
          'relative w-full',
          hasValue && 'ring-[3px] ring-orange-500/50 rounded-md border border-orange-500'
        )}
      >
        {showSearchIcon && (
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden
          />
        )}
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            showSearchIcon && 'pl-8',
            hasValue ? 'pr-8' : 'pr-3',
            className
          )}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Clear filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
)

FilterInput.displayName = 'FilterInput'

export { FilterInput }
