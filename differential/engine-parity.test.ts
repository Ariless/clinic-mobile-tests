/**
 * Differential test — on-device keyword matcher vs SUT retrieval layer.
 *
 * The symptom checker has two deterministic front halves for the same feature:
 *   - in-app  : clinic-mobile/src/ai/onDeviceRecommender.ts  (EXPO_PUBLIC_DEVICE_AI_MODE=ondevice)
 *   - server  : sut/src/services/retrieval.js + specialtyKnowledge.json
 *
 * features/ondevice-ai.feature cannot compare them: DEVICE_AI_MODE is inlined at
 * build time, so a single WDIO run only ever has one engine available. Both of its
 * modes are therefore checked against hardcoded expectations, and every expectation
 * uses a canonical symptom that both keyword lists already cover. That is why the
 * drift recorded in RAG-10 stayed invisible.
 *
 * This test runs both engines in one process and uses "the two outputs agree" as the
 * oracle, so no expected specialty has to be known in advance. Inputs are generated
 * from the symmetric difference of the two keyword lists — the region where the
 * implementations can actually disagree — so the input set cannot go stale when a
 * keyword is added on one side only.
 *
 * Scope: the deterministic halves. On the server, retrieval hands its top-K to Claude,
 * which makes the final choice (sut/src/services/aiRecommendation.js). Ranking first is
 * what the model sees, not necessarily what it answers.
 */
import { describe, test, expect } from '@jest/globals'
import {
  recommendOnDevice,
  KEYWORD_MAP,
  DEFAULT_SPECIALTY,
} from '../../clinic-mobile/src/ai/onDeviceRecommender'
import serverKnowledge from '../../sut/src/data/specialtyKnowledge.json'

type ServerEntry = { specialty: string; description: string; keywords: string[] }
type Retrieved = { specialty: string; description: string; score: number }

// retrieval.js is CommonJS and lives outside this project's rootDir — required, not imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { retrieve } = require('../../sut/src/services/retrieval') as {
  retrieve: (symptoms: string, kb: ServerEntry[], topK?: number) => Retrieved[]
}

const KB = serverKnowledge as ServerEntry[]

// ── Server-side outcome, expressed the way the SUT would answer ───────────────
// retrieval scoring is only a ranking. Two entries can tie, and on a tie the winner
// is decided by the order of specialtyKnowledge.json rather than by the input — the
// real server passes both to the model. Those inputs prove nothing about parity, so
// they are reported separately instead of being counted as agreement or drift.
type ServerOutcome =
  | { kind: 'specialty'; specialty: string }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'unknown' }

function serverOutcome(symptoms: string): ServerOutcome {
  const ranked = retrieve(symptoms, KB, 3)
  if (ranked.length === 0) return { kind: 'unknown' }
  if (ranked.length > 1 && ranked[1].score === ranked[0].score) {
    return {
      kind: 'ambiguous',
      candidates: ranked.filter(r => r.score === ranked[0].score).map(r => r.specialty),
    }
  }
  return { kind: 'specialty', specialty: ranked[0].specialty }
}

// ── Input generation from the symmetric difference of the two keyword lists ───

function deviceKeywords(): Set<string> {
  return new Set(Object.values(KEYWORD_MAP).flat().map(k => k.toLowerCase()))
}

function serverKeywords(): Set<string> {
  return new Set(KB.flatMap(e => e.keywords).map(k => k.toLowerCase()))
}

function symmetricDifference(): { serverOnly: string[]; deviceOnly: string[] } {
  const device = deviceKeywords()
  const server = serverKeywords()
  return {
    serverOnly: [...server].filter(k => !device.has(k)).sort(),
    deviceOnly: [...device].filter(k => !server.has(k)).sort(),
  }
}

const { serverOnly, deviceOnly } = symmetricDifference()
const GAP_INPUTS = [...serverOnly, ...deviceOnly]

// Identical lists would not make the engines equivalent: they disagree on matching
// strategy too. The device tests `lower.includes(kw)` against the whole string, so a
// multi-word keyword only matches as a contiguous phrase. The server tokenises first
// and asks every keyword token to appear somewhere, in any position. Any shared
// multi-word keyword with a filler word inserted separates the two.
function phrasalInputs(): string[] {
  const device = deviceKeywords()
  const shared = [...serverKeywords()].filter(k => device.has(k) && k.includes(' '))
  return shared.map(k => k.split(/\s+/).join(' the '))
}

const PHRASAL_INPUTS = phrasalInputs()

type Disagreement = { input: string; device: string; server: string }

function collectDisagreements(inputs: string[]): {
  disagreements: Disagreement[]
  ambiguous: string[]
  agreed: number
} {
  const disagreements: Disagreement[] = []
  const ambiguous: string[] = []
  let agreed = 0

  for (const input of inputs) {
    const device = recommendOnDevice(input)
    const server = serverOutcome(input)

    if (server.kind === 'ambiguous') {
      ambiguous.push(`${input} → device ${device}, server tied between ${server.candidates.join(' / ')}`)
      continue
    }
    if (server.kind === 'unknown') {
      disagreements.push({ input, device, server: 'unknown_specialty (422)' })
      continue
    }
    if (server.specialty === device) agreed++
    else disagreements.push({ input, device, server: server.specialty })
  }

  return { disagreements, ambiguous, agreed }
}

function report(d: Disagreement[]): string {
  return d.map(x => `  ${x.input.padEnd(22)} device: ${x.device.padEnd(21)} server: ${x.server}`).join('\n')
}

describe('Symptom engines — differential parity', () => {
  test('the two keyword lists are not identical — input generation has something to work with', () => {
    // Guards the generator itself: if both lists were merged into one source, the
    // gap-driven tests below would silently run on an empty input set and pass.
    expect(GAP_INPUTS.length).toBeGreaterThan(0)
  })

  // Known drift, RAG-10 (2026-08-06). Not fixed: syncing the lists is a product
  // decision (should on-device stay deliberately poorer?), not a mechanical patch.
  // test.failing keeps the suite honest — it also fails the day the drift is fixed
  // and this expectation becomes wrong.
  test.failing('every keyword known to one engine routes the same way in both', () => {
    const { disagreements, ambiguous, agreed } = collectDisagreements(GAP_INPUTS)

    // Printed unconditionally: test.failing swallows the assertion output, and the
    // list of diverging keywords is the actual finding here.
    /* eslint-disable no-console */
    console.log(
      `gap inputs: ${GAP_INPUTS.length} (server-only ${serverOnly.length}, device-only ${deviceOnly.length}) — ` +
        `agreed ${agreed}, disagreed ${disagreements.length}, ambiguous ${ambiguous.length}`,
    )
    if (disagreements.length) console.log(report(disagreements))
    if (ambiguous.length) console.log(`ambiguous (server tie, model decides):\n  ${ambiguous.join('\n  ')}`)
    /* eslint-enable no-console */

    expect(disagreements.length === 0 ? '' : `\n${report(disagreements)}`).toBe('')
  })

  test.failing('a keyword both engines know routes the same way regardless of phrasing', () => {
    // Second divergence class, independent of list drift: syncing the two lists would
    // not fix it. Only found because the first version of this file claimed the
    // symmetric difference was the only place the engines could disagree.
    const { disagreements } = collectDisagreements(PHRASAL_INPUTS)

    /* eslint-disable-next-line no-console */
    console.log(`phrasal inputs: ${PHRASAL_INPUTS.length}, disagreed ${disagreements.length}\n${report(disagreements)}`)

    expect(disagreements.length === 0 ? '' : `\n${report(disagreements)}`).toBe('')
  })

  test.failing('an input the server cannot classify does not become a confident answer on device', () => {
    // The server filters score > 0 and returns unknown_specialty; the device falls
    // back to DEFAULT_SPECIALTY, so gibberish is answered with a real referral.
    const unclassifiable = ['xkzqwmpl blargh frobnitz', 'zzzz qqqq', 'lorem ipsum dolor']

    const confident = unclassifiable.filter(input => {
      const server = serverOutcome(input)
      return server.kind === 'unknown' && recommendOnDevice(input) === DEFAULT_SPECIALTY
    })

    expect(confident).toEqual([])
  })

  test.failing('kidney pain is not routed to a paediatrician — RAG-10 substring regression', () => {
    // 'kid' is a Pediatrician keyword and both engines match substrings:
    // 'kidney'.includes('kid') on device, w.includes(kw) per word on the server.
    // Both are wrong in the same direction, which is exactly what a differential
    // oracle cannot see — hence the explicit expectation here.
    const server = serverOutcome('kidney pain')

    expect(recommendOnDevice('kidney pain')).not.toBe('Pediatrician')
    expect(server.kind === 'specialty' ? server.specialty : '').not.toBe('Pediatrician')
  })

  test('canonical symptoms agree — the coverage ondevice-ai.feature already had', () => {
    // Kept as a control. These are the inputs from features/ondevice-ai.feature and
    // the @golden-dataset examples. They pass, and passing is the point: it shows the
    // existing suite was green while the gap above was open.
    const canonical = [
      'chest pain and shortness of breath',
      'severe headache and dizziness',
      'skin rash and itching',
      'knee joint pain',
      'heart palpitations',
      'migraine and seizure',
    ]

    const { disagreements } = collectDisagreements(canonical)
    expect(disagreements.length === 0 ? '' : `\n${report(disagreements)}`).toBe('')
  })
})
