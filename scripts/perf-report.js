#!/usr/bin/env node
// Reads allure-results/ and generates perf-summary.json from @perf scenario data.
// Exits 1 if any budget is exceeded (for use as a CI gate step).
//
// Usage:
//   node scripts/perf-report.js
//   node scripts/perf-report.js --results allure-results --out perf-summary.json

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const resultsIdx = process.argv.indexOf('--results')
const outIdx = process.argv.indexOf('--out')
const RESULTS_DIR = resultsIdx !== -1 ? process.argv[resultsIdx + 1] : path.join(ROOT, 'allure-results')
const OUT_PATH = outIdx !== -1 ? process.argv[outIdx + 1] : path.join(ROOT, 'perf-summary.json')

// Map scenario name → attachment key + budget
const BUDGET_MAP = {
  'App cold start completes within 2000ms': {
    label: 'Cold start',
    attachKey: 'coldStartMs',
    threshold: 2000,
    unit: 'ms',
  },
  'Scrolling the doctors list produces less than 5% janky frames': {
    label: 'Jank rate',
    attachKey: 'jankRatePercent',
    threshold: 5,
    unit: '%',
  },
}

function readResultJsons(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && !f.startsWith('categories') && !f.startsWith('environment') && !f.startsWith('executor'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) } catch { return null }
    })
    .filter(r => r && typeof r.name === 'string' && typeof r.status === 'string')
}

function readAttachment(dir, source) {
  const p = path.join(dir, source)
  if (!fs.existsSync(p)) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null }
}

if (!fs.existsSync(RESULTS_DIR)) {
  console.warn(`[perf-report] allure-results not found at ${RESULTS_DIR} — no tests ran yet.`)
  const empty = { generatedAt: new Date().toISOString(), metrics: [], allPassed: true, note: 'no results' }
  fs.writeFileSync(OUT_PATH, JSON.stringify(empty, null, 2))
  process.exit(0)
}

const results = readResultJsons(RESULTS_DIR)
const metrics = []
let allPassed = true

for (const result of results) {
  const budget = BUDGET_MAP[result.name]
  if (!budget) continue

  let value = null
  const attachment = (result.attachments ?? []).find(a => a.type === 'application/json')
  if (attachment) {
    const data = readAttachment(RESULTS_DIR, attachment.source)
    if (data) value = data[budget.attachKey] ?? null
  }

  const passed = result.status === 'passed'
  if (!passed) allPassed = false

  metrics.push({
    label: budget.label,
    scenario: result.name,
    status: result.status,
    value: value !== null ? parseFloat(String(value)) : null,
    threshold: budget.threshold,
    unit: budget.unit,
  })
}

const summary = {
  generatedAt: new Date().toISOString(),
  allPassed,
  metrics,
}

fs.writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2))

console.log(`[perf-report] Generated: ${OUT_PATH}`)
if (metrics.length === 0) {
  console.warn('[perf-report] No @perf scenarios found in results — did npm run test:perf run?')
}

for (const m of metrics) {
  const icon = m.status === 'passed' ? '✅' : '❌'
  const valStr = m.value !== null ? `${m.value}${m.unit}` : '(no data)'
  console.log(`  ${icon} ${m.label}: ${valStr} (budget: < ${m.threshold}${m.unit})`)
}

if (!allPassed) {
  console.error('[perf-report] One or more performance budgets exceeded.')
  process.exit(1)
}
