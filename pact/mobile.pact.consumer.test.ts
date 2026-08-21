import path from 'path'
import { PactV3, MatchersV3 } from '@pact-foundation/pact'
import { describe, test, expect } from '@jest/globals'

const { like, integer, eachLike } = MatchersV3

const provider = new PactV3({
  consumer: 'clinic-mobile',
  provider: 'clinic-booking-api',
  logLevel: 'warn',
  dir: path.resolve(__dirname, '../pacts'),
})

const AUTH_HEADER = {
  Authorization: like('Bearer eyJhbGciOiJIUzI1NiJ9.test.signature'),
  'Content-Type': 'application/json',
}

describe('clinic-mobile → clinic-booking-api Pact consumer', () => {

  // ── Auth ──────────────────────────────────────────────────────────────────

  test('POST /auth/login — 200: response contains token field and user.role', async () => {
    // MOB-01: mobile reads body.token to store JWT.
    // If the API ever renames this to accessToken, login silently returns undefined
    // and all authenticated requests fail with 401 — with no clear error in the app.
    // Contrast: Playwright MCP can discover the current field name in a live session
    // but cannot guard against future renaming. This test does. See: ../tests/docs/mcp-demo.md
    await provider
      .uponReceiving('a login request from the mobile app')
      .withRequest({
        method: 'POST',
        path: '/api/v1/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: like('patient@example.com'),
          password: like('password123'),
        },
      })
      .willRespondWith({
        status: 200,
        body: {
          token: like('eyJhbGciOiJIUzI1NiJ9.test.signature'),
          user: {
            name: like('Test Patient'),
            role: like('patient'),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'patient@example.com', password: 'password123' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json() as Record<string, unknown>

        // the critical assertion — mobile reads body.token, not body.accessToken
        expect(typeof body.token).toBe('string')
        expect(body).not.toHaveProperty('accessToken')

        const user = body.user as Record<string, unknown>
        expect(typeof user.role).toBe('string')
        expect(typeof user.name).toBe('string')
      })
  })

  test('POST /auth/login — 401: invalid credentials return error shape', async () => {
    await provider
      .uponReceiving('a login request with wrong credentials from the mobile app')
      .withRequest({
        method: 'POST',
        path: '/api/v1/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: like('patient@example.com'),
          password: like('wrong-password'),
        },
      })
      .willRespondWith({
        status: 401,
        body: {
          errorCode: like('AUTH_INVALID'),
          message: like('Invalid credentials'),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'patient@example.com', password: 'wrong-password' }),
        })
        expect(res.status).toBe(401)
        const body = await res.json() as Record<string, unknown>
        expect(typeof body.errorCode).toBe('string')
      })
  })

  // ── Slots ─────────────────────────────────────────────────────────────────

  test('GET /doctors/:id/slots — 200: returns array with isAvailable boolean field', async () => {
    // Mobile filters slots by isAvailable. If the field is renamed or removed,
    // the filter returns [] and patients see "no available slots" incorrectly.
    await provider
      .uponReceiving('a slots request from the mobile app')
      .withRequest({
        method: 'GET',
        path: '/api/v1/doctors/1/slots',
        headers: { Authorization: like('Bearer token') },
      })
      .willRespondWith({
        status: 200,
        body: eachLike({
          id: integer(1),
          startTime: like('2026-05-21T09:00:00.000Z'),
          isAvailable: like(true),
        }),
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/doctors/1/slots`, {
          headers: { Authorization: 'Bearer mobile-test-token' },
        })
        expect(res.status).toBe(200)
        const body = await res.json() as Record<string, unknown>[]
        expect(Array.isArray(body)).toBe(true)
        expect(typeof body[0].isAvailable).toBe('boolean')
        expect(typeof body[0].startTime).toBe('string')
      })
  })

  // ── Appointments ──────────────────────────────────────────────────────────

  test('POST /appointments — 201: booking returns id and pending status', async () => {
    await provider
      .uponReceiving('a booking request from the mobile app')
      .withRequest({
        method: 'POST',
        path: '/api/v1/appointments',
        headers: AUTH_HEADER,
        body: { slotId: integer(1) },
      })
      .willRespondWith({
        status: 201,
        body: {
          id: integer(1),
          status: like('pending'),
          slotId: integer(1),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/appointments`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer mobile-test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slotId: 1 }),
        })
        expect(res.status).toBe(201)
        const body = await res.json() as Record<string, unknown>
        expect(typeof body.id).toBe('number')
        expect(typeof body.status).toBe('string')
      })
  })

  test('GET /appointments/my — 200: returns paginated data array', async () => {
    // Mobile ApiClient handles both [] and { data: [] } shapes.
    // This test pins the paginated shape — if the API switches to direct array,
    // the mobile client still works (due to the Array.isArray guard), but the
    // provider test would fail, flagging the contract change.
    await provider
      .uponReceiving('a my-appointments request from the mobile app')
      .withRequest({
        method: 'GET',
        path: '/api/v1/appointments/my',
        query: { limit: '50' },
        headers: { Authorization: like('Bearer token') },
      })
      .willRespondWith({
        status: 200,
        body: {
          data: eachLike({
            id: integer(1),
            status: like('pending'),
            slotId: integer(1),
          }),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/appointments/my?limit=50`, {
          headers: { Authorization: 'Bearer mobile-test-token' },
        })
        expect(res.status).toBe(200)
        const body = await res.json() as Record<string, unknown>
        const data = Array.isArray(body) ? body : (body.data as unknown[])
        expect(Array.isArray(data)).toBe(true)
        const first = data[0] as Record<string, unknown>
        expect(typeof first.id).toBe('number')
        expect(typeof first.status).toBe('string')
      })
  })

  test('PATCH /appointments/:id/cancel — 200: cancellation is accepted', async () => {
    await provider
      .uponReceiving('a cancel request from the mobile app')
      .withRequest({
        method: 'PATCH',
        path: '/api/v1/appointments/1/cancel',
        headers: AUTH_HEADER,
        body: {},
      })
      .willRespondWith({
        status: 200,
        body: like({}),
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/appointments/1/cancel`, {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer mobile-test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })
        expect(res.status).toBe(200)
      })
  })
})
