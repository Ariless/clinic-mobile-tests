---
name: api-client
description: Adding API calls and methods to support/apiClient.ts in the mobile test suite. Use when: adding API calls in step definitions; adding a new method to support/apiClient.ts.
triggers:
  - adding API calls in step definitions
  - adding a new method to support/apiClient.ts
  - any task that touches support/apiClient.ts
---

# Skill: API Client (mobile)

## WHEN to load this skill

Load when the task involves:
- Adding API calls in step definitions
- Adding a new method to `support/apiClient.ts`
- Any task that touches `support/apiClient.ts`

---

## WHY

All HTTP calls go through `support/apiClient.ts`. Step-definitions must not use raw `fetch()` — they don't know about base URLs, auth headers, or error handling. That knowledge lives in `ApiClient`.

---

## HOW

### Phase 1 — Check if the method already exists

```bash
grep -n "static async\|async function" support/apiClient.ts
```

### Phase 2 — Use ApiClient in step definitions

```typescript
// CORRECT
const token = await ApiClient.loginAsPatient()
await ApiClient.cancelAppointment(appointmentId, token)

// WRONG — raw fetch in step body
const res = await fetch('http://localhost:3000/api/v1/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slotId })
})
```

### Phase 3 — Adding a new method to ApiClient

ApiClient uses internal `post<T>`, `get<T>`, `patch<T>`, `delete_<T>` helpers that handle base URL, auth header, and error throwing.

```typescript
static async myNewMethod(param: string, token: string): Promise<MyResponseType> {
    return post<MyResponseType>('/my-endpoint', { param }, token)
}
```

---

## WHAT — correct vs forbidden

| Situation | Correct | Forbidden |
|-----------|---------|-----------|
| Login in step | `await ApiClient.loginAsPatient()` | `fetch('/api/v1/auth/login', ...)` |
| Create resource via API | `await ApiClient.bookAppointment(slotId, token)` | Inline fetch in Before() |
| New endpoint needed | Add static method to ApiClient | Add fetch call in step-definition |

---

## See Also

- `support/apiClient.ts` — all available methods
- `.claude/skills/step-definitions/SKILL.md` — how ApiClient is used in Before/After hooks
