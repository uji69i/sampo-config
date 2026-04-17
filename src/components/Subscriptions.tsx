import { useMemo, useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { Subscription } from '@/lib/mihomo/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SectionCollapsible } from '@/components/ui/section-collapsible'

type SubType = 'http' | 'file'

/** Select for override.dialer-proxy: None + proxy names + group names; shows custom value if not in list. */
function DialerProxySelect({
  value,
  proxyNames,
  groupNames,
  noneLabel,
  onChange,
}: {
  value: string
  proxyNames: string[]
  groupNames: string[]
  noneLabel: string
  onChange: (v: string) => void
}) {
  const options = useMemo(() => {
    const fromLists = [...proxyNames, ...groupNames]
    const current = value.trim()
    const hasCustom = current && !fromLists.includes(current)
    return { none: '' as const, proxies: proxyNames, groups: groupNames, custom: hasCustom ? current : null }
  }, [value, proxyNames, groupNames])

  return (
    <Select value={value || '__none__'} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
      <SelectTrigger className="h-8">
        <SelectValue placeholder={noneLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{noneLabel}</SelectItem>
        {options.proxies.length > 0 && options.proxies.map((n) => (
          <SelectItem key={n} value={n}>{n}</SelectItem>
        ))}
        {options.groups.length > 0 && options.groups.map((n) => (
          <SelectItem key={n} value={n}>{n}</SelectItem>
        ))}
        {options.custom !== null && (
          <SelectItem value={options.custom}>{options.custom}</SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}

interface SubscriptionsProps {
  subs: Subscription[]
  advancedYaml: string
  advancedEnabled: boolean
  dialerProxyProxyNames: string[]
  dialerProxyGroupNames: string[]
  onAddSub: (sub: Subscription) => void
  onRemoveSub: (index: number) => void
  onUpdateSub: (index: number, patch: Partial<Subscription>) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
}

function isDuplicateName(subs: Subscription[], name: string, excludeIndex: number | null): boolean {
  const n = name.trim().toLowerCase()
  if (!n) return false
  return subs.some((s, i) => i !== excludeIndex && s.name.trim().toLowerCase() === n)
}

const DEFAULT_HC_URL = 'https://www.gstatic.com/generate_204'
const DEFAULT_HC_INTERVAL = 600

/** Initial empty sub-form state */
function emptySubForm(): SubFormState {
  return {
    name: '',
    subType: 'http',
    url: '',
    path: '',
    interval: 3600,
    fetchMode: 'DIRECT',
    fetchProxy: '',
    xHwid: '',
    sizeLimit: '',
    filter: '',
    excludeFilter: '',
    excludeType: '',
    healthCheckUrl: '',
    healthCheckInterval: DEFAULT_HC_INTERVAL,
    healthCheckTimeout: '',
    healthCheckLazy: false,
    healthCheckExpectedStatus: '',
    skipCertVerify: false,
    overrideUdp: false,
    overrideAdditionalPrefix: '',
    overrideAdditionalSuffix: '',
    overrideUp: '',
    overrideDown: '',
    overrideDialerProxy: '',
    overrideInterfaceName: '',
    overrideIpVersion: '',
    overrideRoutingMark: '',
  }
}

interface SubFormState {
  name: string
  subType: SubType
  url: string
  path: string
  interval: number
  fetchMode: 'DIRECT' | 'PROXY'
  fetchProxy: string
  xHwid: string
  sizeLimit: string
  filter: string
  excludeFilter: string
  excludeType: string
  healthCheckUrl: string
  healthCheckInterval: number
  healthCheckTimeout: string
  healthCheckLazy: boolean
  healthCheckExpectedStatus: string
  skipCertVerify: boolean
  overrideUdp: boolean
  overrideAdditionalPrefix: string
  overrideAdditionalSuffix: string
  overrideUp: string
  overrideDown: string
  overrideDialerProxy: string
  overrideInterfaceName: string
  overrideIpVersion: string
  overrideRoutingMark: string
}

function subToFormState(sub: Subscription): SubFormState {
  return {
    name: sub.name,
    subType: sub.type === 'file' ? 'file' : 'http',
    url: sub.url ?? '',
    path: sub.path ?? '',
    interval: sub.interval ?? 3600,
    fetchMode: (sub.fetchMode as 'DIRECT' | 'PROXY') ?? 'DIRECT',
    fetchProxy: sub.fetchProxy ?? '',
    xHwid: sub.xHwid ?? '',
    sizeLimit: sub.sizeLimit != null ? String(sub.sizeLimit) : '',
    filter: sub.filter ?? '',
    excludeFilter: sub.excludeFilter ?? '',
    excludeType: sub.excludeType ?? '',
    healthCheckUrl: sub.healthCheckUrl ?? '',
    healthCheckInterval: sub.healthCheckInterval ?? DEFAULT_HC_INTERVAL,
    healthCheckTimeout: sub.healthCheckTimeout != null ? String(sub.healthCheckTimeout) : '',
    healthCheckLazy: sub.healthCheckLazy ?? false,
    healthCheckExpectedStatus: sub.healthCheckExpectedStatus != null ? String(sub.healthCheckExpectedStatus) : '',
    skipCertVerify: sub.skipCertVerify ?? false,
    overrideUdp: sub.overrideUdp ?? false,
    overrideAdditionalPrefix: sub.overrideAdditionalPrefix ?? '',
    overrideAdditionalSuffix: sub.overrideAdditionalSuffix ?? '',
    overrideUp: sub.overrideUp ?? '',
    overrideDown: sub.overrideDown ?? '',
    overrideDialerProxy: sub.overrideDialerProxy ?? '',
    overrideInterfaceName: sub.overrideInterfaceName ?? '',
    overrideIpVersion: sub.overrideIpVersion ?? '',
    overrideRoutingMark: sub.overrideRoutingMark != null ? String(sub.overrideRoutingMark) : '',
  }
}

function formStateToSub(f: SubFormState): Subscription {
  const isFile = f.subType === 'file'
  return {
    name: f.name.trim(),
    type: f.subType,
    url: isFile ? '' : f.url.trim(),
    path: f.path.trim() || (isFile ? undefined : `./providers/${f.name.trim()}.yaml`),
    interval: isFile ? undefined : f.interval,
    fetchMode: isFile ? 'DIRECT' : f.fetchMode,
    fetchProxy: !isFile && f.fetchMode === 'PROXY' ? f.fetchProxy.trim() || undefined : undefined,
    xHwid: f.xHwid.trim() || undefined,
    sizeLimit: f.sizeLimit.trim() ? Number(f.sizeLimit) : undefined,
    filter: f.filter.trim() || undefined,
    excludeFilter: f.excludeFilter.trim() || undefined,
    excludeType: f.excludeType.trim() || undefined,
    healthCheckUrl: f.healthCheckUrl.trim() || undefined,
    healthCheckInterval: f.healthCheckInterval !== DEFAULT_HC_INTERVAL ? f.healthCheckInterval : undefined,
    healthCheckTimeout: f.healthCheckTimeout.trim() ? Number(f.healthCheckTimeout) : undefined,
    healthCheckLazy: f.healthCheckLazy || undefined,
    healthCheckExpectedStatus: f.healthCheckExpectedStatus.trim() ? Number(f.healthCheckExpectedStatus) : undefined,
    skipCertVerify: f.skipCertVerify || undefined,
    overrideUdp: f.overrideUdp || undefined,
    overrideAdditionalPrefix: f.overrideAdditionalPrefix.trim() || undefined,
    overrideAdditionalSuffix: f.overrideAdditionalSuffix.trim() || undefined,
    overrideUp: f.overrideUp.trim() || undefined,
    overrideDown: f.overrideDown.trim() || undefined,
    overrideDialerProxy: f.overrideDialerProxy.trim() || undefined,
    overrideInterfaceName: f.overrideInterfaceName.trim() || undefined,
    overrideIpVersion: f.overrideIpVersion.trim() || undefined,
    overrideRoutingMark: f.overrideRoutingMark.trim() ? Number(f.overrideRoutingMark) : undefined,
  }
}

function isFormValid(f: SubFormState): boolean {
  if (!f.name.trim()) return false
  if (f.subType === 'http') return Boolean(f.url.trim())
  return Boolean(f.path.trim())
}

/** Proxy-provider subscriptions (URLs or file paths); optional advanced YAML block. */
export function Subscriptions({
  subs,
  advancedYaml,
  advancedEnabled,
  dialerProxyProxyNames,
  dialerProxyGroupNames,
  onAddSub,
  onRemoveSub,
  onUpdateSub,
  onAdvancedYamlChange,
  onAdvancedToggle,
}: SubscriptionsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SubFormState>(emptySubForm())
  const [addDuplicateWarning, setAddDuplicateWarning] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDuplicateWarning, setEditDuplicateWarning] = useState(false)

  const set = (patch: Partial<SubFormState>) => setForm((f) => ({ ...f, ...patch }))

  const handleAdd = () => {
    const duplicate = isDuplicateName(subs, form.name, null)
    setAddDuplicateWarning(duplicate)
    onAddSub(formStateToSub(form))
    setForm(emptySubForm())
  }

  const startEdit = (idx: number) => {
    setEditingIndex(idx)
    setEditDuplicateWarning(false)
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditDuplicateWarning(false)
  }

  const handleSaveEdit = (idx: number, patch: Partial<Subscription>) => {
    const newName = (patch.name ?? subs[idx].name).trim()
    if (!newName) return
    const duplicate = isDuplicateName(subs, newName, idx)
    setEditDuplicateWarning(duplicate)
    onUpdateSub(idx, patch)
    if (!duplicate) setEditingIndex(null)
  }

  return (
    <SectionCollapsible open={open} onOpenChange={setOpen} title={t('mihomo.subsTitle')}>
      <div className="space-y-4">
        {/* Add form */}
        <SubForm
          form={form}
          onChange={set}
          onSubmit={handleAdd}
          duplicateWarning={addDuplicateWarning}
          submitLabel={t('mihomo.addSubButton')}
          t={t}
          dialerProxyProxyNames={dialerProxyProxyNames}
          dialerProxyGroupNames={dialerProxyGroupNames}
        />

        <p className="text-sm text-muted-foreground">{t('mihomo.subsHint')}</p>

        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 min-h-[60px]">
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mihomo.noSubs')}</p>
          ) : (
            subs.map((sub, idx) => (
              <div key={idx}>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card p-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <strong className="text-sm">{sub.name}</strong>
                    <Badge variant="secondary" className="text-xs">{sub.type === 'file' ? 'file' : (sub.fetchMode ?? 'DIRECT')}</Badge>
                    {sub.type === 'file' && sub.path && (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={sub.path}>{sub.path}</span>
                    )}
                    {sub.filter && <Badge variant="outline" className="text-xs font-mono">{sub.filter}</Badge>}
                    {sub.xHwid && <Badge variant="outline" className="text-xs">x-hwid</Badge>}
                  </div>
                  {sub.type !== 'file' && sub.url && (
                    <span className="text-xs text-muted-foreground truncate flex-1 min-w-0" title={sub.url}>{sub.url}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(idx)} aria-label={t('mihomo.editSub')}>
                      {t('mihomo.editSub')}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => onRemoveSub(idx)} aria-label={t('mihomo.delete')}>✕</Button>
                  </div>
                </div>
                {editingIndex === idx && (
                  <EditSubForm
                    sub={sub}
                    onSave={(patch) => handleSaveEdit(idx, patch)}
                    onCancel={cancelEdit}
                    duplicateWarning={editDuplicateWarning}
                    onDuplicateWarningChange={setEditDuplicateWarning}
                    isDuplicate={(nameToCheck) => isDuplicateName(subs, nameToCheck, idx)}
                    t={t}
                    dialerProxyProxyNames={dialerProxyProxyNames}
                    dialerProxyGroupNames={dialerProxyGroupNames}
                  />
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <b className="text-sm">{t('mihomo.advancedSubsTitle')}</b>
            <p className="text-xs text-muted-foreground">{t('mihomo.advancedSubsHint')}</p>
          </div>
          <Switch checked={advancedEnabled} onCheckedChange={onAdvancedToggle} />
        </div>
        {advancedEnabled && (
          <Textarea value={advancedYaml} onChange={(e) => onAdvancedYamlChange(e.target.value)} className="font-mono text-sm" spellCheck={false} rows={6} />
        )}
      </div>
    </SectionCollapsible>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-form (used both for Add and Edit)
// ---------------------------------------------------------------------------

interface SubFormProps {
  form: SubFormState
  onChange: (patch: Partial<SubFormState>) => void
  onSubmit: () => void
  onCancel?: () => void
  duplicateWarning: boolean
  submitLabel: string
  t: (key: string) => string
  dialerProxyProxyNames: string[]
  dialerProxyGroupNames: string[]
}

function SubForm({ form, onChange, onSubmit, onCancel, duplicateWarning, submitLabel, t, dialerProxyProxyNames, dialerProxyGroupNames }: SubFormProps) {
  const [hcOpen, setHcOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)

  const isFile = form.subType === 'file'
  const valid = isFormValid(form)

  const IP_VERSIONS = ['dual', 'ipv4', 'ipv6', 'ipv4-prefer', 'ipv6-prefer']

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      {/* Row 1: name + type */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">{t('mihomo.subsNameLabel')}</Label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t('mihomo.subsNamePlaceholder')}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('mihomo.subsTypeHttp')} / {t('mihomo.subsTypeFile')}</Label>
          <Select value={form.subType} onValueChange={(v) => onChange({ subType: v as SubType })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="http">{t('mihomo.subsTypeHttp')}</SelectItem>
              <SelectItem value="file">{t('mihomo.subsTypeFile')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* URL / Path */}
      {isFile ? (
        <div className="space-y-1">
          <Label className="text-xs">{t('mihomo.subsPathLabel')}</Label>
          <Input
            value={form.path}
            onChange={(e) => onChange({ path: e.target.value })}
            placeholder="/path/to/file.yaml"
            className="h-8 font-mono text-sm"
          />
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <Label className="text-xs">{t('mihomo.subsUrlLabel')}</Label>
            <Input
              type="url"
              value={form.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder={t('mihomo.subsPlaceholder')}
              className="h-8"
            />
          </div>
          {/* Row: interval + fetchMode */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsIntervalLabel')}</Label>
              <Input
                type="number"
                min={0}
                value={form.interval}
                onChange={(e) => onChange({ interval: Number(e.target.value) })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsFetchModeTitle')}</Label>
              <Select value={form.fetchMode} onValueChange={(v) => onChange({ fetchMode: v as 'DIRECT' | 'PROXY' })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">DIRECT</SelectItem>
                  <SelectItem value="PROXY">{t('mihomo.viaProxy')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.fetchMode === 'PROXY' && (
              <div className="space-y-1">
                <Label className="text-xs">{t('mihomo.subsFetchProxyLabel')}</Label>
                <Input
                  value={form.fetchProxy}
                  onChange={(e) => onChange({ fetchProxy: e.target.value })}
                  placeholder="PROXY"
                  className="h-8"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsSizeLimitLabel')}</Label>
              <Input
                type="number"
                min={0}
                value={form.sizeLimit}
                onChange={(e) => onChange({ sizeLimit: e.target.value })}
                placeholder="0"
                className="h-8"
              />
            </div>
          </div>
        </>
      )}

      {/* Filters */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">{t('mihomo.subsFilterLabel')}</Label>
          <Input
            value={form.filter}
            onChange={(e) => onChange({ filter: e.target.value })}
            placeholder={t('mihomo.subsFilterPlaceholder')}
            className="h-8 font-mono text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('mihomo.subsExcludeFilterLabel')}</Label>
          <Input
            value={form.excludeFilter}
            onChange={(e) => onChange({ excludeFilter: e.target.value })}
            className="h-8 font-mono text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('mihomo.subsExcludeTypeLabel')}</Label>
        <Input
          value={form.excludeType}
          onChange={(e) => onChange({ excludeType: e.target.value })}
          placeholder="ss|http|trojan"
          className="h-8 font-mono text-sm"
        />
      </div>

      {/* x-hwid */}
      <div className="space-y-1">
        <Label className="text-xs">{t('mihomo.subsXHwidLabel')} ({t('mihomo.subsXHwidPlaceholder')})</Label>
        <Input
          value={form.xHwid}
          onChange={(e) => onChange({ xHwid: e.target.value })}
          placeholder={t('mihomo.subsXHwidPlaceholder')}
          className="h-8 font-mono text-sm"
        />
      </div>

      {/* Health Check */}
      <SectionCollapsible open={hcOpen} onOpenChange={setHcOpen} title={t('mihomo.subsHealthCheckTitle')}>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('mihomo.subsHealthCheckUrl')}</Label>
            <Input
              value={form.healthCheckUrl}
              onChange={(e) => onChange({ healthCheckUrl: e.target.value })}
              placeholder={DEFAULT_HC_URL}
              className="h-8"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsHealthCheckInterval')}</Label>
              <Input
                type="number"
                min={0}
                value={form.healthCheckInterval}
                onChange={(e) => onChange({ healthCheckInterval: Number(e.target.value) })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsHealthCheckTimeout')}</Label>
              <Input
                type="number"
                min={0}
                value={form.healthCheckTimeout}
                onChange={(e) => onChange({ healthCheckTimeout: e.target.value })}
                placeholder="5000"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsHealthCheckExpectedStatus')}</Label>
              <Input
                type="number"
                min={0}
                value={form.healthCheckExpectedStatus}
                onChange={(e) => onChange({ healthCheckExpectedStatus: e.target.value })}
                placeholder="204"
                className="h-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.healthCheckLazy}
              onCheckedChange={(v) => onChange({ healthCheckLazy: v })}
              id="hc-lazy"
            />
            <Label htmlFor="hc-lazy" className="text-xs cursor-pointer">{t('mihomo.subsHealthCheckLazy')}</Label>
          </div>
        </div>
      </SectionCollapsible>

      {/* Override */}
      <SectionCollapsible open={overrideOpen} onOpenChange={setOverrideOpen} title={t('mihomo.subsOverrideTitle')}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.skipCertVerify}
                onCheckedChange={(v) => onChange({ skipCertVerify: v })}
                id="override-skip-cert"
              />
              <Label htmlFor="override-skip-cert" className="text-xs cursor-pointer">{t('mihomo.subsOverrideSkipCertVerify')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.overrideUdp}
                onCheckedChange={(v) => onChange({ overrideUdp: v })}
                id="override-udp"
              />
              <Label htmlFor="override-udp" className="text-xs cursor-pointer">{t('mihomo.subsOverrideUdp')}</Label>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideAdditionalPrefix')}</Label>
              <Input
                value={form.overrideAdditionalPrefix}
                onChange={(e) => onChange({ overrideAdditionalPrefix: e.target.value })}
                placeholder="[SUB1] "
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideAdditionalSuffix')}</Label>
              <Input
                value={form.overrideAdditionalSuffix}
                onChange={(e) => onChange({ overrideAdditionalSuffix: e.target.value })}
                placeholder=" (provider)"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideUp')}</Label>
              <Input
                value={form.overrideUp}
                onChange={(e) => onChange({ overrideUp: e.target.value })}
                placeholder="10 Mbps"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideDown')}</Label>
              <Input
                value={form.overrideDown}
                onChange={(e) => onChange({ overrideDown: e.target.value })}
                placeholder="50 Mbps"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideDialerProxy')}</Label>
              <DialerProxySelect
                value={form.overrideDialerProxy ?? ''}
                proxyNames={dialerProxyProxyNames}
                groupNames={dialerProxyGroupNames}
                noneLabel={t('mihomo.subsOverrideDialerProxyNone')}
                onChange={(v) => onChange({ overrideDialerProxy: v })}
              />
              <p className="text-xs text-muted-foreground">{t('mihomo.subsOverrideDialerProxyHelp')}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideInterfaceName')}</Label>
              <Input
                value={form.overrideInterfaceName}
                onChange={(e) => onChange({ overrideInterfaceName: e.target.value })}
                placeholder="eth0"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideIpVersion')}</Label>
              <Select
                value={form.overrideIpVersion || '__none__'}
                onValueChange={(v) => onChange({ overrideIpVersion: v === '__none__' ? '' : v })}
              >
                <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {IP_VERSIONS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('mihomo.subsOverrideRoutingMark')}</Label>
              <Input
                type="number"
                min={0}
                value={form.overrideRoutingMark}
                onChange={(e) => onChange({ overrideRoutingMark: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        </div>
      </SectionCollapsible>

      {duplicateWarning && (
        <Alert variant="default" className="py-2">
          <AlertDescription>{t('mihomo.subsDuplicateNameWarning')}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={onSubmit} disabled={!valid}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('mihomo.cancelSub')}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit wrapper — initialises from existing sub
// ---------------------------------------------------------------------------

interface EditSubFormProps {
  sub: Subscription
  onSave: (patch: Partial<Subscription>) => void
  onCancel: () => void
  duplicateWarning: boolean
  onDuplicateWarningChange: (v: boolean) => void
  isDuplicate: (name: string) => boolean
  t: (key: string) => string
  dialerProxyProxyNames: string[]
  dialerProxyGroupNames: string[]
}

function EditSubForm({ sub, onSave, onCancel, duplicateWarning, onDuplicateWarningChange, isDuplicate, t, dialerProxyProxyNames, dialerProxyGroupNames }: EditSubFormProps) {
  const [form, setForm] = useState<SubFormState>(() => subToFormState(sub))

  const handleSave = () => {
    if (!isFormValid(form)) return
    onDuplicateWarningChange(isDuplicate(form.name.trim()))
    onSave(formStateToSub(form))
  }

  return (
    <div className="mt-2">
      <SubForm
        form={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleSave}
        onCancel={onCancel}
        duplicateWarning={duplicateWarning}
        submitLabel={t('mihomo.saveSub')}
        t={t}
        dialerProxyProxyNames={dialerProxyProxyNames}
        dialerProxyGroupNames={dialerProxyGroupNames}
      />
    </div>
  )
}
