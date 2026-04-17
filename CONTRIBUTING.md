# Contributing to sampo-config

Thanks for reading this. `sampo-config` is the UI shell of the
Mihomo/Clash config generator — the schema, form-meta catalogue and Monaco
editor live in its sibling package [`sampo-editor`](../sampo-editor). Pull
requests, issues, translations and bug reports are all welcome.

## The two things you should read first

1. **[README.md](./README.md)** — install, usage, public API.
2. **[CLAUDE.md](./CLAUDE.md)** — canonical architectural overview. Written
   as LLM context, but it is the single best explanation of *why* the repo
   is laid out this way. Read it before touching the build, exports, the
   reducer or the Monaco wiring.

## Quick start

```bash
pnpm install
pnpm dev            # playground at http://localhost:5173
pnpm build          # library build → dist/
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm preflight      # typecheck + test + build (what CI runs)
```

`pnpm` is the canonical package manager (pinned via `packageManager` for
corepack). npm and yarn are untested.

## Where contributions are most useful

- **Translations** under [src/locales/](./src/locales/) — `ru`, `zh` and
  `fa` lag behind `en` after feature work. Missing keys should be copied
  from `en.json` rather than left as blank strings, since the generator
  requires an `I18nProvider` and renders the raw key if a translation is
  missing.
- **New mihomo config sections** as upstream mihomo adds them. This is
  split work — see CLAUDE.md §"When adding a new mihomo config section".
  Expect to open PRs against both `sampo-editor` (form-meta + schema) and
  `sampo-config` (reducer + UI panel).
- **Bug reports.** Especially round-trip bugs (YAML → state → YAML) and
  edge cases in `parseYamlToState` / `buildFullConfig`. A failing round-trip
  test case is worth its weight in gold.
- **Demo presets** under `src/components/DemoPresets.tsx` — real-world
  configs exercise generation paths our tests miss.

## Things to not do

- **Do not inline sampo-editor's form-meta or JSON Schema here.** They are
  peer-dependency territory. Editing a field definition means a PR to
  `sampo-editor`, not a patch here.
- **Do not add `monaco-editor` (or any Monaco-* package) as a direct
  dependency.** Monaco comes through `sampo-editor`. CLAUDE.md has the
  reasoning.
- **Do not introduce non-reducer state sources for config data.** Every
  config field must flow through `mihomoReducer` and `MihomoState`, or
  YAML round-tripping and URL-sharing drift apart.
- **Do not turn this into a monorepo.** One package, one `src/`, one
  `dist/`. sampo-editor stays a separate sibling repo.

## Pull request checklist

Before opening a PR:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` is green
- [ ] `pnpm build` succeeds
- [ ] Or equivalently: `pnpm preflight` passes
- [ ] If you touched exported symbols, `src/index.ts` exports them and the
      README "Public API" section is updated
- [ ] If you added i18n keys, they exist in all four locale files
      (`en`, `ru`, `zh`, `fa`) — English copy is an acceptable placeholder
- [ ] If you touched `MihomoState` shape or the YAML generator, a reducer
      test and a YAML round-trip test are updated or added

## License

By contributing, you agree that your contribution will be licensed under the
[MIT License](./LICENSE) — same as the rest of the project. As the license
itself says in capital letters: the software is provided **AS IS**, and
that applies to your contribution too.
