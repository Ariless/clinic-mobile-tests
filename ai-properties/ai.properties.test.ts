import fc from 'fast-check'
import { describe, test, expect } from '@jest/globals'
import * as dotenv from 'dotenv'
dotenv.config()

const BASE_URL = process.env.API_HOST_URL ?? 'http://localhost:3000/api/v1'
const AI_ENABLED = process.env.ENABLE_AI_RECOMMENDATION === 'true'

// Mirror of SUT ALLOWED_SPECIALTIES — mismatch here is an intended signal
const ALLOWED_SPECIALTIES = [
  'General Practitioner',
  'Cardiologist',
  'Neurologist',
  'Dermatologist',
  'Orthopedist',
  'Pediatrician',
]

type RecommendOk = {
  recommendedSpecialty: string
  doctors: Array<{ id: number; name: string; specialty: string }>
  reasoning?: string
}
type RecommendErr = { errorCode: string; message: string }
type RecommendResult = { status: number; body: RecommendOk | RecommendErr }

async function recommend(symptoms: string): Promise<RecommendResult> {
  const res = await fetch(`${BASE_URL}/ai/recommend-doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms }),
  })
  const body = await res.json() as RecommendOk | RecommendErr
  return { status: res.status, body }
}

function isOk(r: RecommendResult): r is { status: 200; body: RecommendOk } {
  return r.status === 200
}

// Skip all groups when AI endpoint is disabled
const conditionalDescribe = AI_ENABLED ? describe : describe.skip

// ── #33 — Property-based invariants ──────────────────────────────────────────

conditionalDescribe('AI recommendation — property-based invariants (#33)', () => {
  test(
    'any non-empty input: never 500; on 200 specialty ∈ ALLOWED_SPECIALTIES and doctors is array',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (symptoms) => {
            const result = await recommend(symptoms)
            // Invariant 1: no unexpected server error
            expect([200, 422, 503]).toContain(result.status)
            if (isOk(result)) {
              // Invariant 2: specialty is from the defined domain
              expect(ALLOWED_SPECIALTIES).toContain(result.body.recommendedSpecialty)
              // Invariant 3: doctors is always an array (never null/undefined)
              expect(Array.isArray(result.body.doctors)).toBe(true)
            }
          },
        ),
        { numRuns: 20, verbose: false },
      )
    },
    60_000,
  )
})

// ── #35 — Statistical distribution ───────────────────────────────────────────

conditionalDescribe('AI recommendation — statistical distribution (#35)', () => {
  test(
    '"chest pain and shortness of breath" → Cardiologist in ≥8 of 10 runs',
    async () => {
      const symptoms = 'chest pain and shortness of breath'
      const results = await Promise.all(
        Array.from({ length: 10 }, () => recommend(symptoms)),
      )
      const cardiologistCount = results.filter(
        r => isOk(r) && r.body.recommendedSpecialty === 'Cardiologist',
      ).length

      // ≥8/10 threshold: accepts occasional model variance, rejects systematic drift
      expect(cardiologistCount).toBeGreaterThanOrEqual(8)
    },
    30_000,
  )
})

// ── #36 — Hallucination detection ────────────────────────────────────────────

conditionalDescribe('AI recommendation — hallucination detection (#36)', () => {
  test('recommended specialty exists in the DB — doctors[] is non-empty', async () => {
    const result = await recommend('severe headache and dizziness')
    if (!isOk(result)) return // UNKNOWN_SPECIALTY or unavailable — not a hallucination failure

    // If the specialty is real it must have doctors. An empty doctors[] with a non-null
    // recommendedSpecialty would mean the AI invented a specialty that has no practitioners.
    expect(result.body.doctors.length).toBeGreaterThan(0)
  })

  test('every doctor returned matches the recommended specialty', async () => {
    const result = await recommend('skin rash and itching')
    if (!isOk(result)) return

    const { recommendedSpecialty, doctors } = result.body
    for (const doctor of doctors) {
      // If any doctor has a different specialty, the filter logic is broken
      // or the AI hallucinated a specialty that was then ignored by the DB query
      expect(doctor.specialty).toBe(recommendedSpecialty)
    }
  })
})

// ── #37 — Bounded non-determinism ────────────────────────────────────────────

conditionalDescribe('AI recommendation — bounded non-determinism (#37)', () => {
  const SYMPTOMS = 'chest pain and shortness of breath'

  test('p95 response time < 3000ms across 10 sequential runs', async () => {
    const timings: number[] = []
    for (let i = 0; i < 10; i++) {
      const start = Date.now()
      await recommend(SYMPTOMS)
      timings.push(Date.now() - start)
    }
    timings.sort((a, b) => a - b)
    // p95: index at 95th percentile of sorted array
    const p95 = timings[Math.floor(timings.length * 0.95)]
    expect(p95).toBeLessThan(3000)
  }, 60_000)

  test('response body size < 2KB — guards against runaway generation', async () => {
    const result = await recommend(SYMPTOMS)
    if (!isOk(result)) return

    const sizeBytes = Buffer.byteLength(JSON.stringify(result.body), 'utf8')
    // 2KB cap: a 1-sentence reasoning + specialty + 3 doctor objects ≈ 400–600 bytes.
    // Exceeding 2KB indicates the model generated verbose prose instead of the expected format.
    expect(sizeBytes).toBeLessThan(2048)
  })

  test('reasoning contains at least one keyword from the symptom input', async () => {
    const result = await recommend(SYMPTOMS)
    if (!isOk(result) || !result.body.reasoning) return

    const keywords = ['chest', 'pain', 'breath', 'cardiac', 'heart', 'pulmonary']
    const reasoning = result.body.reasoning.toLowerCase()
    const containsKeyword = keywords.some(k => reasoning.includes(k))

    // Relevance check: reasoning must reference the complaint, not be generic boilerplate.
    // A reasoning of "A specialist is recommended based on your symptoms." fails this test.
    expect(containsKeyword).toBe(true)
  })

  test('same symptom → same specialty across 3 independent runs — cross-session stability', async () => {
    const runs = await Promise.all(
      Array.from({ length: 3 }, () => recommend(SYMPTOMS)),
    )
    const specialties = runs.filter(isOk).map(r => r.body.recommendedSpecialty)
    if (specialties.length < 2) return // can't compare if most runs failed

    // All successful runs should agree on the specialty for a clear-cut symptom set
    const unique = new Set(specialties)
    expect(unique.size).toBe(1)
  }, 30_000)
})
