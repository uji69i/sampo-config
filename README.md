# sampo-config
[![npm (alpha)](https://img.shields.io/npm/v/sampo-config/alpha)](https://www.npmjs.com/package/sampo-config)
[![status: alpha](https://img.shields.io/badge/status-alpha-orange)](#installation)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Embeddable Mihomo/Clash config generator for React + Vite + Tailwind v4 apps.

Drop `<MihomoConfigGenerator />` into your app, wrap it in `I18nProvider` + a
router, bring Tailwind v4 with the provided theme, and the full UI of the
generator becomes available.

All mihomo-specific knowledge — the form-meta catalogue, the JSON Schema used
for YAML validation, and the Monaco editor itself — lives in
[`sampo-editor`](../sampo-editor), which `sampo-config` consumes as a peer
dependency. Edit form-meta YAML once, get both the generator UI and the Monaco
editor hints updated.

## Installation

```bash
pnpm add sampo-config sampo-editor react react-dom react-router-dom
```

Peer dependencies:

- `react` / `react-dom` `^19`
- `react-router-dom` `^7` — `<MihomoConfigGenerator />` reads `location.state`
  for warp proxies handoff, so it must be mounted inside a router.
- `sampo-editor` — provides Monaco editor components, the mihomo JSON Schema
  and form-meta data. Exposed via `sampo-editor/presets/mihomo`.

## Tailwind v4 setup

`sampo-config` ships Tailwind source files and a `@theme inline` block.
Tailwind must be run by the consumer (no prebuilt CSS in dist).

In your app's main CSS file:

```css
@import "tailwindcss";
@import "sampo-config/styles.css";
@import "sampo-editor/editor.css";

@source "../node_modules/sampo-config/dist";
@source "../node_modules/sampo-editor/dist";
```

The `@source` directives tell Tailwind's JIT to scan the compiled library
files so the required utility classes end up in your bundle.

Dark mode is toggled by placing the `dark` class on any ancestor of the
generator (commonly `<html>`). `sampo-config` does not ship a theme provider —
use your own or toggle the class manually.

## Usage

```tsx
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initMonaco } from 'sampo-editor'

import {
  MihomoConfigGenerator,
  I18nProvider,
  type Locale,
} from 'sampo-config'

import './app.css' // your CSS entry with the @import / @source lines above

initMonaco() // wires Monaco web workers — call once at app startup

function App() {
  const [locale, setLocale] = useState<Locale>('en')
  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <BrowserRouter>
        <MihomoConfigGenerator />
      </BrowserRouter>
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

The mihomo JSON Schema is bundled inside `sampo-editor/presets/mihomo` and
wired into Monaco automatically by `<YamlOutput />` — you do not need to
serve any `mihomo.schema.json` file yourself.

## Public API

```ts
import {
  // Main generator
  MihomoConfigGenerator,

  // Reducer (for custom integrations)
  mihomoReducer,
  createInitialState,
  type MihomoAction,

  // i18n
  I18nProvider,
  useTranslation,
  I18nContext,
  LOCALES,
  LOCALE_LABEL_KEYS,
  type Locale,
  type I18nContextValue,

  // UI helpers
  LocaleSwitcher,
  type LocaleSwitcherProps,

  // Utilities
  cn,
  getRejectPolicyClassName,
  getDataBaseUrl,

  // Mihomo state / serialization
  type MihomoState,
  type MihomoProxy,
  type ServiceTemplate,
  buildFullConfig,
  parseYamlToState,
  serializeStateToUrl,
  MAX_URL_LENGTH,
} from 'sampo-config'
```

For form-meta data, the mihomo JSON Schema, or to localize the schema
descriptions, import directly from `sampo-editor/presets/mihomo`.

## Local development

```bash
pnpm install
pnpm dev           # vite playground at http://localhost:5173
pnpm typecheck
pnpm test
pnpm build         # library build → dist/ (ESM, .d.ts, styles.css)
pnpm build:site    # playground as a static site → dist-site/
pnpm build:single  # playground as one inlined HTML file → dist-single/index.html
pnpm build:all     # all three above in sequence
pnpm preflight     # typecheck + test + build (what CI runs)
```

`sampo-editor` is linked locally via `file:../sampo-editor` in
`devDependencies`. Build `sampo-editor` first (its `dist/` must exist) before
running `sampo-config`'s dev server or build — the playground and library
consume `sampo-editor/dist` directly.

The `dev/` directory hosts a minimal playground that imports the library via
the `@/` alias (the same way a consumer would import from `sampo-config`).

### Editing the mihomo form-meta

Form-meta YAML lives in `sampo-editor/form-meta/`. After editing anything
there, run `pnpm build:presets` (or `pnpm build`) inside `sampo-editor` to
regenerate `presets/mihomo/generated/*`. sampo-config picks up the changes
through the `file:../sampo-editor` link on the next dev server restart or
build.

The hand-maintained TypeScript interfaces for the mihomo runtime config shape
live at `src/lib/mihomo/generated/config-types.ts` and are treated as a
regular source file — not regenerated automatically.

## Releasing

Publishing is automated via `.github/workflows/publish.yml`. Trigger it by
pushing a `v*` tag that matches `package.json` version:

```bash
# 1. Bump version in package.json + update CHANGELOG.md
# 2. Commit the bump, push to main
# 3. Tag + push:
git tag v0.0.1
git push origin v0.0.1
```

The workflow refuses to publish if the tag does not match the `version`
field. One-time setup: add an npm automation token as the `NPM_TOKEN`
repository secret.

`prepublishOnly` runs `pnpm preflight` (typecheck + test + build) locally
if you ever `pnpm publish` by hand.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the quick start, the PR
checklist, and the split between what belongs in `sampo-config` vs.
`sampo-editor`. For architectural context (why CSS is shipped raw, why
sampo-editor is a peer dependency, how the manual-edit flow works, etc.)
read [CLAUDE.md](./CLAUDE.md).

## License

[MIT](./LICENSE) — © 2026 uji69i and sampo-config contributors.
