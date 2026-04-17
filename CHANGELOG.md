# Changelog

All notable changes to `sampo-config` will be documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project uses [Semantic Versioning](https://semver.org/).

## [0.0.2-alpha.1] — 2026-04-17

### Changed

- **Manual YAML edit mode** — Monaco editor is now `readOnly` by default;
  "Edit manually" button unlocks it, with explicit Apply/Cancel flow and a
  confirm dialog when form controls change state while editing. Removes the
  old debounced auto-dispatch that caused ~500ms "revert-on-typing".
- **sampo-editor installed from npm** instead of `file:../sampo-editor`.
  CI workflows and Cloudflare Pages no longer need a sibling checkout.
- Simplified all CI/CD workflows (GitHub Actions, GitLab CI).

### Added

- Cloudflare Pages deployment (`wrangler.toml`).
- `build:site`, `build:single`, `build:all` scripts.
- GitHub Pages deployment workflow (`deploy-pages.yml`).
- i18n keys for manual edit mode in `en`, `ru`, `fa` locales.

## [0.0.1-alpha.1] — 2026-04-12

First public release. Consider everything here experimental — APIs may still
shift a bit before `0.1.0`.

### Added

- **`<MihomoConfigGenerator />`** — drop-in Mihomo/Clash config generator
  with proxy link import (vmess/ss/vless/trojan/…), manual rule editor,
  rule-provider management, geo rules, service templates, demo presets,
  topology view, URL-sharing (pako + base64url), and a live Monaco-backed
  YAML preview.
- **Reducer public surface** — `mihomoReducer`, `createInitialState`,
  `type MihomoAction`, `type MihomoState`, `type MihomoProxy`,
  `type ServiceTemplate` for consumers who want to embed just the state
  machine.
- **YAML round-trip helpers** — `buildFullConfig(state, overrides?)` and
  `parseYamlToState(yaml, { formMeta })` exported from the root, driven by
  form-meta consumed from `sampo-editor/presets/mihomo`.
- **URL-sharing helpers** — `serializeStateToUrl`, `MAX_URL_LENGTH`.
- **Autonomous i18n** — `I18nProvider`, `useTranslation`, `I18nContext`,
  `LOCALES`, `LOCALE_LABEL_KEYS`, `LocaleSwitcher`, types `Locale` and
  `I18nContextValue`. Built-in locales: `en`, `ru`, `zh`, `fa`.
- **Manual YAML edit mode** in the bottom Monaco editor — `readOnly` by
  default; opt-in "Edit manually" unlocks it, with explicit
  Apply/Cancel/Confirm-on-form-drift flow (see CLAUDE.md §"Manual edit flow").
- **Utility exports** — `cn`, `getRejectPolicyClassName`, `getDataBaseUrl`.
- **Playground** (`dev/`) with router, theme switcher, URL persistence and
  localStorage snapshot.
- **Site build** — `pnpm build:site` produces a static deployable copy of
  the playground in `dist-site/`.
- **Single-file build** — `pnpm build:single` produces a self-contained
  `dist-single/index.html` that runs from `file://` (with caveats — see
  Known issues).

### Known issues / non-goals for 0.0.1

- Requires a Vite consumer (`sampo-editor`'s Monaco worker imports use the
  `?worker` suffix).
- `sampo-editor` is a peer dependency pinned to `^0.0.1`; upgrading it is
  a coordinated release.
- `react-router-dom@^7` is a peer dependency because `MihomoConfigGenerator`
  reads `useLocation().state` for the Warp handoff. Mount the generator
  inside a router.
- `I18nProvider` is REQUIRED — unlike sampo-editor, `useTranslation()`
  does not fall back to a built-in English dictionary.

### Thanks

Shaped in pair-programming sessions with Claude (Opus 4.6) — the
`contributors` field in `package.json` is not a joke.
