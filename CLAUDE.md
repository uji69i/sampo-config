# sampo-config — context for LLM assistants

Embeddable Mihomo/Clash config generator UI, published to npm as
`sampo-config`. Target consumers: React 19 + Vite + Tailwind v4 apps.

**This package is a UI shell.** All mihomo-specific *catalogue* knowledge
(field names, JSON Schema, Monaco editor) lives in [`sampo-editor`](../sampo-editor)
and is consumed as a **peer dependency** through the `sampo-editor/presets/mihomo`
subpath. Do not duplicate form-meta or schema data here — edit it once in
`sampo-editor/form-meta/` and re-consume.

## Commands

```bash
pnpm install
pnpm dev           # dev/ playground on :5173
pnpm build         # library build (lib mode) → dist/
pnpm build:site    # playground as deployable static site → dist-site/ (base: /sampo-config/)
pnpm build:single  # playground as a single inlined HTML file → dist-single/index.html
pnpm build:all     # runs build + build:site + build:single in sequence
pnpm typecheck     # tsc --noEmit
pnpm test          # vitest run
pnpm test:watch    # vitest --watch
pnpm preview       # vite preview --mode dev
pnpm preview:site  # serve dist-site/ for local verification
pnpm preflight     # typecheck + test + build (used by CI and prepublishOnly)
```

`pnpm` is the canonical package manager (pinned via `packageManager` for
corepack). npm and yarn are untested.

## Layout (flat, single Vite project — not a monorepo)

```
src/
  index.ts                         # public API contract — every exported symbol
  MihomoConfigGenerator.tsx        # the main component consumers render
  mihomoReducer.ts                 # central reducer + createInitialState
  components/
    YamlOutput.tsx                 # Monaco editor wrapper + manual-edit flow
    DemoPresets.tsx                # bundled demo configs
    ImportConfigDialog.tsx         # paste/parse YAML import
    ProxyLinksInput.tsx            # vmess://… / ss://… / vless://… import
    WarpImport.tsx                 # Cloudflare Warp handoff via router state
    AmneziaWgImport.tsx            # AmneziaWG config import
    Base64Import.tsx               # subscription-link import (b64 wrapped)
    Subscriptions.tsx              # subscription-URL list
    ManualRules.tsx, GeoRules.tsx, RuleOrder.tsx, RuleProviders.tsx,
    ServiceTemplates.tsx, ConfigTopology.tsx
    config-sections/               # one panel per mihomo config section
      GeneralSettingsPanel.tsx, DnsSettingsPanel.tsx, TlsSettingsPanel.tsx,
      ExternalSettingsPanel.tsx, GeoSettingsPanel.tsx, SnifferSettingsPanel.tsx,
      Listeners.tsx, TunnelsPanel.tsx, SubRulesPanel.tsx,
      ProxyGroups.tsx, ProxyGroupCard.tsx,
      ManualProxiesPanel.tsx, ManualProxiesSelect.tsx,
      AdvancedRulesPanel.tsx
    ui/                            # shadcn primitives — owned inside the lib
      button.tsx, dialog.tsx, select.tsx, tabs.tsx, tooltip.tsx,
      form-field-by-meta.tsx       # renders a sampo-editor form-meta field
      locale-switcher.tsx          # exported
      ...
  hooks/
    useConfigStatus.ts             # status/statusText derivation
    useUrlImport.ts                # ?state=… URL sharing (pako + base64url)
  i18n/
    I18nContext.ts                 # context + LOCALES + Locale type
    context.tsx                    # I18nProvider (REQUIRED by consumers)
    useTranslation.ts              # locale-aware t()
  locales/
    en.json, ru.json, zh.json, fa.json
  lib/
    utils.ts                       # cn() + getRejectPolicyClassName()
    dataBaseUrl.ts                 # getDataBaseUrl() — geoip/geosite CDN base
    amnezia-config.ts
    mihomo/
      types.ts                     # MihomoState, MihomoProxy, ServiceTemplate, …
      constants.ts                 # DEFAULT_PORTS, DNS defaults, etc.
      state-helpers.ts             # pure helpers over MihomoState
      state-serializer.ts          # serializeStateToUrl / parseStateFromUrl
      yaml-gen.ts                  # buildFullConfig(state, overrides) → YAML string
      yaml-import.ts               # parseYamlToState(yaml, opts) → { state, errors }
      parser.ts                    # vmess/ss/vless/trojan/… link parser
      parse-warp.ts, parse-amnezia-wg.ts, decode-subscription.ts
      validators.ts                # per-field validators used by forms
      form-meta-types.ts           # TS shape of sampo-editor's form-meta
      form-meta-utils.ts           # pure helpers (find field, stateKey lookup, …)
      geo-presets.ts, topology-data.ts
      generated/
        config-types.ts            # hand-written TS shape of the mihomo runtime config
  styles/
    sampo-config.css               # @theme + base layer (raw Tailwind source)
  __tests__/                       # top-level integration tests
    full-config.test.ts
    mihomoReducer.test.ts
dev/                               # playground (NOT shipped to npm — source of build:site and build:single)
  index.html, main.tsx, dev.css
vite.config.ts                     # four modes: dev, lib (default), site, single — detected via command+mode
vitest.config.ts                   # node env, @/* alias, no globals
tsconfig.json                      # noEmit, @/* → src/*, includes src+dev+configs
tsconfig.build.json                # used by vite-plugin-dts (src only, excludes tests)
LICENSE                            # MIT
CHANGELOG.md                       # manual; Keep a Changelog-ish format
CONTRIBUTING.md                    # points at CLAUDE.md for architectural context
```

Path alias: `@/*` → `src/*` (set in both `tsconfig.json` and `vite.config.ts`).

## Public API boundary

Single entry point: `src/index.ts`. Anything not re-exported there is private.
When adding a new exported symbol, update README.md "Public API" section too.

Published `package.json` exports:
- `.` → `dist/sampo-config.js` + `dist/index.d.ts` (rolled by `vite-plugin-dts`)
- `./styles.css` → `dist/styles.css` (raw Tailwind `@theme` tokens; consumer runs through Tailwind)

## Architectural decisions (do not silently revert)

1. **`sampo-editor` is a peer dependency, not bundled.** Consumers install
   both packages; sampo-config imports Monaco components and the mihomo
   schema/form-meta from `sampo-editor/presets/mihomo`. This keeps mihomo
   catalogue data in ONE place (sampo-editor) and avoids version skew.
2. **`react-router-dom` is a peer dependency.** `MihomoConfigGenerator`
   reads `useLocation().state` for the Warp proxies handoff, so the component
   must be mounted inside a router. Listed in rollup `external`.
3. **CSS is shipped raw, not pre-built through Tailwind.** Consumer's
   Tailwind v4 scans `node_modules/sampo-config/dist` via `@source` and
   generates utility classes. `src/styles/sampo-config.css` is copied
   byte-for-byte to `dist/styles.css` by the closeBundle plugin in
   `vite.config.ts`.
4. **`I18nProvider` is REQUIRED.** Unlike sampo-editor (which falls back to
   built-in English), `useTranslation()` here throws if no provider is
   mounted — the generator has ~1300 translation keys and a missing provider
   would render as a wall of i18n key strings. Consumers must wrap
   `<MihomoConfigGenerator />` in `<I18nProvider>`.
5. **shadcn components are owned, not imported.** `src/components/ui/*` is
   intentionally duplicated with sampo-editor's copy; we control our variants
   independently.
6. **Reducer is the single source of truth.** `mihomoReducer` + `MihomoState`
   own all config state. Forms dispatch actions; `buildFullConfig(state)`
   derives the YAML. The Monaco editor in `YamlOutput.tsx` is read-only by
   default and enters a manual-edit mode on explicit opt-in (see "Manual
   edit flow" below).
7. **Form-meta is consumed, not maintained here.** All
   `from 'sampo-editor/presets/mihomo'` imports are read-only. Editing a
   field definition means editing `sampo-editor/form-meta/` and rebuilding
   sampo-editor.

## Things to never do

- **Do not inline mihomo form-meta or the JSON Schema into this repo.**
  They are sampo-editor's concern. If you need a new field, add it to
  `sampo-editor/form-meta/<section>.json`, rebuild sampo-editor, then
  consume the new key here.
- **Do not bundle Monaco into sampo-config.** Any `monaco-editor` import
  goes through `sampo-editor`. Adding `monaco-editor` to
  `sampo-config/package.json` is a red flag.
- **Do not add `sampo-editor` to `dependencies`.** It stays in
  `peerDependencies` (so consumers share a single Monaco bundle) and in
  `devDependencies` as a `file:` link for local development.
- **Do not hand-edit `dist/`.** It is regenerated by `pnpm build`.
- **Do not break the public API.** Renaming or removing anything exported
  from `src/index.ts` is a breaking change — bump major, update README.
- **Do not introduce non-reducer state sources for config data.** All
  config-shaped state lives in `MihomoState` and flows through the reducer;
  otherwise `buildFullConfig` / `parseYamlToState` / `serializeStateToUrl`
  drift out of sync.
- **Do not pre-build the `@theme` CSS through Tailwind.** Design tokens
  must reach the consumer as raw `@theme` declarations.
- **Do not remove the `react-router-dom` external + peer declaration.** The
  generator depends on router context; bundling it would cause duplicate
  router instances in the consumer.

## Manual edit flow (YamlOutput.tsx)

The YAML editor at the bottom of the generator has two modes:

1. **State-driven (default).** Editor shows `buildFullConfig(state)` and is
   `readOnly`. Any form control dispatch re-renders the editor.
2. **Manual edit.** Triggered by the "Edit manually" button:
   - Seeds `localYaml` from the current `generatedYaml` (baseline).
   - Unlocks Monaco.
   - Form-driven state changes DO NOT overwrite `localYaml`. Instead, when
     `generatedYaml` drifts from the baseline with dirty local edits, a
     confirm dialog offers "Discard manual edits" (re-sync) vs "Keep
     editing" (local overrides, Apply will clobber form changes).
   - "Apply" runs `parseYamlToState(localYaml)` → dispatches `IMPORT_YAML`
     and returns to state-driven mode.
   - "Cancel" / "Reset" drops `localYaml` and returns to state-driven mode.

The old debounced auto-dispatch on every keystroke was removed — it caused
~500ms "revert-on-typing" (enter / comments / blank lines were lost the
moment Monaco re-rendered from regenerated YAML).

## When adding a new exported component or hook

1. Implement in `src/...`, use `@/` imports.
2. Re-export from `src/index.ts` with its prop/return types.
3. Add new i18n keys to **all four** locale files (`en.json`, `ru.json`,
   `zh.json`, `fa.json`). Partial translation is fine — missing keys must
   exist as the English copy rather than as a blank string.
4. Add a short usage example to `README.md` "Public API" / snippets.
5. Run `pnpm preflight` and verify `dist/index.d.ts` contains the new export.

## When adding a new mihomo config section

This is split work — sampo-editor owns the catalogue, sampo-config owns
the UI panel.

1. In `sampo-editor`: add `form-meta/<section>.json` and
   `form-meta/locales/<section>/{en,ru,zh,fa}.json`, run
   `pnpm build:presets`, commit, rebuild.
2. In `sampo-config`:
   - Add the section's shape to `MihomoState` (`src/lib/mihomo/types.ts`).
   - Add reducer actions + initial state in `mihomoReducer.ts`.
   - Add a panel under `src/components/config-sections/<Section>Panel.tsx`
     importing `mihomoFormMeta as formMeta from 'sampo-editor/presets/mihomo'`.
   - Wire it into `MihomoConfigGenerator.tsx` (section ordering).
   - Extend `buildFullConfig` (`yaml-gen.ts`) and `parseYamlToState`
     (`yaml-import.ts`) so round-tripping holds.
   - Add a reducer test (`src/__tests__/mihomoReducer.test.ts`) and a
     round-trip test (`src/lib/mihomo/__tests__/yaml-*.test.ts`).

## Build modes

`vite.config.ts` branches on `command + mode`:

- `isLibBuild = command === 'build' && mode !== 'dev' && mode !== 'site' && mode !== 'single'` — the published library. Emits `dist/sampo-config.js` (ESM), `dist/index.d.ts` (rolled via `vite-plugin-dts`), `dist/styles.css` (raw Tailwind copied in closeBundle). `sampo-editor` and `react-router-dom` are rollup `external`.
- `isSiteBuild = mode === 'site'` — playground as a deployable static site at `dist-site/` with `base: '/'` (Cloudflare Pages root). Also used by GitHub/GitLab Pages.
- `isSingleBuild = mode === 'single'` — playground as one self-contained HTML file via `vite-plugin-singlefile` + `inlineDynamicImports + assetsInlineLimit: 100_000_000`. Output at `dist-single/index.html`. Runs from `file://`.
- Otherwise (`pnpm dev`, `pnpm preview`, etc.) — dev server rooted at `dev/`, emits to `dev-dist/` on ad-hoc build.

Single-file caveat: Monaco workers arrive pre-compiled inside `sampo-editor/dist`, so workers are inlined as blob URLs by sampo-editor's build — we don't run sampo-editor's `inlineMonacoWorkers` plugin here. If you ever see `*.worker.js` sidecars reappear in `dist-single/`, something in the upstream sampo-editor dist changed and the single-file build stopped being truly standalone. Fix there, not here.

## Gotchas

- **`sampo-editor` is installed from npm** (same version in both
  `peerDependencies` and `devDependencies`). For local development with a
  sibling checkout, use `pnpm link ../sampo-editor` to replace the npm
  copy with a symlink to your local build — no `package.json` change
  required. Run `pnpm install` to revert to the npm version.
- **`peerDependencies.sampo-editor` is `^0.0.1-alpha.1`.** Keep this in lockstep
  with the sampo-editor version we are developing against. Bump both when
  sampo-editor publishes a breaking change.
- **`vite-plugin-dts` uses `tsconfig.build.json` (stricter, src-only)** —
  not the main `tsconfig.json`. Keep them in sync re compiler options.
- **Monaco RTL rendering.** sampo-editor's `ConfigEditor` forces
  `dir="ltr"` internally; if you ever wrap the editor in an extra RTL
  container here, do NOT strip that attribute — Monaco will render a blank
  content area with a populated minimap. The fa locale already exercises
  this path.
- **URL-sharing size limit.** `serializeStateToUrl` uses `pako` + base64url.
  The generator warns when the URL exceeds `MAX_URL_LENGTH` (≈8000) —
  consumers with aggressive state (huge manual-rule lists, long
  subscription URLs) will hit this. Do not silently truncate.
- **Warp handoff via router state.** `useUrlImport` and
  `MihomoConfigGenerator` call `useLocation()` — the component is hard-wired
  to the router context. Documented as a peer dependency, tested in the
  `dev/` playground by mounting inside `<BrowserRouter>`.
- **Status derivation in `useConfigStatus`.** Errors surfaced by the status
  badge and the inline `<span className="text-destructive">` in
  `YamlOutput.tsx` come from `parseYamlToState`'s `errors[]`. There is no
  separate "problems" pane — the Monaco diagnostics are provided by
  `monaco-yaml` via the schema registered in `YamlOutput` (`setupMonacoYaml`).
- **`@/*` alias works only under Vite/Vitest.** Published code is rolled
  and contains no aliases; tsc resolves the alias via `baseUrl` + `paths`
  at typecheck time. Don't try to import `@/...` from consumer code.
- **Sourcemaps are published (`sourcemap: true`).** This inflates `dist/`
  considerably; keep it for debuggability.

## Test suite (what exists and why)

Tests are unit-scoped and pure Node (no happy-dom / @testing-library), run
via `pnpm test`:

- **`src/__tests__/mihomoReducer.test.ts`** — 37 cases covering every action
  that mutates `MihomoState`. Single most important suite in the repo;
  reducer regressions break every downstream feature.
- **`src/__tests__/full-config.test.ts`** — round-trips a full default
  state through `buildFullConfig` and `parseYamlToState`; guards that
  YAML generation and parsing stay symmetrical.
- **`src/lib/mihomo/__tests__/yaml-gen.test.ts`** — targeted YAML
  generation cases (proxy chains, group references, rule ordering).
- **`src/lib/mihomo/__tests__/yaml-import.test.ts`** — import parser
  coverage (foreign keys, comments, ordering preservation).
- **`src/lib/mihomo/__tests__/validators.test.ts`** — 47 validator cases
  covering ports, IPs, domains, regex rules, etc.
- **`src/lib/mihomo/__tests__/state-helpers.test.ts`** — pure helper
  semantics (reject-policy inheritance, group membership derivation, etc.).
- **`src/lib/mihomo/__tests__/state-serializer.test.ts`** — URL
  share/unshare round-trip; guards the base64url + pako envelope.
- **`src/lib/mihomo/__tests__/schema-validate.test.ts`** — validates a
  generated YAML against the mihomo JSON Schema from
  `sampo-editor/presets/mihomo`, catching cross-package regressions.

Keep new tests in this spirit: load-bearing invariants only, no DOM
environment. If a test needs a real browser, it belongs in a future
Playwright suite, not here.
