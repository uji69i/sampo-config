import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ConfigEditor, ConfigDiffEditor, setupMonacoYaml } from 'sampo-editor'
import {
  mihomoFormMeta as formMeta,
  mihomoSchema,
  MIHOMO_SCHEMA_URI,
} from 'sampo-editor/presets/mihomo'
import { useTranslation } from '@/i18n/useTranslation'
import { buildFullConfig, type MihomoFormMeta } from '@/lib/mihomo/yaml-gen'
import { parseYamlToState, type ParseYamlFormMeta } from '@/lib/mihomo/yaml-import'
import type { MihomoState } from '@/lib/mihomo/types'
import type { MihomoAction } from '../mihomoReducer'

const parseOptions = { formMeta: formMeta as ParseYamlFormMeta }
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface YamlOutputProps {
  state: MihomoState
  status: 'idle' | 'ok' | 'error'
  statusText: string
  dispatch: React.Dispatch<MihomoAction>
  onShare?: () => void
  importedOriginalYaml?: string | null
  onImportedOriginalYamlChange?: (yaml: string) => void
}

function getOverrides(state: MihomoState): Parameters<typeof buildFullConfig>[1] {
  const overrides: Parameters<typeof buildFullConfig>[1] = {
    formMeta: formMeta as MihomoFormMeta,
  }
  if (state.useAdvancedSubsYaml && state.advancedSubsYaml)
    overrides.advancedSubsYaml = state.advancedSubsYaml
  if (state.useAdvancedGroupsYaml && state.advancedGroupsYaml)
    overrides.advancedGroupsYaml = state.advancedGroupsYaml
  if (state.useAdvancedRulesYaml && state.advancedRulesYaml)
    overrides.advancedRulesYaml = state.advancedRulesYaml
  return overrides
}

export function YamlOutput({
  state,
  status,
  statusText,
  dispatch,
  onShare,
  importedOriginalYaml = null,
  onImportedOriginalYamlChange,
}: YamlOutputProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [isManualMode, setIsManualMode] = useState(false)
  const [localYaml, setLocalYaml] = useState('')
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [diffDialogOpen, setDiffDialogOpen] = useState(false)
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false)
  const fullscreenWrapRef = useRef<HTMLDivElement>(null)
  const baselineYamlRef = useRef('')

  const overrides = useMemo(() => getOverrides(state), [state])
  const generatedYaml = useMemo(() => buildFullConfig(state, overrides), [state, overrides])
  const displayValue = isManualMode ? localYaml : generatedYaml

  useEffect(() => {
    if (!isManualMode) return
    if (generatedYaml === baselineYamlRef.current) return
    const dirty = localYaml !== baselineYamlRef.current
    if (!dirty) {
      baselineYamlRef.current = generatedYaml
      setLocalYaml(generatedYaml)
      return
    }
    setOverwriteConfirmOpen(true)
  }, [generatedYaml, isManualMode, localYaml])

  const previewSummary = useMemo(() => {
    const text = displayValue || ''
    const { state: s, errors } = parseYamlToState(text, parseOptions)
    if (errors.length) return { ok: false as const, errors }
    return {
      ok: true as const,
      proxies: s.proxies?.length ?? 0,
      groups: s.groups?.length ?? 0,
      manualRules: s.manualRules?.length ?? 0,
      ruleProviders: s.ruleProviders?.length ?? 0,
    }
  }, [displayValue])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayValue)
      setCopied(true)
      setCopyFailed(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API denied — try legacy execCommand fallback
      try {
        const ta = document.createElement('textarea')
        ta.value = displayValue
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (ok) {
          setCopied(true)
          setCopyFailed(false)
          setTimeout(() => setCopied(false), 2000)
        } else {
          setCopyFailed(true)
          setTimeout(() => setCopyFailed(false), 3000)
        }
      } catch {
        setCopyFailed(true)
        setTimeout(() => setCopyFailed(false), 3000)
      }
    }
  }

  const handleDownload = () => {
    const blob = new Blob([displayValue], { type: 'application/yaml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'config.yaml'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleEditorChange = useCallback((v: string) => {
    if (!isManualMode) return
    setLocalYaml(v ?? '')
  }, [isManualMode])

  const handleEnterManualMode = useCallback(() => {
    baselineYamlRef.current = generatedYaml
    setLocalYaml(generatedYaml)
    setImportErrors([])
    setIsManualMode(true)
  }, [generatedYaml])

  const handleApply = useCallback(() => {
    const { state: parsed, errors } = parseYamlToState(localYaml, parseOptions)
    if (errors.length > 0) {
      setImportErrors(errors)
      return
    }
    if (!parsed || Object.keys(parsed).length === 0) {
      setImportErrors(['Empty or invalid YAML'])
      return
    }
    setImportErrors([])
    onImportedOriginalYamlChange?.(localYaml)
    dispatch({ type: 'IMPORT_YAML', payload: parsed })
    setIsManualMode(false)
    setLocalYaml('')
  }, [localYaml, dispatch, onImportedOriginalYamlChange])

  const handleCancel = useCallback(() => {
    setIsManualMode(false)
    setLocalYaml('')
    setImportErrors([])
    setOverwriteConfirmOpen(false)
  }, [])

  const handleDiscardManualEdits = useCallback(() => {
    baselineYamlRef.current = generatedYaml
    setLocalYaml(generatedYaml)
    setImportErrors([])
    setOverwriteConfirmOpen(false)
  }, [generatedYaml])

  const handleKeepManualEdits = useCallback(() => {
    baselineYamlRef.current = generatedYaml
    setOverwriteConfirmOpen(false)
  }, [generatedYaml])

  const handleShare = async () => {
    if (onShare) {
      onShare()
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  const hasOriginal = importedOriginalYaml != null && importedOriginalYaml.length > 0

  return (
    <div ref={fullscreenWrapRef} className={isFullscreen ? 'fixed inset-4 z-50 rounded-lg border border-border bg-card p-4 overflow-auto' : 'max-h-[75vh] overflow-y-auto overflow-x-hidden'}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="bg-green-600/20 hover:bg-green-600/30 text-green-600 dark:text-green-400" onClick={handleCopy}>
                {t('mihomo.copyButton')} {copied ? ` — ${t('mihomo.copied')}` : copyFailed ? ` — ${t('mihomo.copyFailed')}` : ''}
              </Button>
              <Button size="sm" onClick={handleDownload}>{t('mihomo.downloadButton')}</Button>
              {onShare && (
                <Button size="sm" variant="ghost" onClick={handleShare}>
                  {t('mihomo.shareButton')} {shareCopied ? ` — ${t('mihomo.shareCopied')}` : ''}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={!hasOriginal}
                onClick={() => setDiffDialogOpen(true)}
                title={!hasOriginal ? t('mihomo.showDiffButtonDisabled') : undefined}
              >
                {t('mihomo.showDiffButton')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(true)}>{t('mihomo.fullscreenButton')}</Button>
              {isFullscreen && (
                <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(false)}>{t('mihomo.exitFullscreenButton')}</Button>
              )}
              {!isManualMode && (
                <Button size="sm" variant="outline" onClick={handleEnterManualMode} title={t('mihomo.editManuallyButtonHint')}>
                  {t('mihomo.editManuallyButton')}
                </Button>
              )}
              {isManualMode && (
                <>
                  <Button size="sm" variant="default" onClick={handleApply} title={t('mihomo.applyButtonHint')}>
                    {t('mihomo.applyButton')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel} title={t('mihomo.resetButtonHint')}>
                    {t('mihomo.resetButton')}
                  </Button>
                </>
              )}
            </div>
            {isManualMode && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('mihomo.manualModeActiveHint')}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={status === 'error' ? 'destructive' : 'secondary'}>{status}</Badge>
              <span>{statusText}</span>
            </div>
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong className="block mb-1">{t('mihomo.importErrors')}</strong>
                  <ul className="list-inside list-disc space-y-0.5">
                    {importErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="h-[320px] min-h-[200px] max-h-[60vh] resize-y overflow-visible rounded-lg border border-border flex flex-col" style={{ resize: 'vertical' }}>
              <ConfigEditor
                value={displayValue ?? ''}
                onChange={handleEditorChange}
                language="yaml"
                height="100%"
                path="mihomo-config.yaml"
                options={{ readOnly: !isManualMode }}
                onMount={(monaco) => setupMonacoYaml(monaco, { schema: mihomoSchema, schemaUri: MIHOMO_SCHEMA_URI })}
              />
            </div>
            {diffDialogOpen && hasOriginal && (
              <Dialog open onOpenChange={(open) => !open && setDiffDialogOpen(false)}>
                <DialogContent className="min-w-[95vw] max-w-[95vw] w-[95vw] h-[90vh] flex flex-col gap-3 p-4" aria-describedby={undefined}>
                  <DialogHeader className="shrink-0">
                    <DialogTitle>{t('mihomo.diffDialogTitle')}</DialogTitle>
                  </DialogHeader>
                  <div className="shrink-0 grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>{t('mihomo.diffDialogOriginalLabel')}</span>
                    <span>{t('mihomo.diffDialogModifiedLabel')}</span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ConfigDiffEditor
                      key={`diff-${importedOriginalYaml?.length ?? 0}-${generatedYaml.length}`}
                      original={importedOriginalYaml ?? ''}
                      modified={generatedYaml ?? ''}
                      height="100%"
                      onMount={(monaco) => setupMonacoYaml(monaco, { schema: mihomoSchema, schemaUri: MIHOMO_SCHEMA_URI })}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {overwriteConfirmOpen && (
              <Dialog open onOpenChange={(open) => !open && handleKeepManualEdits()}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('mihomo.formChangedWhileEditingTitle')}</DialogTitle>
                    <DialogDescription>{t('mihomo.formChangedWhileEditingBody')}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost" onClick={handleKeepManualEdits}>
                      {t('mihomo.keepManualEdits')}
                    </Button>
                    <Button variant="destructive" onClick={handleDiscardManualEdits}>
                      {t('mihomo.discardManualEdits')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <span className="font-medium text-muted-foreground">Preview: </span>
              {previewSummary.ok ? (
                <span>
                  Proxies: {previewSummary.proxies}, Groups: {previewSummary.groups}
                  {(previewSummary.manualRules ?? 0) > 0 ? `, Rules: ${previewSummary.manualRules}` : ''}
                  {(previewSummary.ruleProviders ?? 0) > 0 ? `, Rule providers: ${previewSummary.ruleProviders}` : ''}
                </span>
              ) : (
                <span className="text-destructive">{(previewSummary.errors ?? []).join('; ')}</span>
              )}
            </div>
          </div>
        </div>
  )
}
