import { useCallback, useEffect, type ReactNode } from 'react'
import ru from '../locales/ru.json'
import en from '../locales/en.json'
import zh from '../locales/zh.json'
import fa from '../locales/fa.json'
import { mihomoFormMetaLocales } from 'sampo-editor/presets/mihomo'
import { I18nContext, type Locale } from './I18nContext'

const formMetaEn = mihomoFormMetaLocales.en

const messages: Record<Locale, Record<string, string>> = {
  ru: { ...ru, ...formMetaEn, ...mihomoFormMetaLocales.ru },
  en: { ...en, ...formMetaEn, ...mihomoFormMetaLocales.en },
  zh: { ...zh, ...formMetaEn, ...mihomoFormMetaLocales.zh },
  fa: { ...fa, ...formMetaEn, ...mihomoFormMetaLocales.fa },
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
    text
  )
}

type SetLocale = (next: Locale) => void

export function I18nProvider({
  children,
  locale,
  setLocale: setLocaleProp,
}: {
  children: ReactNode
  locale: Locale
  setLocale: SetLocale
}) {
  const setLocale = setLocaleProp

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
  }, [locale])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = messages[locale]
      const value = dict[key] ?? messages.en[key] ?? key
      return interpolate(value, params)
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}
