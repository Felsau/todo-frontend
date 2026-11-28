// Run from todo-frontend: node brand/render.mjs
// Writes og-image.png, icon-*.png, apple-touch-icon.png and favicon.ico into public/.
import { pathToFileURL, fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
const { chromium } = await import(new URL('../../tools/shot/node_modules/playwright/index.mjs', import.meta.url).href)
const here = new URL('.', import.meta.url)
const out = (n) => fileURLToPath(new URL('../public/' + n, here))
const page0 = (n) => new URL(n, here).href
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
async function shot(url, w, h, file, transparent) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(200)
  await page.screenshot({ path: out(file), omitBackground: transparent })
}
await shot(page0('og-image.html'), 1200, 630, 'og-image.png', false)
const ic = page0('icon.html')
await shot(ic + '?size=192', 192, 192, 'icon-192.png', true)
await shot(ic + '?size=512', 512, 512, 'icon-512.png', true)
await shot(ic + '?size=512&maskable=1', 512, 512, 'icon-maskable-512.png', false)
await shot(ic + '?size=180&opaque=1', 180, 180, 'apple-touch-icon.png', false)
await shot(ic + '?size=32', 32, 32, 'favicon-32.tmp.png', true)
const { readFileSync, unlinkSync } = await import('node:fs')
const png = readFileSync(out('favicon-32.tmp.png'))
const hdr = Buffer.alloc(22)
hdr.writeUInt16LE(0, 0); hdr.writeUInt16LE(1, 2); hdr.writeUInt16LE(1, 4)
hdr[6] = 32; hdr[7] = 32; hdr[8] = 0; hdr[9] = 0
hdr.writeUInt16LE(1, 10); hdr.writeUInt16LE(32, 12)
hdr.writeUInt32LE(png.length, 14); hdr.writeUInt32LE(22, 18)
writeFileSync(out('favicon.ico'), Buffer.concat([hdr, png]))
unlinkSync(out('favicon-32.tmp.png'))
await browser.close()
