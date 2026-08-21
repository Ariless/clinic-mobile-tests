---
name: step-definitions
description: Writing and editing Cucumber step definitions for WDIO mobile tests. Use when: writing new step definitions; adding steps to an existing step-definition file.
triggers:
  - writing new step definitions
  - adding steps to an existing step-definition file
  - debugging steps that are pending or not running
---

# Skill: Step Definitions

## WHEN to load this skill

Load when the task involves:
- Writing new step definitions
- Adding steps to an existing step-definition file
- Debugging steps that are pending or not running

---

## WHY

Step definitions in WDIO Cucumber are global — a step registered in `booking.steps.ts` is available in every feature file. Duplicate step definitions cause silent failures: the scenario shows as "pending" with no error message and no test runs.

Page objects must be instantiated in `Before()`, not in the step body. State shared across steps in a scenario (tokens, IDs, selected names) lives in module-level variables and is reset in `Before()`.

---

## HOW

### Phase 1 — Check for duplicate steps before adding

```bash
grep -rh "^Given\|^When\|^Then" step-definitions/*.ts | sort | uniq -d
```

If your step text already exists — do not add it again. Reuse the existing step or change the wording in the feature file.

### Phase 2 — Instantiate page objects in Before(), not in step body

```typescript
// CORRECT
let loginPage: LoginPage
let bookingPage: BookingPage

Before(async function () {
    await driver.activateApp('com.anonymous.clinicmobile')
    loginPage = new LoginPage()
    bookingPage = new BookingPage()
    selectedDoctorName = ''
    patientToken = ''
})

// WRONG — instantiating in step body
When('I tap the confirm button', async function () {
    const bookingPage = new BookingPage()  // ← forbidden outside Before
    await bookingPage.tapConfirm()
})
```

### Phase 3 — Module-level variables for shared state

```typescript
// Module-level — shared across all steps in a scenario
let patientToken: string
let selectedDoctorName: string
let appointmentId: number | undefined

Before(async function () {
    // Reset all shared state before each scenario
    patientToken = ''
    selectedDoctorName = ''
    appointmentId = undefined
})
```

### Phase 4 — Cleanup in After()

```typescript
After(async function () {
    // Best-effort cleanup — never throw from After
    if (appointmentId && patientToken) {
        try {
            await ApiClient.cancelAppointment(appointmentId, patientToken)
        } catch { /* best-effort */ }
    }
})
```

### Phase 5 — Step naming

Match the Gherkin language exactly. Steps are matched by string/regex — extra spaces or punctuation break the match silently.

---

## WHAT — correct vs forbidden

| Situation | Correct | Forbidden |
|-----------|---------|-----------|
| New page object reference | Declare at module level, assign in `Before()` | `new PageClass()` inside step body |
| Shared state between steps | Module-level variable, reset in `Before()` | `this.context` or test-scoped variables |
| Check for duplicate steps | `grep -rh "^Given\|^When\|^Then" step-definitions/*.ts \| sort \| uniq -d` | Adding step without checking |
| Cleanup | `After()` with try/catch | Cleanup inside step body |
| API calls in steps | `await ApiClient.methodName(...)` | Raw `fetch()` in step body |

---

## See Also

- `.claude/skills/page-object/SKILL.md` — how page objects are structured
- `.claude/skills/api-client/SKILL.md` — available ApiClient methods
- `references/silent-skip-duplicate-steps.md` — real failure mode
