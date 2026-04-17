import { useState, useCallback } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { MihomoState } from '@/lib/mihomo/types'
import type { MihomoAction } from '../mihomoReducer'
import { getDataBaseUrl } from '@/lib/dataBaseUrl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface DemoPresetMeta {
  id: string
  file: string
  nameKey: string
  descKey: string
}

interface DemoPresetsProps {
  presets: DemoPresetMeta[]
  isStateEmpty: boolean
  dispatch: React.Dispatch<MihomoAction>
  onPresetLoaded?: () => void
}

const BASE = `${getDataBaseUrl()}data/demo-presets/`

/** Dropdown to select a demo preset and load it (replaces current state). */
export function DemoPresets({
  presets,
  isStateEmpty,
  dispatch,
  onPresetLoaded,
}: DemoPresetsProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const selected = presets.find((p) => p.id === selectedId)

  const handleLoad = useCallback(async () => {
    if (!selected) return
    if (!isStateEmpty && !window.confirm(t('mihomo.demoConfirm'))) return
    setLoadError(null)
    setLoading(true)
    try {
      const res = await fetch(BASE + selected.file)
      if (!res.ok) throw new Error('Fetch failed')
      const raw = (await res.json()) as Record<string, unknown>
      if (!raw || typeof raw !== 'object') return
      const payload: Partial<MihomoState> = { ...raw }
      if (raw.enabledTemplates && typeof raw.enabledTemplates === 'object' && !(raw.enabledTemplates instanceof Map)) {
        payload.enabledTemplates = new Map(Object.entries(raw.enabledTemplates as Record<string, string>))
      }
      if (raw.rulesGeosite && typeof raw.rulesGeosite === 'object' && !(raw.rulesGeosite instanceof Map)) {
        payload.rulesGeosite = new Map(Object.entries(raw.rulesGeosite as Record<string, { action: string; target: string }>))
      }
      if (raw.rulesGeoip && typeof raw.rulesGeoip === 'object' && !(raw.rulesGeoip instanceof Map)) {
        payload.rulesGeoip = new Map(Object.entries(raw.rulesGeoip as Record<string, { action: string; target: string }>))
      }
      dispatch({ type: 'IMPORT_SERIALIZED', payload })
      onPresetLoaded?.()
    } catch (e) {
      console.warn('Load demo preset failed', e)
      setLoadError(t('mihomo.demoLoadError'))
    } finally {
      setLoading(false)
    }
  }, [selected, isStateEmpty, t, dispatch, onPresetLoaded])

  if (presets.length === 0) return null

  return (
    <div className="space-y-3 pb-3">
      <h2 className="text-base font-semibold">{t('mihomo.demoPresetsTitle')}</h2>
      <p className="text-sm text-muted-foreground">{t('mihomo.demoPresetsHint')}</p>
      <div className="flex flex-row items-center gap-2">
        <div className="flex-1 min-w-0">
          <Select value={selectedId || undefined} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full min-w-[200px]" aria-label={t('mihomo.demoSelectPlaceholder')}>
              <SelectValue placeholder={t('mihomo.demoSelectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {t(p.nameKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={handleLoad}
          disabled={!selected || loading}
        >
          {loading ? '…' : t('mihomo.demoLoadButton')}
        </Button>
      </div>
      {selected && <p className="text-sm text-muted-foreground">{t(selected.descKey)}</p>}
      {loadError && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
