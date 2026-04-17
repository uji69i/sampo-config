import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Tailwind classes for REJECT policy (red text). Empty string for other values. */
export function getRejectPolicyClassName(value: string): string {
  return value === 'REJECT' ? 'text-red-600 dark:text-red-400' : ''
}
