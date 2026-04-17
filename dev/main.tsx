import 'sampo-editor/editor.css'
import { initMonaco } from 'sampo-editor'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Github, Moon, Sun } from 'lucide-react'

import {
  MihomoConfigGenerator,
  I18nProvider,
  LocaleSwitcher,
  useTranslation,
  type Locale,
} from '@/index'
import { Button } from '@/components/ui/button'

import './dev.css'

initMonaco()

function Shell() {
  const { locale, setLocale, t } = useTranslation()
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen p-4">
      <header className="mx-auto mb-6 flex max-w-full flex-col gap-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground">sampo-config playground</h1>
          <p className="text-sm text-muted-foreground">
            Local development environment for the embeddable Mihomo config generator.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LocaleSwitcher locale={locale} setLocale={setLocale} t={t} size="sm" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a
              href="https://github.com/uji69i/sampo-config"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Source repository"
            >
              <Github className="size-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-full">
        <MihomoConfigGenerator />
      </main>
    </div>
  )
}

function App() {
  const [locale, setLocale] = useState<Locale>('ru')
  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
