/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/** The data team's files (HANDOVER.md), never edited by hand and never copied into git twice. */
const DATA_DIR = fileURLToPath(new URL('./data/', import.meta.url))
const dataFiles = () => readdirSync(DATA_DIR).filter((name) => /\.(json|geojson)$/.test(name))

/**
 * Serves data/*.json and data/*.geojson at data/basin/ beside the app: from data/ itself while developing,
 * and as files in dist/data/basin/ in the build (so `npm run build`, and the GitHub Pages workflow, ship them).
 */
function basinData(): Plugin {
  return {
    name: 'basin-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /\/data\/basin\/([\w.-]+)$/.exec((req.url ?? '').split('?')[0])
        if (!match || !dataFiles().includes(match[1])) return next()
        res.setHeader('Content-Type', 'application/json')
        res.end(readFileSync(DATA_DIR + match[1]))
      })
    },
    generateBundle() {
      for (const name of dataFiles()) {
        this.emitFile({ type: 'asset', fileName: `data/basin/${name}`, source: readFileSync(DATA_DIR + name) })
      }
    },
  }
}

/**
 * A short fingerprint of every data file the site ships: the demo field, the basin's files and the parcels.
 * The app adds it to each data file's address (src/data/fresh.ts). The host's cache keeps a file for ten minutes
 * after a new version is published; with the fingerprint, changed data has a new address the cache has never seen,
 * and unchanged data keeps its address.
 */
function dataStamp(): string {
  const hash = createHash('sha256')
  const add = (dir: string, keep: (name: string) => boolean) => {
    const files = readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter((entry) => entry.isFile() && keep(entry.name))
      .map((entry) => `${entry.parentPath.replace(/\\/g, '/')}/${entry.name}`)
      // Sorted, so the same files give the same fingerprint on any machine.
      .sort()
    for (const file of files) {
      hash.update(file.slice(dir.replace(/\\/g, '/').length))
      // Line endings differ between checkouts (Windows, the publishing machine); the fingerprint must not.
      hash.update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
    }
  }
  const json = (name: string) => /\.(json|geojson)$/.test(name)
  add(DATA_DIR, json)
  add(fileURLToPath(new URL('./public/data/', import.meta.url)), json)
  add(fileURLToPath(new URL('./public/parcels/', import.meta.url)), json)
  return hash.digest('hex').slice(0, 10)
}

// base "./" so the built site works from any folder on any static host.
export default defineConfig(({ command, mode }) => ({
  base: './',
  // Only a real build is stamped: while developing and in tests the files are read fresh anyway.
  define: { __DATA_STAMP__: JSON.stringify(command === 'build' && mode !== 'test' ? dataStamp() : '') },
  plugins: [react(), tailwindcss(), basinData()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    // Only this checkout's tests: helper tools keep spare copies of the repo under .claude/.
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['.claude/**', 'node_modules/**', 'dist/**'],
  },
}))
