# Appointment State Machine

Formal model of appointment lifecycle used to derive test cases for Phase 2l (state transition testing).

## States

| State | Terminal? | Who sets it |
|-------|-----------|-------------|
| `pending` | No | Patient (on booking) |
| `confirmed` | No | Doctor |
| `rejected` | Yes | Doctor |
| `cancelled` | Yes | Patient or Doctor |
| `completed` | Yes | Doctor |

## Valid transitions

```
pending ──► confirmed ──► completed
   │             │
   ▼             ▼
rejected      cancelled
   │
   ▼
cancelled
```

Defined in `sut/src/utils/appointmentStateMachine.js`:

```
pending   → confirmed, rejected, cancelled
confirmed → cancelled, completed
rejected  → (none)
cancelled → (none)
completed → (none)
```

## Transition table

| From \ To | pending | confirmed | rejected | cancelled | completed |
|-----------|---------|-----------|----------|-----------|-----------|
| `pending` | — | ✅ doctor | ✅ doctor | ✅ patient or doctor | — |
| `confirmed` | — | — | — | ✅ patient or doctor | ✅ doctor |
| `rejected` | — | — | — | — | — |
| `cancelled` | — | — | — | — | — |
| `completed` | — | — | — | — | — |

## Test case derivation

### Valid transitions (Phase 2l #68)

Each row in the table = one Cucumber scenario asserting:
1. Correct final status returned by API
2. Correct badge visible in mobile UI
3. Correct DB state (cross-layer assertion)

| Scenario | Actor | Transition |
|----------|-------|------------|
| Doctor confirms booking | Doctor | pending → confirmed |
| Doctor rejects booking | Doctor | pending → rejected |
| Patient cancels pending booking | Patient | pending → cancelled |
| Doctor cancels confirmed booking | Doctor | confirmed → cancelled |
| Patient cancels confirmed booking | Patient | confirmed → cancelled |
| Doctor marks appointment completed | Doctor | confirmed → completed |

### Invalid transition guards (Phase 2l #69)

Each invalid transition = one scenario asserting 422 response + no state change in DB.

| Scenario | Attempted | Expected |
|----------|-----------|----------|
| Doctor rejects already-confirmed | confirmed → rejected | 422 INVALID_TRANSITION |
| Patient cancels completed | completed → cancelled | 422 INVALID_TRANSITION |
| Doctor confirms cancelled | cancelled → confirmed | 422 INVALID_TRANSITION |
| Doctor completes pending (skipping confirm) | pending → completed | 422 INVALID_TRANSITION |

### Concurrent transitions (Phase 2l #70)

| Scenario | Race condition | Expected outcome |
|----------|---------------|-----------------|
| Patient cancels + doctor confirms simultaneously | Two writes to the same appointment | One succeeds, one gets 409 or 422; final state is consistent; both mobile clients receive a meaningful response |

## Why this matters

Invalid transitions are where production bugs live. A system that handles happy-path transitions correctly but accepts `completed → pending` silently has a broken invariant that will surface as data corruption, not a crash — and it will be invisible until a doctor sees a completed appointment marked as pending again.

Test cases are derived from the model, not from intuition. Any transition not listed as valid above is implicitly invalid and should be tested.

## Relationship to existing tests

The same state machine is tested at the API layer in `clinic-booking-api-tests`:
- `appointments.confirm.test.ts` — pending → confirmed
- `appointments.cancel.patient.test.ts` — pending/confirmed → cancelled
- `appointmentStateMachine.test.js` (SUT unit tests, Stryker 92%) — all transitions + invalid guard

Mobile tests in Phase 2l add: visual badge assertion + two-actor Appium scenarios + concurrent race condition on real device.
