import { Button } from './button'
import { cn } from '@/lib/utils'
import { LOCALES, LOCALE_LABEL_KEYS, type Locale } from '@/i18n/I18nContext'

export type LocaleSwitcherSize = 'sm' | 'default'

export type LocaleSwitcherProps = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  size?: LocaleSwitcherSize
  className?: string
}

export function LocaleSwitcher({
  locale,
  setLocale,
  t,
  size = 'default',
  className,
}: LocaleSwitcherProps) {
  return (
    <>
      {LOCALES.map((loc) => (
        <Button
          key={loc}
          type="button"
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          className={cn(
            className,
            locale === loc && 'border-primary text-primary hover:bg-primary/10 hover:text-primary'
          )}
          onClick={() => setLocale(loc)}
          aria-label={t(LOCALE_LABEL_KEYS[loc])}
        >
          {t(LOCALE_LABEL_KEYS[loc])}
        </Button>
      ))}
    </>
  )
}
