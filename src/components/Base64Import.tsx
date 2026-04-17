import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { decodeSubscription } from '@/lib/mihomo/decode-subscription'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Base64ImportProps {
  onLinksAppend: (links: string) => void
}

/** Decodes base64 or raw subscription text and appends links to the main input. */
export function Base64Import({ onLinksAppend }: Base64ImportProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [lastResult, setLastResult] = useState<{
    proxiesCount: number
    urlsCount: number
    errorsCount: number
    inputFormat: 'base64' | 'raw' | null
  } | null>(null)

  function handleDecode() {
    const raw = input.trim()
    if (!raw) return
    const result = decodeSubscription(raw)
    setLastResult({
      proxiesCount: result.proxies.length,
      urlsCount: result.urls.length,
      errorsCount: result.errors.length,
      inputFormat: result.inputFormat,
    })
    if (result.urls.length > 0) {
      onLinksAppend(result.urls.join('\n'))
    }
  }

  function handleClear() {
    setInput('')
    setLastResult(null)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('mihomo.base64Title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('mihomo.base64Hint')}</p>
        <p className="text-sm text-muted-foreground">{t('mihomo.base64CorsHint')}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('mihomo.base64Placeholder')}
          spellCheck={false}
          rows={4}
          className="font-mono text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleDecode}>
            {t('mihomo.base64Decode')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClear}>
            {t('mihomo.base64Clear')}
          </Button>
        </div>
        {lastResult && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {lastResult.proxiesCount > 0 ? (
              <span className="text-muted-foreground">
                {t('mihomo.base64Appended', { count: lastResult.urlsCount })}
              </span>
            ) : (
              <span className="text-muted-foreground">{t('mihomo.base64NoProxies')}</span>
            )}
            {lastResult.inputFormat && (
              <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {lastResult.inputFormat === 'base64'
                  ? t('proxyToolkit.formatBase64')
                  : t('proxyToolkit.formatRaw')}
              </span>
            )}
            {lastResult.errorsCount > 0 && (
              <span className="text-destructive">
                {t('proxyToolkit.summaryErrors', { count: lastResult.errorsCount })}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
