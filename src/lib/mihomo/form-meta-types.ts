/** Field descriptor from mihomo form-meta (generated from form-meta/*.json). */
export interface FormMetaField {
  /** snake_case unique id in form-meta */
  key: string
  /** kebab-case key in YAML config */
  yamlKey: string
  /** camelCase key in TypeScript state; if omitted, same as key */
  stateKey?: string
  type: string
  required?: boolean
  default?: unknown
  enum?: string[]
  i18nKey: string
  /** i18n key for short description; default in UI: i18nKey + '.desc' */
  descriptionKey?: string
  /** i18n key for help text (tooltip); default in UI: i18nKey + '.help' */
  helpKey?: string
  /** Fixed documentation URL for this field */
  link?: string
  /** i18n key whose value is the documentation URL (for per-locale links) */
  linkKey?: string
  /** Mark this field as deprecated — UI will show a visual indicator */
  deprecated?: boolean
}
