import { useTranslation } from '@/i18n/useTranslation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const DEMO_LINKS = `vless://uuid@example.com:443?encryption=none&security=tls#Demo-VLESS
vmess://eyJhZGQiOiJleGFtcGxlLmNvbSIsInBvcnQiOjQ0MywidWlkIjoidXVpZCIsImNpcGhlciI6ImF1dG8iLCJhaWQiOjB9
ss://Y2hhY2hhMjA6cGFzc3dvcmQ@example.com:8388#Demo-SS
trojan://password@example.com:443?sni=example.com#Demo-Trojan`

interface ProxyLinksInputProps {
  value: string
  onChange: (value: string) => void
  onBuild: () => void
}

/** Textarea for proxy links (vless, vmess, ss, …) + Demo/Clear/Build buttons. */
export function ProxyLinksInput({ value, onChange, onBuild }: ProxyLinksInputProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">{t('mihomo.inputTitle')}</CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onChange(DEMO_LINKS)}>
            {t('mihomo.demoButton')}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => onChange('')}>
            {t('mihomo.clearButton')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="vless://...&#10;vmess://...&#10;ss://..."
          rows={6}
          spellCheck={false}
          className="font-mono text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onBuild}>
            {t('mihomo.convertButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
