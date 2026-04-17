import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsType } from 'echarts'
import type { MihomoState } from '@/lib/mihomo/types'
import { buildTopologyData } from '@/lib/mihomo/topology-data'
import { useTranslation } from '@/i18n/useTranslation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

/** Only the fields that buildTopologyData actually reads from MihomoState. */
interface ConfigTopologyProps {
  ruleOrder: MihomoState['ruleOrder']
  groups: MihomoState['groups']
  rulesGeosite: MihomoState['rulesGeosite']
  rulesGeoip: MihomoState['rulesGeoip']
  ruleProviders: MihomoState['ruleProviders']
  manualRules: MihomoState['manualRules']
  match: MihomoState['match']
  serviceTemplates: MihomoState['serviceTemplates']
  enabledTemplates: MihomoState['enabledTemplates']
  subs: MihomoState['subs']
}

export function ConfigTopology({
  ruleOrder, groups, rulesGeosite, rulesGeoip,
  ruleProviders, manualRules, match, serviceTemplates, enabledTemplates, subs,
}: ConfigTopologyProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandChains, setExpandChains] = useState(true)
  const chartRef = useRef<ReactECharts | null>(null)

  const topologyData = useMemo(
    () => buildTopologyData(
      { ruleOrder, groups, rulesGeosite, rulesGeoip, ruleProviders, manualRules, match, serviceTemplates, enabledTemplates, subs } as MihomoState,
      { expandChains }
    ),
    [ruleOrder, groups, rulesGeosite, rulesGeoip, ruleProviders, manualRules, match, serviceTemplates, enabledTemplates, subs, expandChains]
  )

  const hasRules =
    topologyData.nodes.length > 0 && topologyData.links.length > 0

  const option = useMemo(() => {
    if (!hasRules) return null
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        formatter: (params: { name?: string; data?: { value?: number }; dataType?: string }) => {
          if (params.dataType === 'edge') {
            const edge = params as unknown as { data: { source: string; target: string; value: number } }
            return `${edge.data?.source ?? ''} → ${edge.data?.target ?? ''}<br/>${t('mihomo.topologyConnections', { count: edge.data?.value ?? 0 })}`
          }
          return params.name ?? ''
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency',
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
          },
          data: topologyData.nodes.map((n) => ({ name: n.name })),
          links: topologyData.links,
          left: '5%',
          right: '20%',
          top: 20,
          bottom: 20,
        },
      ],
    }
  }, [hasRules, topologyData, t])

  const matchingNodeNames = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.trim().toLowerCase()
    return topologyData.nodes
      .filter((n) => n.name.toLowerCase().includes(q))
      .map((n) => n.name)
  }, [searchQuery, topologyData.nodes])

  const highlightMatching = useCallback(() => {
    const instance = chartRef.current?.getEchartsInstance() as EChartsType | undefined
    if (!instance) return
    instance.dispatchAction({ type: 'downplay', dataIndex: [] })
    if (matchingNodeNames?.length) {
      matchingNodeNames.forEach((name) => {
        instance.dispatchAction({ type: 'highlight', name })
      })
    }
  }, [matchingNodeNames])

  useEffect(() => {
    if (!hasRules) return
    highlightMatching()
  }, [hasRules, highlightMatching])

  if (!hasRules) {
    return (
      <p className="text-sm text-muted-foreground">{t('mihomo.topologyEmpty')}</p>
    )
  }

  const chartHeight = Math.max(
    300,
    Math.min(expandChains ? 1000 : 600, topologyData.nodes.length * 28)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          type="text"
          placeholder={t('mihomo.topologySearch')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={t('mihomo.topologySearch')}
          className="max-w-[200px]"
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="topology-chains"
            checked={expandChains}
            onCheckedChange={(v) => setExpandChains(Boolean(v))}
          />
          <Label htmlFor="topology-chains" className="cursor-pointer text-sm">{t('mihomo.topologyShowChains')}</Label>
        </div>
      </div>
      <div style={{ minHeight: chartHeight }}>
        <ReactECharts
          ref={chartRef}
          option={option}
          theme="dark"
          style={{ height: chartHeight, width: '100%' }}
          onChartReady={() => {
            if (matchingNodeNames?.length) {
              setTimeout(() => highlightMatching(), 100)
            }
          }}
        />
      </div>
    </div>
  )
}
