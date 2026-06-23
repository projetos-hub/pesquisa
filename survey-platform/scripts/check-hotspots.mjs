import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const MAX_LINES = Number(process.env.HOTSPOT_MAX_LINES ?? 300)
const EXTENSIONS = new Set(['.ts', '.tsx'])
const IGNORED_DIRS = new Set([
  '.next',
  'node_modules',
  'coverage',
  'playwright-report',
  'test-results',
  '__tests__',
])

function extensionOf(file) {
  const idx = file.lastIndexOf('.')
  return idx === -1 ? '' : file.slice(idx)
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.has(entry)) walk(fullPath, files)
      continue
    }

    if (EXTENSIONS.has(extensionOf(entry))) {
      files.push(fullPath)
    }
  }

  return files
}

const hotspots = walk(ROOT)
  .map(file => {
    const text = readFileSync(file, 'utf8')
    const lines = text.split(/\r?\n/).length
    return { file: relative(ROOT, file), lines }
  })
  .filter(item => item.lines > MAX_LINES)
  .sort((a, b) => b.lines - a.lines)

console.log(`Hotspot limit: ${MAX_LINES} lines`)

if (hotspots.length === 0) {
  console.log('No hotspots found.')
} else {
  for (const item of hotspots) {
    console.log(`${String(item.lines).padStart(5)}  ${item.file}`)
  }
}
