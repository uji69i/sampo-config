import { useState, useMemo } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { getRejectPolicyClassName, cn } from '@/lib/utils'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 200

function isoToFlag(iso: string): string {
  const s = iso.toUpperCase()
  if (!/^[A-Z]{2}$/.test(s)) return ''
  const A = 0x1f1e6
  const base = 'A'.codePointAt(0)!
  return String.fromCodePoint(
    A + (s.codePointAt(0)! - base),
    A + (s.codePointAt(1)! - base)
  )
}

interface GeoRulesProps {
  geositeList: string[]
  geoipList: string[]
  rulesGeosite: Map<string, { action: string; target: string }>
  rulesGeoip: Map<string, { action: string; target: string }>
  onLoadGeosite: () => Promise<void>
  onLoadGeoip: () => Promise<void>
  onSetGeositePolicy: (name: string, target: string) => void
  onSetGeoipPolicy: (code: string, target: string) => void
  onResetGeosite: () => void
  onResetGeoip: () => void
  policyOptions: { value: string; label: string }[]
}

export function GeoRules({
  geositeList,
  geoipList,
  rulesGeosite,
  rulesGeoip,
  onLoadGeosite,
  onLoadGeoip,
  onSetGeositePolicy,
  onSetGeoipPolicy,
  onResetGeosite,
  onResetGeoip,
  policyOptions,
}: GeoRulesProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [geositeSearch, setGeositeSearch] = useState('')
  const [geoipSearch, setGeoipSearch] = useState('')
  const [geositeShown, setGeositeShown] = useState(PAGE_SIZE)
  const [geoipShown, setGeoipShown] = useState(PAGE_SIZE)
  const [geositeLoading, setGeositeLoading] = useState(false)
  const [geoipLoading, setGeoipLoading] = useState(false)

  const filteredGeosite = useMemo(() => {
    const q = geositeSearch.trim().toLowerCase()
    return q ? geositeList.filter((s) => s.toLowerCase().includes(q)) : geositeList
  }, [geositeList, geositeSearch])

  const filteredGeoip = useMemo(() => {
    const q = geoipSearch.trim().toLowerCase()
    return q ? geoipList.filter((s) => s.toLowerCase().includes(q) || isoToFlag(s).length > 0) : geoipList
  }, [geoipList, geoipSearch])

  return (
    <SectionCollapsible open={open} onOpenChange={setOpen} title="GEOSITE / GEOIP">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary">{t('mihomo.rulesSubtitle')}</Badge>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">GEOSITE</span>
              <h3 className="text-sm font-semibold">{t('mihomo.geositeTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('mihomo.geositeFile')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={geositeLoading} onClick={async () => { setGeositeLoading(true); await onLoadGeosite(); setGeositeLoading(false) }}>
                {t('mihomo.geositeLoadButton')}
              </Button>
              <Badge variant="secondary">{geositeList.length ? `${geositeList.length} ${t('mihomo.loaded')}` : t('mihomo.notLoaded')}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onResetGeosite}>{t('mihomo.resetSelection')}</Button>
            <Input type="text" placeholder={t('mihomo.geositeSearch')} value={geositeSearch} onChange={(e) => setGeositeSearch(e.target.value)} className="flex-1" />
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-auto rounded border border-border bg-muted/30 p-2">
            {filteredGeosite.slice(0, geositeShown).map((name) => (
              <div key={name} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">{name}</span>
                <Select value={rulesGeosite.get(name)?.target ?? 'empty'} onValueChange={(v) => onSetGeositePolicy(name, v === 'empty' ? 'DIRECT' : v)}>
                  <SelectTrigger className={cn('w-[110px] h-8', getRejectPolicyClassName(rulesGeosite.get(name)?.target ?? ''))}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empty">—</SelectItem>
                    {policyOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} className={getRejectPolicyClassName(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {filteredGeosite.length > geositeShown && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setGeositeShown((n) => n + PAGE_SIZE)}>{t('mihomo.showMore')}</Button>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">GEOIP</span>
              <h3 className="text-sm font-semibold">{t('mihomo.geoipTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('mihomo.geoipFile')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={geoipLoading} onClick={async () => { setGeoipLoading(true); await onLoadGeoip(); setGeoipLoading(false) }}>
                {t('mihomo.geoipLoadButton')}
              </Button>
              <Badge variant="secondary">{geoipList.length ? `${geoipList.length} ${t('mihomo.loaded')}` : t('mihomo.notLoaded')}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onResetGeoip}>{t('mihomo.resetSelection')}</Button>
            <Input type="text" placeholder={t('mihomo.geoipSearch')} value={geoipSearch} onChange={(e) => setGeoipSearch(e.target.value)} className="flex-1" />
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-auto rounded border border-border bg-muted/30 p-2">
            {filteredGeoip.slice(0, geoipShown).map((code) => (
              <div key={code} className="flex items-center justify-between gap-2">
                <span className="text-sm">{isoToFlag(code)} {code}</span>
                <Select value={rulesGeoip.get(code)?.target ?? 'empty'} onValueChange={(v) => onSetGeoipPolicy(code, v === 'empty' ? 'DIRECT' : v)}>
                  <SelectTrigger className={cn('w-[110px] h-8', getRejectPolicyClassName(rulesGeoip.get(code)?.target ?? ''))}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empty">—</SelectItem>
                    {policyOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} className={getRejectPolicyClassName(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {filteredGeoip.length > geoipShown && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setGeoipShown((n) => n + PAGE_SIZE)}>{t('mihomo.showMore')}</Button>
          )}
        </div>
        </div>
      </div>
    </SectionCollapsible>
  )
}
