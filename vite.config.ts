import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const r = (p: string) => path.resolve(__dirname, p)

export default defineConfig(({ command, mode }) => {
  const isLibBuild = command === 'build' && mode !== 'dev' && mode !== 'site' && mode !== 'single'
  const isSiteBuild = command === 'build' && mode === 'site'
  const isSingleBuild = command === 'build' && mode === 'single'
  const isAnyBuild = command === 'build'

  return {
    root: isLibBuild ? __dirname : r('dev'),
    publicDir: false,
    // Site build is deployed to Cloudflare Pages at the project root
    // (https://sampo-config.<user>.workers.dev/); single-file runs from
    // file:// so needs relative paths.
    base: isSingleBuild ? './' : '/',
    resolve: {
      alias: {
        '@': r('src'),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(isSingleBuild ? [viteSingleFile({ removeViteModuleLoader: true })] : []),
      ...(isSiteBuild
        ? [
            {
              name: 'sampo-config:copy-sampo-editor-workers',
              closeBundle() {
                // sampo-editor's lib build emits Monaco worker files in dist/assets/.
                // When we bundle the site from the pre-built npm package, Vite does
                // not re-process those worker URL references, so the files must be
                // copied into our site output manually.
                const editorAssets = r('node_modules/sampo-editor/dist/assets')
                const siteAssets = r('dist-site/assets')
                if (!fs.existsSync(editorAssets)) return
                fs.mkdirSync(siteAssets, { recursive: true })
                for (const f of fs.readdirSync(editorAssets)) {
                  if (f.endsWith('.js')) {
                    fs.copyFileSync(path.join(editorAssets, f), path.join(siteAssets, f))
                  }
                }
              },
            },
          ]
        : []),
      ...(isLibBuild
        ? [
            dts({
              entryRoot: 'src',
              include: ['src/**/*.ts', 'src/**/*.tsx'],
              exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
              tsconfigPath: r('tsconfig.build.json'),
              outDir: 'dist',
              insertTypesEntry: true,
            }),
            {
              name: 'sampo-config:copy-styles',
              closeBundle() {
                const outDir = r('dist')
                fs.mkdirSync(outDir, { recursive: true })
                const css = r('src/styles/sampo-config.css')
                if (fs.existsSync(css)) {
                  fs.copyFileSync(css, path.join(outDir, 'styles.css'))
                }
              },
            },
          ]
        : []),
    ],
    build: isLibBuild
      ? {
          outDir: r('dist'),
          emptyOutDir: true,
          sourcemap: true,
          cssCodeSplit: false,
          copyPublicDir: false,
          lib: {
            entry: r('src/index.ts'),
            formats: ['es'],
            fileName: () => 'sampo-config.js',
          },
          rollupOptions: {
            external: [
              'react',
              'react-dom',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'react-router-dom',
              /^sampo-editor(\/.*)?$/,
              /^node:/,
            ],
            output: {
              preserveModules: false,
            },
          },
        }
      : isSiteBuild
        ? {
            outDir: r('dist-site'),
            emptyOutDir: true,
            sourcemap: false,
          }
        : isSingleBuild
          ? {
              outDir: r('dist-single'),
              emptyOutDir: true,
              sourcemap: false,
              // vite-plugin-singlefile recommended settings — inline every
              // asset into the HTML so the result runs from file://.
              assetsInlineLimit: 100_000_000,
              cssCodeSplit: false,
              reportCompressedSize: false,
              rollupOptions: {
                output: {
                  inlineDynamicImports: true,
                },
              },
            }
          : isAnyBuild
            ? { outDir: r('dev-dist'), emptyOutDir: true }
            : { outDir: r('dev-dist') },
    server: {
      port: 5173,
      open: false,
      fs: {
        allow: [path.resolve(__dirname, '..'), __dirname],
      },
    },
  }
})
