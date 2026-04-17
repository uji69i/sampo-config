import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { parseYamlToState, type ParseYamlFormMeta } from '@/lib/mihomo/yaml-import'
import type { MihomoState } from '@/lib/mihomo/types'
import { mihomoFormMeta as formMeta } from 'sampo-editor/presets/mihomo'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ImportConfigDialogProps {
  onClose: () => void
  onApply: (payload: Partial<MihomoState>, rawYaml: string) => void
}

export function ImportConfigDialog({ onClose, onApply }: ImportConfigDialogProps) {
  const { t } = useTranslation()
  const [yamlText, setYamlText] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const handleApply = () => {
    const trimmed = yamlText.trim()
    if (!trimmed) {
      setErrors([t('mihomo.importDialogHint')])
      return
    }
    const { state: parsed, errors: parseErrors } = parseYamlToState(trimmed, {
      formMeta: formMeta as ParseYamlFormMeta,
    })
    setErrors(parseErrors)
    if (parseErrors.length > 0 && (!parsed || Object.keys(parsed).length === 0)) return
    if (parsed && Object.keys(parsed).length > 0) {
      onApply(parsed, trimmed)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl"
        aria-describedby={undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{t('mihomo.importDialogTitle')}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <p className="text-sm text-muted-foreground">{t('mihomo.importDialogHint')}</p>
          <Textarea
            value={yamlText}
            onChange={(e) => setYamlText(e.target.value)}
            placeholder="proxies:&#10;  - name: ..."
            spellCheck={false}
            rows={12}
            className="font-mono text-sm"
          />
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong className="mb-1 block">{t('mihomo.importErrors')}</strong>
                <ul className="list-inside list-disc space-y-0.5">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter className="shrink-0 gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('mihomo.cancelButton')}
          </Button>
          <Button type="button" onClick={handleApply} className="bg-green-600 hover:bg-green-700">
            {t('mihomo.applyButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
