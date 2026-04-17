import { useState, useEffect, useRef } from 'react'
import type { Dispatch } from 'react'
import { deserializeStateFromUrl } from '@/lib/mihomo/state-serializer'
import type { MihomoAction } from '../mihomoReducer'

/**
 * On mount, checks for a `?config=` URL parameter and imports the serialized
 * state into the reducer. Uses a ref-based guard so Strict Mode double-invocation
 * does not import twice.  Removes the parameter from the URL after reading it.
 *
 * Returns `urlSecurityWarning` — true when external config was loaded, so the UI
 * can show a warning banner.
 */
export function useUrlImport(dispatch: Dispatch<MihomoAction>) {
  const [urlSecurityWarning, setUrlSecurityWarning] = useState(false)
  const urlImportDone = useRef(false)

  useEffect(() => {
    if (urlImportDone.current) return
    const params = new URLSearchParams(window.location.search)
    const configParam = params.get('config')
    if (!configParam) return
    urlImportDone.current = true
    const payload = deserializeStateFromUrl(configParam)
    if (payload) {
      dispatch({ type: 'IMPORT_SERIALIZED', payload })
      queueMicrotask(() => setUrlSecurityWarning(true))
    }
    params.delete('config')
    const newSearch = params.toString()
    const newUrl =
      window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
    window.history.replaceState(null, '', newUrl)
  }, [dispatch])

  return { urlSecurityWarning }
}
