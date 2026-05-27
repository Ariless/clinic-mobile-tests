# Maestro vs Appium — comparison

Two test runners cover the same @smoke scenarios. This document explains when each is the right tool.

## What each covers

| Layer | Tool | Location |
|-------|------|----------|
| Smoke (3 scenarios) | Maestro | `maestro/` |
| Smoke (3 scenarios) | Appium/WDIO | `features/booking.feature @smoke` |
| Regression, chaos, AI, a11y, perf | Appium/WDIO only | `features/` |

## Key differences

| | Maestro | Appium + WDIO |
|--|---------|---------------|
| **Test format** | YAML | TypeScript + Cucumber |
| **Setup overhead** | CLI only (`brew install maestro`) | Appium server + WDIO config + drivers |
| **Selector strategy** | `id` (accessibility ID) + `text` + `idRegex` | UiSelector, XPath, accessibility ID |
| **Dynamic IDs** | `idRegex: "doctor-item-.*" + index: 0` | `findByPattern()` + `getIdFromElement()` |
| **API setup / teardown** | None — flows must be self-contained | `Before/After` hooks via `ApiClient` |
| **Cross-platform** | Single YAML, different `appId` | Separate page objects in `pages/android/` and `pages/ios/` |
| **Assertions** | `assertVisible` / `assertNotVisible` | `expect($(...)).toBeDisplayed()` |
| **AI / Vision** | Not supported | `Claude.evaluateUX()` in `support/claude.ts` |
| **Network interception** | Not supported | mitmproxy via `support/proxy.ts` |
| **CI integration** | `maestro test` + exit code | WDIO + Allure artifact |

## When Maestro is the right choice

- Quick sanity check after a build: does the happy path work?
- Onboarding a new developer who hasn't set up Appium yet
- Validating a UI change in under 2 minutes before pushing

## When Appium is the right choice

- Any test that needs `ApiClient` (state setup / teardown)
- Chaos, network interception, offline scenarios
- AI / Vision assertions
- Performance budgets (cold start, jank, PSS)
- Cross-role scenarios (doctor + patient in one test)
- iOS (Maestro flows use Android `appId`; separate iOS config needed)

## Running Maestro

```bash
# Prerequisites
brew install maestro

# Copy credentials
cp maestro/.env.example maestro/.env

# Run all smoke flows
npm run test:maestro

# Run a single flow
maestro test maestro/01_booking.yaml

# Run with custom env
maestro test --env PATIENT_EMAIL=other@example.com maestro/01_booking.yaml
```

## CI

Both tools have dedicated jobs in `.github/workflows/mobile-ci.yml`, triggered via `workflow_dispatch`:

| Job | Input checkbox | Setup overhead in CI | Output |
|-----|---------------|---------------------|--------|
| `smoke` | `run_smoke` | `npm install -g appium` + driver install + `sleep 8` | Allure HTML report |
| `maestro-smoke` | `run_maestro` | `curl get.maestro.mobile.dev \| bash` + PATH export | JUnit XML |

Both jobs build the same APK and boot the same emulator. The difference is what happens after APK install: Maestro skips the Appium server entirely. On CI the time saving is ~3 min (Appium install + start).

## Hidden assumption

`idRegex: "doctor-item-.*" index: 0` assumes the first doctor in the list is always tappable and has an available slot. If seed data is missing or all slots are booked, the flow will hang on `assertVisible: id: "slots-list"`. Appium tests handle this by calling `ApiClient.createAvailableSlot()` in `Before` hooks.

This is the core trade-off: Maestro flows are simpler but more fragile under state variance.
