import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible"
import { cn } from "@/lib/utils"

interface SectionCollapsibleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  triggerRight?: React.ReactNode
  variant?: "bordered" | "standalone"
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

function SectionCollapsible({
  open,
  onOpenChange,
  title,
  triggerRight,
  variant = "bordered",
  children,
  className,
  contentClassName,
}: SectionCollapsibleProps) {
  const triggerClasses = cn(
    "flex items-center justify-between gap-2 py-2.5 px-4 w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-muted/50 transition-colors",
    variant === "bordered" ? "rounded-t-lg" : "rounded-lg border border-border"
  )

  const content = (
    <div className={cn("px-4 pb-4 pt-3", contentClassName)}>{children}</div>
  )

  const collapsible = (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <div role="button" tabIndex={0} className={triggerClasses}>
          <span className="font-semibold text-sm">{title}</span>
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {triggerRight}
            {open ? (
              <ChevronUpIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{content}</CollapsibleContent>
    </Collapsible>
  )

  if (variant === "bordered") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border overflow-hidden",
          className
        )}
      >
        {collapsible}
      </div>
    )
  }

  return <div className={className}>{collapsible}</div>
}

export { SectionCollapsible }
