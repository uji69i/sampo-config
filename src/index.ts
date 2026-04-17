export { MihomoConfigGenerator } from './MihomoConfigGenerator'
export {
  mihomoReducer,
  createInitialState,
  type MihomoAction,
} from './mihomoReducer'

export { I18nProvider } from './i18n/context'
export { useTranslation } from './i18n/useTranslation'
export {
  I18nContext,
  LOCALES,
  LOCALE_LABEL_KEYS,
  type Locale,
  type I18nContextValue,
} from './i18n/I18nContext'

export { LocaleSwitcher } from './components/ui/locale-switcher'
export type { LocaleSwitcherProps, LocaleSwitcherSize } from './components/ui/locale-switcher'

export { cn, getRejectPolicyClassName } from './lib/utils'
export { getDataBaseUrl } from './lib/dataBaseUrl'

export type { MihomoState, MihomoProxy, ServiceTemplate } from './lib/mihomo/types'
export { buildFullConfig } from './lib/mihomo/yaml-gen'
export { parseYamlToState } from './lib/mihomo/yaml-import'
export { serializeStateToUrl, MAX_URL_LENGTH } from './lib/mihomo/state-serializer'
