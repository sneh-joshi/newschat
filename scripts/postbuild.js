// scripts/postbuild.js
// Copies manifest.json and icons into dist/ after Vite build
// Also patches manifest.json to point to the correct built file paths

import { readFileSync, writeFileSync, cpSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dist = resolve(root, 'dist')

// ── 1. Copy manifest.json ────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf-8'))

// Background and content scripts are built directly to dist root by Vite
manifest.background.service_worker = 'background.js'
manifest.content_scripts[0].js = ['content.js']

// Update web accessible resources
manifest.web_accessible_resources = [
  {
    resources: ['assets/*'],
    matches: ['<all_urls>'],
  },
]

writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('✓ manifest.json copied to dist/')

// ── 2. Copy icons ────────────────────────────────────────────────────────
const iconsDir = resolve(root, 'icons')
const distIconsDir = resolve(dist, 'icons')

if (existsSync(iconsDir)) {
  mkdirSync(distIconsDir, { recursive: true })
  cpSync(iconsDir, distIconsDir, { recursive: true })
  console.log('✓ icons/ copied to dist/')
} else {
  // Create placeholder icons directory note
  mkdirSync(distIconsDir, { recursive: true })
  console.log('⚠ No icons/ folder found — add icon16.png, icon48.png, icon128.png to icons/')
}

// ── 3. Copy options.html if not already handled by Vite ─────────────────
console.log('✓ Post-build complete — dist/ is ready to load in Chrome')
console.log('')
console.log('  Next steps:')
console.log('  1. Open chrome://extensions')
console.log('  2. Enable Developer Mode')
console.log('  3. Click "Load unpacked" → select the dist/ folder')
