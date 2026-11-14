/// <reference types="vitest/config" />
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

// base "./" so the built site works from any folder on any static host.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), basinData()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
})
