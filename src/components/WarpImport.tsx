import { useState, useRef } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { parseWarpConf, isWarpConf } from '@/lib/mihomo/parse-warp'
import type { MihomoProxy } from '@/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface WarpImportProps {
  onAddProxies: (proxies: MihomoProxy[]) => void
  onBuild: () => void
}

export function WarpImport({ onAddProxies, onBuild }: WarpImportProps) {
  const { t } = useTranslation()
  const [dragOver, setDragOver] = useState(false)
  const [lastResult, setLastResult] = useState<{
    count: number
    files: number
    errors: string[]
    notWarp?: boolean
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFiles(files: FileList | null): Promise<void> {
    if (!files?.length) return
    const allProxies: MihomoProxy[] = []
    const errors: string[] = []
    let notWarp = false
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const text = await file.text()
        if (!isWarpConf(text)) notWarp = true
        const proxies = parseWarpConf(text)
        if (proxies.length) {
          allProxies.push(...proxies)
        } else {
          errors.push(file.name + ': ' + t('mihomo.warpImportNoPeer'))
        }
      } catch (e) {
        errors.push(file.name + ': ' + (e instanceof Error ? e.message : String(e)))
      }
    }
    if (allProxies.length > 0) {
      onAddProxies(allProxies)
      onBuild()
    }
    setLastResult({
      count: allProxies.length,
      files: allProxies.length ? files.length : 0,
      errors,
      notWarp: notWarp && allProxies.length > 0,
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleClear() {
    setLastResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('mihomo.warpImportTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('mihomo.warpImportHint')}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <input
          ref={inputRef}
          type="file"
          accept=".conf"
          multiple
          onChange={handleFileChange}
          className="sr-only"
          aria-label={t('mihomo.warpImportTitle')}
        />
        <div
          className={cn(
            'flex min-h-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50',
            dragOver && 'border-primary bg-muted/50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          {t('mihomo.warpImportDrop')}
        </div>
        {lastResult && (
          <div className="space-y-2">
            {lastResult.count > 0 ? (
              <span className="text-sm text-muted-foreground">
                {t('mihomo.warpImportAdded', {
                  count: lastResult.count,
                  files: lastResult.files,
                })}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">{t('mihomo.warpImportNoPeer')}</span>
            )}
            {lastResult.notWarp && (
              <Alert className="border-amber-500/40 bg-amber-500/10">
                <AlertDescription>{t('warp.notWarpWarningBody')}</AlertDescription>
              </Alert>
            )}
            {lastResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-inside list-disc space-y-1">
                    {lastResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
              {t('mihomo.base64Clear')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
