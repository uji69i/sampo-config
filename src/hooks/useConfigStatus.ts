import { useState, useMemo, useCallback } from 'react'
import type { Dispatch } from 'react'
import type { MihomoState } from '@/lib/mihomo/types'
import type { MihomoAction } from '../mihomoReducer'

/**
 * Tracks whether the user has clicked "Build" at least once and derives
 * the config-status badge (idle / ok / error) from the current reducer state.
 */
export function useConfigStatus(
  state: MihomoState,
  dispatch: Dispatch<MihomoAction>,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const [hasBuilt, setHasBuilt] = useState(false)

  const handleBuild = useCallback(() => {
    dispatch({ type: 'BUILD_PROXIES' })
    dispatch({ type: 'REBUILD_RULE_ORDER' })
    setHasBuilt(true)
  }, [dispatch])

  const { status, statusText } = useMemo(() => {
    if (!hasBuilt) return { status: 'idle' as const, statusText: '—' }
    const totalProxies = state.proxies.length
    if (totalProxies === 0 && !state.subs.length) {
      return { status: 'error' as const, statusText: t('mihomo.emptyStatus') }
    }
    const parts: string[] = []
    if (totalProxies) parts.push(t('mihomo.countProxies', { count: totalProxies }))
    if (state.subs.length) parts.push(t('mihomo.countSubs', { count: state.subs.length }))
    if (state.groups.length) parts.push(t('mihomo.countGroups', { count: state.groups.length }))
    const ruleCount = state.rulesGeosite.size + state.rulesGeoip.size
    if (ruleCount) parts.push(t('mihomo.countRules', { count: ruleCount }))
    return {
      status: 'ok' as const,
      statusText: parts.length ? parts.join(', ') : t('mihomo.advancedOnly'),
    }
  }, [hasBuilt, state.proxies, state.subs, state.groups, state.rulesGeosite, state.rulesGeoip, t])

  return { status, statusText, handleBuild }
}
