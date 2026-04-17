import { useReducer, useState, useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { getDataBaseUrl } from '@/lib/dataBaseUrl'
import { GEOSITE_URL, GEOIP_URL, MATCH_POLICIES } from '@/lib/mihomo/constants'
import { buildRuleEntriesArray } from '@/lib/mihomo/state-helpers'
import { serializeStateToUrl, MAX_URL_LENGTH } from '@/lib/mihomo/state-serializer'
import { createInitialState, mihomoReducer } from './mihomoReducer'
import { useConfigStatus } from './hooks/useConfigStatus'
import { useUrlImport } from './hooks/useUrlImport'
import { ProxyLinksInput } from './components/ProxyLinksInput'
import { Base64Import } from './components/Base64Import'
import { AmneziaWgImport } from './components/AmneziaWgImport'
import { WarpImport } from './components/WarpImport'
import { Subscriptions } from './components/Subscriptions'
import { ProxyGroups } from './components/config-sections/ProxyGroups'
import { GeoRules } from './components/GeoRules'
import { RuleProviders } from './components/RuleProviders'
import { ManualRules } from './components/ManualRules'
import { RuleOrder } from './components/RuleOrder'
import { YamlOutput } from './components/YamlOutput'
import { ImportConfigDialog } from './components/ImportConfigDialog'
import { ServiceTemplates } from './components/ServiceTemplates'
import { GeneralSettingsPanel } from './components/config-sections/GeneralSettingsPanel'
import { ExternalSettingsPanel } from './components/config-sections/ExternalSettingsPanel'
import { DnsSettingsPanel } from './components/config-sections/DnsSettingsPanel'
import { Listeners } from './components/config-sections/Listeners'
import { TunnelsPanel } from './components/config-sections/TunnelsPanel'
import { SubRulesPanel } from './components/config-sections/SubRulesPanel'
import { GeoSettingsPanel } from './components/config-sections/GeoSettingsPanel'
import { SnifferSettingsPanel } from './components/config-sections/SnifferSettingsPanel'
import { TlsSettingsPanel } from './components/config-sections/TlsSettingsPanel'
import { ManualProxiesPanel } from './components/config-sections/ManualProxiesPanel'
import { AdvancedRulesPanel } from './components/config-sections/AdvancedRulesPanel'
import { ConfigTopology } from './components/ConfigTopology'
import { DemoPresets } from './components/DemoPresets'
import type { MihomoProxy, ServiceTemplate } from '@/lib/mihomo/types'
import type { DemoPresetMeta } from './components/DemoPresets'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionCollapsible } from '@/components/ui/section-collapsible'
import { getRejectPolicyClassName, cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

/**
 * Mihomo/Clash config generator. Data flow:
 * 1) Input (col 1): links + base64 → proxies; subscriptions → proxy-providers; service templates → rule-providers + rules.
 * 2) Processing (col 2): groups define which proxies to use; MATCH = default policy for remaining traffic.
 * 3) Output (col 3): rule-providers, GEOSITE/GEOIP, manual rules, order → rules block.
 * 4) Ready config (col 4): buildFullConfig() → YAML, copy/download.
 */
export function MihomoConfigGenerator() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(mihomoReducer, createInitialState())
  const { status, statusText, handleBuild } = useConfigStatus(state, dispatch, t)
  const { urlSecurityWarning } = useUrlImport(dispatch)
  const warpProxiesApplied = useRef(false)

  useEffect(() => {
    const stateLocation = location.state as { warpProxies?: MihomoProxy[] } | null
    const warpProxies = stateLocation?.warpProxies
    if (!warpProxies?.length || warpProxiesApplied.current) return
    warpProxiesApplied.current = true
    dispatch({ type: 'ADD_EXTRA_PROXIES', payload: warpProxies })
    dispatch({ type: 'BUILD_PROXIES' })
    dispatch({ type: 'REBUILD_RULE_ORDER' })
    navigate(location.pathname + location.search, { replace: true, state: {} })
  }, [location.state, location.pathname, location.search, navigate])
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [demoPresets, setDemoPresets] = useState<DemoPresetMeta[]>([])
  const [importedOriginalYaml, setImportedOriginalYaml] = useState<string | null>(null)
  const [openPanels, setOpenPanels] = useState(() => new Set(['yamlOutput', 'topology']))
  const [configSectionsTab, setConfigSectionsTab] = useState<string>('general')
  const setPanelOpen = useCallback((id: string, open: boolean) => {
    setOpenPanels((prev) => {
      const s = new Set(prev)
      if (open) s.add(id); else s.delete(id)
      return s
    })
  }, [])

  const isStateEmpty =
    !state.linksRaw.trim() &&
    !state.extraProxies.length &&
    !state.subs.length &&
    !state.groups.length &&
    state.enabledTemplates.size === 0 &&
    !state.ruleProviders.length &&
    !state.manualRules.length &&
    !state.listeners.length

  const groupNames = state.groups.map((g) => g.name).filter(Boolean)
  const proxyNames = state.proxies.map((p) => p.name).filter(Boolean) as string[]
  const listenerNames = state.listeners.map((l) => l.name).filter(Boolean)
  const subRuleSetNames = Object.keys(state.subRules).filter(Boolean)
  const policyOptions = [
    ...MATCH_POLICIES.map((p) => ({ value: p.value, label: p.value })),
    ...groupNames.map((n) => ({ value: n, label: n })),
    ...listenerNames.filter((n) => !groupNames.includes(n)).map((n) => ({ value: n, label: n })),
    ...subRuleSetNames
      .filter((n) => !groupNames.includes(n) && !listenerNames.includes(n))
      .map((n) => ({ value: n, label: n })),
  ]

  const loadGeosite = useCallback(async () => {
    try {
      const res = await fetch(GEOSITE_URL)
      const text = await res.text()
      const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
      dispatch({ type: 'SET_GEOSITE', payload: lines })
    } catch (e) {
      console.error('Load geosite failed', e)
    }
  }, [])

  const loadGeoip = useCallback(async () => {
    try {
      const res = await fetch(GEOIP_URL)
      const text = await res.text()
      const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
      dispatch({ type: 'SET_GEOIP', payload: lines })
    } catch (e) {
      console.error('Load geoip failed', e)
    }
  }, [])

  const resetGeositeSelection = useCallback(() => {
    dispatch({ type: 'SET_RULES_GEOSITE', payload: new Map() })
  }, [])

  const resetGeoipSelection = useCallback(() => {
    dispatch({ type: 'SET_RULES_GEOIP', payload: new Map() })
  }, [])

  useEffect(() => {
    const url = `${getDataBaseUrl()}data/service-templates.json`
    fetch(url)
      .then((r) => r.json())
      .then((data: ServiceTemplate[]) => {
        if (Array.isArray(data)) dispatch({ type: 'SET_SERVICE_TEMPLATES', payload: data })
      })
      .catch((e) => console.warn('Load service templates failed', e))
  }, [])

  useEffect(() => {
    const url = `${getDataBaseUrl()}data/demo-presets/index.json`
    fetch(url)
      .then((r) => r.json())
      .then((data: DemoPresetMeta[]) => {
        if (Array.isArray(data)) setDemoPresets(data)
      })
      .catch((e) => console.warn('Load demo presets index failed', e))
  }, [])

  const handleShare = useCallback(async () => {
    const encoded = serializeStateToUrl(state)
    const base = window.location.origin + window.location.pathname
    const shareUrl = base + (encoded ? '?config=' + encoded : '')
    if (shareUrl.length > MAX_URL_LENGTH) {
      const msg = t('mihomo.shareUrlTooLong')
      await navigator.clipboard.writeText(msg)
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // ignore
    }
  }, [state, t])

  return (
    <div>
      <h1 className="mb-1 text-[1.6rem] font-bold">{t('mihomo.title')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t('mihomo.subtitle')}</p>

      {urlSecurityWarning && (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/10" role="alert">
          <AlertDescription>{t('mihomo.urlSecurityWarning')}</AlertDescription>
        </Alert>
      )}

      <DemoPresets
        presets={demoPresets}
        isStateEmpty={isStateEmpty}
        dispatch={dispatch}
        onPresetLoaded={() => setImportedOriginalYaml(null)}
      />

      <section className="mb-6">
        <SectionCollapsible
          open={openPanels.has('yamlOutput')}
          onOpenChange={(v) => setPanelOpen('yamlOutput', v)}
          title={t('mihomo.outputTitle')}
          variant="bordered"
          contentClassName="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t('mihomo.editorSectionTitle')}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setImportDialogOpen(true)}>
              {t('mihomo.importButton')}
            </Button>
          </div>
          <YamlOutput
            state={state}
            status={status}
            statusText={statusText}
            dispatch={dispatch}
            onShare={handleShare}
            importedOriginalYaml={importedOriginalYaml}
            onImportedOriginalYamlChange={setImportedOriginalYaml}
          />
        </SectionCollapsible>
      </section>

      <section className="mb-6">
        <SectionCollapsible
          open={openPanels.has('topology')}
          onOpenChange={(v) => setPanelOpen('topology', v)}
          title={t('mihomo.topologyTitle')}
          variant="bordered"
        >
          <ConfigTopology
            ruleOrder={state.ruleOrder}
            groups={state.groups}
            rulesGeosite={state.rulesGeosite}
            rulesGeoip={state.rulesGeoip}
            ruleProviders={state.ruleProviders}
            manualRules={state.manualRules}
            match={state.match}
            serviceTemplates={state.serviceTemplates}
            enabledTemplates={state.enabledTemplates}
            subs={state.subs}
          />
        </SectionCollapsible>
      </section>

      <Tabs value={configSectionsTab} onValueChange={setConfigSectionsTab} className="mb-6">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="general" className="flex-1">
            {t('mihomo.configTabGeneral')}
          </TabsTrigger>
          <TabsTrigger value="dns" className="flex-1">
            {t('mihomo.configTabDns')}
          </TabsTrigger>
          <TabsTrigger value="geo" className="flex-1">
            {t('mihomo.configTabGeo')}
          </TabsTrigger>
          <TabsTrigger value="sniffer" className="flex-1">
            {t('mihomo.configTabSniffer')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
          <GeneralSettingsPanel
            settings={state.generalSettings}
            useGeneralSettings={state.useGeneralSettings}
            advancedGeneralYaml={state.advancedGeneralYaml}
            useAdvancedGeneralYaml={state.useAdvancedGeneralYaml}
            customGeneralYaml={state.customGeneralYaml}
            onSettingsChange={(patch) => dispatch({ type: 'SET_GENERAL_SETTINGS', payload: patch })}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_GENERAL_SETTINGS', payload: v })}
            onAdvancedYamlChange={(v) => dispatch({ type: 'SET_ADVANCED_GENERAL_YAML', payload: v })}
            onAdvancedToggle={(v) => dispatch({ type: 'SET_USE_ADVANCED_GENERAL', payload: v })}
            onCustomYamlChange={(v) => dispatch({ type: 'SET_CUSTOM_GENERAL_YAML', payload: v })}
          />
          <ExternalSettingsPanel
            settings={state.externalSettings}
            useExternalSettings={state.useExternalSettings}
            advancedExternalYaml={state.advancedExternalYaml}
            useAdvancedExternalYaml={state.useAdvancedExternalYaml}
            customExternalYaml={state.customExternalYaml}
            onSettingsChange={(patch) => dispatch({ type: 'SET_EXTERNAL_SETTINGS', payload: patch })}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_EXTERNAL_SETTINGS', payload: v })}
            onAdvancedYamlChange={(v) => dispatch({ type: 'SET_ADVANCED_EXTERNAL_YAML', payload: v })}
            onAdvancedToggle={(v) => dispatch({ type: 'SET_USE_ADVANCED_EXTERNAL', payload: v })}
            onCustomYamlChange={(v) => dispatch({ type: 'SET_CUSTOM_EXTERNAL_YAML', payload: v })}
          />
          <TlsSettingsPanel
            settings={state.tlsSettings}
            useTlsSettings={state.useTlsSettings}
            advancedTlsYaml={state.advancedTlsYaml}
            useAdvancedTlsYaml={state.useAdvancedTlsYaml}
            customTlsYaml={state.customTlsYaml}
            onSettingsChange={(patch) => dispatch({ type: 'SET_TLS_SETTINGS', payload: patch })}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_TLS_SETTINGS', payload: v })}
            onAdvancedYamlChange={(v) =>
              dispatch({ type: 'SET_ADVANCED_TLS_YAML', payload: v })
            }
            onAdvancedToggle={(v) =>
              dispatch({ type: 'SET_USE_ADVANCED_TLS', payload: v })
            }
            onCustomYamlChange={(v) =>
              dispatch({ type: 'SET_CUSTOM_TLS_YAML', payload: v })
            }
          />
        </TabsContent>
        <TabsContent value="dns" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
          <DnsSettingsPanel
            settings={state.dnsSettings}
            useDnsSettings={state.useDnsSettings}
            advancedDnsYaml={state.advancedDnsYaml}
            useAdvancedDnsYaml={state.useAdvancedDnsYaml}
            customDnsYaml={state.customDnsYaml}
            onSettingsChange={(patch) => dispatch({ type: 'SET_DNS_SETTINGS', payload: patch })}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_DNS_SETTINGS', payload: v })}
            onAdvancedYamlChange={(v) => dispatch({ type: 'SET_ADVANCED_DNS_YAML', payload: v })}
            onAdvancedToggle={(v) => dispatch({ type: 'SET_USE_ADVANCED_DNS', payload: v })}
            onCustomYamlChange={(v) => dispatch({ type: 'SET_CUSTOM_DNS_YAML', payload: v })}
          />
          <Listeners
            listeners={state.listeners}
            useListeners={state.useListeners}
            useAdvancedListenersYaml={state.useAdvancedListenersYaml}
            advancedListenersYaml={state.advancedListenersYaml}
            customListenersYaml={state.customListenersYaml}
            policyOptions={policyOptions}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_LISTENERS', payload: v })}
            onAddListener={(listener) =>
              dispatch({ type: 'ADD_LISTENER', payload: { listener } })
            }
            onUpdateListener={(index, patch) =>
              dispatch({ type: 'UPDATE_LISTENER', payload: { index, listener: patch } })
            }
            onRemoveListener={(i) => dispatch({ type: 'REMOVE_LISTENER', payload: i })}
            onAdvancedYamlChange={(v) =>
              dispatch({ type: 'SET_ADVANCED_LISTENERS_YAML', payload: v })
            }
            onAdvancedToggle={(v) =>
              dispatch({ type: 'SET_USE_ADVANCED_LISTENERS', payload: v })
            }
            onCustomYamlChange={(v) =>
              dispatch({ type: 'SET_CUSTOM_LISTENERS_YAML', payload: v })
            }
          />
          <TunnelsPanel
            tunnels={state.tunnels}
            useTunnels={state.useTunnels}
            useAdvancedTunnelsYaml={state.useAdvancedTunnelsYaml}
            advancedTunnelsYaml={state.advancedTunnelsYaml}
            customTunnelsYaml={state.customTunnelsYaml}
            policyOptions={policyOptions}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_TUNNELS', payload: v })}
            onAddTunnel={(entry) => dispatch({ type: 'ADD_TUNNEL', payload: entry })}
            onUpdateTunnel={(index, entry) =>
              dispatch({ type: 'UPDATE_TUNNEL', payload: { index, entry } })
            }
            onRemoveTunnel={(i) => dispatch({ type: 'REMOVE_TUNNEL', payload: i })}
            onAdvancedYamlChange={(v) =>
              dispatch({ type: 'SET_ADVANCED_TUNNELS_YAML', payload: v })
            }
            onAdvancedToggle={(v) =>
              dispatch({ type: 'SET_USE_ADVANCED_TUNNELS', payload: v })
            }
            onCustomYamlChange={(v) =>
              dispatch({ type: 'SET_CUSTOM_TUNNELS_YAML', payload: v })
            }
          />
        </TabsContent>
        <TabsContent value="geo" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
          <GeoSettingsPanel
            settings={state.geoSettings}
            useGeoSettings={state.useGeoSettings}
            advancedGeoYaml={state.advancedGeoYaml}
            useAdvancedGeoYaml={state.useAdvancedGeoYaml}
            customGeoYaml={state.customGeoYaml}
            onSettingsChange={(patch) => dispatch({ type: 'SET_GEO_SETTINGS', payload: patch })}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_GEO_SETTINGS', payload: v })}
            onAdvancedYamlChange={(v) => dispatch({ type: 'SET_ADVANCED_GEO_YAML', payload: v })}
            onAdvancedToggle={(v) => dispatch({ type: 'SET_USE_ADVANCED_GEO', payload: v })}
            onCustomYamlChange={(v) => dispatch({ type: 'SET_CUSTOM_GEO_YAML', payload: v })}
          />
        </TabsContent>
        <TabsContent value="sniffer" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
          <SnifferSettingsPanel
            settings={state.snifferSettings}
            useSnifferSettings={state.useSnifferSettings}
            advancedSnifferYaml={state.advancedSnifferYaml}
            useAdvancedSnifferYaml={state.useAdvancedSnifferYaml}
            customSnifferYaml={state.customSnifferYaml}
            onSettingsChange={(patch) => dispatch({ type: 'SET_SNIFFER_SETTINGS', payload: patch })}
            onUseToggle={(v) => dispatch({ type: 'SET_USE_SNIFFER_SETTINGS', payload: v })}
            onAdvancedYamlChange={(v) =>
              dispatch({ type: 'SET_ADVANCED_SNIFFER_YAML', payload: v })
            }
            onAdvancedToggle={(v) =>
              dispatch({ type: 'SET_USE_ADVANCED_SNIFFER', payload: v })
            }
            onCustomYamlChange={(v) =>
              dispatch({ type: 'SET_CUSTOM_SNIFFER_YAML', payload: v })
            }
          />
        </TabsContent>
      </Tabs>

      <section className="mb-6">
        <SectionCollapsible
          open={openPanels.has('generators')}
          onOpenChange={(v) => setPanelOpen('generators', v)}
          title={t('mihomo.expanderGenerators')}
          variant="standalone"
          contentClassName="mt-0 space-y-4"
        >
          <div className="rounded-lg border border-border p-4 space-y-4">
            <ProxyLinksInput
              value={state.linksRaw}
              onChange={(v) => dispatch({ type: 'SET_LINKS_RAW', payload: v })}
              onBuild={handleBuild}
            />
            <Base64Import
              onLinksAppend={(links) => {
                const current = state.linksRaw
                const sep = current && !current.endsWith('\n') ? '\n' : ''
                dispatch({ type: 'SET_LINKS_RAW', payload: current + sep + links })
              }}
            />
            <AmneziaWgImport
              onAddProxies={(proxies) => dispatch({ type: 'ADD_EXTRA_PROXIES', payload: proxies })}
              onBuild={() => {
                dispatch({ type: 'BUILD_PROXIES' })
                dispatch({ type: 'REBUILD_RULE_ORDER' })
              }}
            />
            <WarpImport
              onAddProxies={(proxies) => dispatch({ type: 'ADD_EXTRA_PROXIES', payload: proxies })}
              onBuild={() => {
                dispatch({ type: 'BUILD_PROXIES' })
                dispatch({ type: 'REBUILD_RULE_ORDER' })
              }}
            />
          </div>
        </SectionCollapsible>
      </section>

      <Tabs defaultValue="input" className="mb-6">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="input" className="flex-1">
            {t('mihomo.columnInput')}
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex-1">
            {t('mihomo.columnProcessing')}
          </TabsTrigger>
          <TabsTrigger value="output" className="flex-1">
            {t('mihomo.columnOutput')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="input" className="space-y-4 pt-4">
          <Subscriptions
            subs={state.subs}
            advancedYaml={state.advancedSubsYaml}
            advancedEnabled={state.useAdvancedSubsYaml}
            dialerProxyProxyNames={proxyNames}
            dialerProxyGroupNames={groupNames}
            onAddSub={(sub) => dispatch({ type: 'ADD_SUB', payload: sub })}
            onRemoveSub={(i) => dispatch({ type: 'REMOVE_SUB', payload: i })}
            onUpdateSub={(index, patch) =>
              dispatch({ type: 'UPDATE_SUB', payload: { index, sub: patch } })
            }
            onAdvancedYamlChange={(v) =>
              dispatch({ type: 'SET_ADVANCED_SUBS_YAML', payload: v })
            }
            onAdvancedToggle={(v) =>
              dispatch({ type: 'SET_USE_ADVANCED_SUBS', payload: v })
            }
          />
          <ManualProxiesPanel
            extraProxies={state.extraProxies}
            onAddProxy={(p) => dispatch({ type: 'ADD_EXTRA_PROXIES', payload: [p] })}
            onUpdateProxy={(idx, patch) =>
              dispatch({ type: 'UPDATE_EXTRA_PROXY', payload: { index: idx, patch } })
            }
            onRemoveProxy={(i) => dispatch({ type: 'REMOVE_EXTRA_PROXY', payload: i })}
          />
        </TabsContent>
        <TabsContent value="processing" className="space-y-4 pt-4">
          {state.serviceTemplates.length > 0 && (
            <SectionCollapsible
              open={openPanels.has('serviceTemplates')}
              onOpenChange={(v) => setPanelOpen('serviceTemplates', v)}
              title={
                <>
                  {t('mihomo.serviceTemplatesTitle')} · {t('mihomo.serviceTemplatesCount', {
                    total: state.serviceTemplates.length,
                    enabled: state.enabledTemplates.size,
                  })}
                </>
              }
            >
              <ServiceTemplates
                templates={state.serviceTemplates}
                enabledTemplates={state.enabledTemplates}
                policyOptions={policyOptions}
                onToggle={(id, policy) =>
                  dispatch({ type: 'TOGGLE_TEMPLATE', payload: { id, policy } })
                }
                onPolicyChange={(id, policy) =>
                  dispatch({ type: 'SET_TEMPLATE_POLICY', payload: { id, policy } })
                }
              />
            </SectionCollapsible>
          )}
          <ProxyGroups
            groups={state.groups}
            proxyNames={state.proxies.map((p) => p.name).filter(Boolean) as string[]}
            onAddGroup={(g) => dispatch({ type: 'ADD_GROUP', payload: g })}
            onUpdateGroup={(i, patch) =>
              dispatch({ type: 'UPDATE_GROUP', payload: { index: i, group: patch } })
            }
            onRemoveGroup={(i) => dispatch({ type: 'REMOVE_GROUP', payload: i })}
            advancedYaml={state.advancedGroupsYaml}
            advancedEnabled={state.useAdvancedGroupsYaml}
            onAdvancedYamlChange={(v) =>
              dispatch({ type: 'SET_ADVANCED_GROUPS_YAML', payload: v })
            }
            onAdvancedToggle={(v) =>
              dispatch({ type: 'SET_USE_ADVANCED_GROUPS', payload: v })
            }
          />
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">MATCH</span>
                <CardTitle className="text-sm">{t('mihomo.matchTitle')}</CardTitle>
              </div>
              <Select
                value={state.match.mode === 'builtin' || state.match.mode === 'group' ? state.match.value : 'auto'}
                onValueChange={(v) => {
                  if (v === 'DIRECT' || v === 'REJECT')
                    dispatch({ type: 'SET_MATCH', payload: { mode: 'builtin', value: v } })
                  else if (groupNames.includes(v))
                    dispatch({ type: 'SET_MATCH', payload: { mode: 'group', value: v } })
                  else
                    dispatch({ type: 'SET_MATCH', payload: { mode: 'auto', value: '' } })
                }}
              >
                <SelectTrigger
                  className={cn(
                    'w-[140px]',
                    getRejectPolicyClassName(state.match.mode === 'builtin' || state.match.mode === 'group' ? state.match.value : '')
                  )}
                >
                  <SelectValue placeholder={t('mihomo.matchPolicyAuto')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('mihomo.matchPolicyAuto')}</SelectItem>
                  {policyOptions
                    .filter((o) => o.label !== t('mihomo.matchPolicyAuto'))
                    .map((o) => (
                      <SelectItem key={o.value} value={o.value} className={getRejectPolicyClassName(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="output" className="space-y-4 pt-4">
          <RuleProviders
            providers={state.ruleProviders}
            groupNames={groupNames}
            onAdd={(rp) => dispatch({ type: 'ADD_RULE_PROVIDER', payload: rp })}
            onUpdate={(index, provider) =>
              dispatch({ type: 'UPDATE_RULE_PROVIDER', payload: { index, provider } })
            }
            onRemove={(i) =>
              dispatch({ type: 'REMOVE_RULE_PROVIDER', payload: i })
            }
          />
          <SubRulesPanel
            subRules={state.subRules}
            onAddSet={(name, rules) =>
              dispatch({ type: 'ADD_SUB_RULE_SET', payload: { name, rules } })
            }
            onUpdateSet={(payload) =>
              dispatch({ type: 'UPDATE_SUB_RULE_SET', payload })
            }
            onRemoveSet={(name) =>
              dispatch({ type: 'REMOVE_SUB_RULE_SET', payload: name })
            }
          />
          <GeoRules
            geositeList={state.geosite}
            geoipList={state.geoip}
            rulesGeosite={state.rulesGeosite}
            rulesGeoip={state.rulesGeoip}
            onLoadGeosite={loadGeosite}
            onLoadGeoip={loadGeoip}
            onSetGeositePolicy={(name, target) =>
              dispatch({ type: 'SET_GEOSITE_POLICY', payload: { name, target } })
            }
            onSetGeoipPolicy={(code, target) =>
              dispatch({ type: 'SET_GEOIP_POLICY', payload: { code, target } })
            }
            onResetGeosite={resetGeositeSelection}
            onResetGeoip={resetGeoipSelection}
            policyOptions={policyOptions}
          />
          <AdvancedRulesPanel
            enabled={state.useAdvancedRulesYaml}
            yaml={state.advancedRulesYaml}
            onToggle={(v) => dispatch({ type: 'SET_USE_ADVANCED_RULES', payload: v })}
            onYamlChange={(v) => dispatch({ type: 'SET_ADVANCED_RULES_YAML', payload: v })}
          />
          <ManualRules
            rules={state.manualRules}
            groupNames={groupNames}
            onAdd={(r) => dispatch({ type: 'ADD_MANUAL_RULE', payload: r })}
            onUpdate={(index, rule) =>
              dispatch({ type: 'UPDATE_MANUAL_RULE', payload: { index, rule } })
            }
            onRemove={(i) =>
              dispatch({ type: 'REMOVE_MANUAL_RULE', payload: i })
            }
          />
          <section className="mt-4">
            <RuleOrder
              entries={
                state.ruleOrder.length
                  ? state.ruleOrder
                  : buildRuleEntriesArray(state)
              }
              onReorder={(ordered) =>
                dispatch({ type: 'SET_RULE_ORDER', payload: ordered })
              }
            />
          </section>
        </TabsContent>
      </Tabs>

      {importDialogOpen && (
        <ImportConfigDialog
          onClose={() => setImportDialogOpen(false)}
          onApply={(payload, rawYaml) => {
            dispatch({ type: 'IMPORT_YAML', payload })
            setImportedOriginalYaml(rawYaml)
            setImportDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}
