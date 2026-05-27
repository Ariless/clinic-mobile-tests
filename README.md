# clinic-mobile-tests

Appium test suite for [clinic-mobile](../clinic-mobile) — a React Native clinic booking app.
Tests the same SUT as [clinic-booking-api-tests](../tests) but at the mobile layer, where device-level behaviour can't be reached by API or browser tests.

## What makes this different

**Claude Vision instead of pixel-perfect screenshots.**
Appium captures a screenshot; Claude evaluates it semantically — _"does this screen give a patient everything they need before their appointment?"_ Solves the core mobile testing pain: screenshot tests that break on every device density change. The accessibility audit runs Claude three times and flags only elements that appear in the majority of runs — a non-determinism guard that makes AI-based assertions reliable.

**Two-actor Cucumber scenarios.**
A single `.feature` file drives both patient and doctor simultaneously. Patient books on mobile → doctor confirms on mobile → patient sees `confirmed` badge without refreshing. Cross-role state machine testing on a real device — not mocked.

**ADB chaos as a test pattern.**
`adb shell svc wifi disable` inside a booking scenario, background/foreground transitions mid-flow, force-stop and reopen. Mobile equivalent of chaos engineering from Project 1 — testing the environment, not just the buttons.

**Non-deterministic systems testing methodology.**
A non-deterministic system can't be tested with deterministic assertions. The suite uses four techniques in parallel: property-based (fast-check invariants over random inputs), metamorphic (rephrasing/irrelevance relations), statistical distribution (≥8/10 threshold), and bounded SLA (p95 latency, response size, reasoning relevance). Layer matters: iteration-heavy tests run at API level via Jest; visible-state tests run via Appium/Cucumber.

**AI exploration vs contract testing.**
`pact/mobile.pact.consumer.test.ts` formalises the mobile app's contract with the API — field names, types, status codes — and runs in CI without a device. Playwright MCP can discover what fields the API actually returns in a live session; the Pact file locks that discovery down so regressions are caught automatically. See [`../tests/docs/mcp-demo.md`](../tests/docs/mcp-demo.md) for the comparison scenario.

## Architecture

```
clinic-mobile-tests/
  features/                    # Cucumber .feature files — no platform knowledge
    booking.feature
    cross-role.feature
    chaos.feature
    ai-recommend.feature         # Claude Vision + a11y audit (no device AI needed)
    ux-oracle.feature            # Claude UX oracle: rates screen completeness from patient's perspective (1–5)
    empathy.feature              # Empathy testing: Claude rates patient-facing messages for medical-grade communication (1–5)
    symptom-checker.feature      # AI symptom checker: invariants, graceful degradation, adversarial, confused patient
    security.feature
    performance.feature
    foldable.feature             # Foldable/large-screen: dual-panel layout, fold collapse, Claude Vision layout check
    feature-flag.feature        # Feature flag routing: AI tab visible only when ENABLE_AI_RECOMMENDATION=true; /health contract
    eu-ai-act.feature           # [premium] EU AI Act compliance (HIGH RISK medical AI): transparency, human oversight, golden dataset, consistency
  step-definitions/            # Cucumber step implementations — steps are global across all files
    foldable.steps.ts           # @foldable; defines shared "I am logged in as a patient" step (used by all features)
    feature-flag.steps.ts       # @feature-flag; environment-agnostic /health ↔ tab-bar contract assertion
    eu-ai-act.steps.ts          # [premium] @eu-ai-act; compliance assertions — disclosure banner, browse-all override, golden dataset
  pages/
    abstract/
      BasePage.ts              # Android base: resource-id XPath + UiSelector pattern matching
      BasePageIOS.ts           # iOS base: accessibility id (~) + predicate string pattern matching
    android/                   # Android locators: resource-id via XPath
      # LoginPage, DoctorsPage, BookingPage, AppointmentsPage,
      # DoctorAppointmentsPage, DeepLinkPage, FoldablePage, SymptomCheckerPage
    ios/                       # iOS locators: accessibility id via XCUITest (mirrors android/)
    factory.ts                 # Picks android/ or ios/ at runtime from PLATFORM env var
  support/
    adb.ts                     # ADB helpers: disableWifi(), enableWifi(), logcat(), coldStart(), resetGfxinfo(), parseJankRate(), isInstalled(), pullApkManifestXml(), enterDozeMode(), exitDozeMode(), setDisplaySize(), resetDisplaySize()
    xcrun.ts                   # iOS mirror: forceStop(), coldStart(), getLog(), setTimezone(), enrollBiometric(), screenshot()
    claude.ts                  # Claude Vision helpers: compareScreenshot(), auditA11y(), evaluateUX(), evaluateLayout()
  pact/
    mobile.pact.consumer.test.ts  # Consumer contract: clinic-mobile → clinic-booking-api (6 interactions)
    tsconfig.json              # IDE type support for pact/ (Jest uses jest.tsconfig.json at root)
  pacts/
    clinic-mobile-clinic-booking-api.json  # Generated pact file (checked in for provider verification)
  ai-properties/
    ai.properties.test.ts      # Jest: #33 property-based, #35 statistical, #36 hallucination, #37 bounded SLA
    tsconfig.json              # IDE type support for ai-properties/
  jest.tsconfig.json           # Root Jest tsconfig — covers pact/ + ai-properties/, excludes WDIO globals
  wdio.conf.ts                 # PLATFORM env var picks pages/android/ or pages/ios/
  jest.config.ts               # Jest config: two test suites (pact + ai-properties), separate --testPathPattern scripts
  maestro/
    _login.yaml                # Reusable login helper (runFlow only)
    01_booking.yaml            # Smoke: book appointment
    02_my-visits.yaml          # Smoke: booking appears in My Visits with pending status
    03_cancel.yaml             # Smoke: cancel pending appointment
    .env.example               # Credentials template
  docs/
    state-machine.md           # Formal appointment lifecycle model
    run-strategy.md            # When to run @smoke / @regression / @chaos / @ai + Maestro section
    pairwise-matrix.md         # Device × OS × network × locale coverage strategy (18 pairwise combinations)
    performance-budget.md      # Cold start / TTI / memory SLAs as CI assertions
    maestro-vs-appium.md       # Comparison: when to use each tool, trade-offs, hidden assumptions
```

One `.feature` file, two platforms:
```bash
PLATFORM=android npm test
PLATFORM=ios npm test
```

## Prerequisites

- Node.js 20+
- Java 17+ (required by Appium)
- Android Studio with AVD — Pixel 6 API 33 recommended
- Appium 2.x and uiautomator2 driver:
  ```bash
  npm install -g appium
  appium driver install uiautomator2
  ```
- clinic-mobile APK installed on the emulator (see [clinic-mobile setup](../clinic-mobile/README.md))
- SUT running on host machine: `cd ../sut && npm run dev` (port 3000)
- For AI Vision patterns (`ai-recommend.feature`): `ANTHROPIC_API_KEY` in `.env`
- For symptom checker patterns (`symptom-checker.feature`): set `ENABLE_AI_RECOMMENDATION=true` in `.env`; SUT must run with the same flag. `AI_MOCK_RESPONSE=true` on the SUT lets you test without a real API key.

## Setup

```bash
git clone <repo>
cd clinic-mobile-tests
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY if running AI tests
```

## Running tests

```bash
PLATFORM=android npm test              # full suite
npm run test:smoke                     # @smoke — after every deploy, < 5 min
npm run test:regression                # @regression — nightly
npm run test:cross-role                # two-actor patient + doctor scenarios
npm run test:chaos                     # @chaos — ADB chaos scenarios
npm run test:ai                        # @ai — Claude Vision + AI patterns
npm run test:ux-oracle                 # @ux-oracle — patient-centred screen quality evaluation
npm run test:empathy                   # @empathy — medical-grade communication quality (login error, network error, cancellation)
npm run test:idempotency               # @idempotency — retry after network drop does not create duplicate appointments
npm run test:observability             # @observability — mobile booking traced in Loki (requires observability stack)
npm run test:security                  # @security — sensitive data in logcat
npm run test:perf                      # @perf — cold start time gate
npm run test:a11y                      # @a11y — touch targets, TalkBack, font scale
npm run test:doze                      # @doze — Android Doze mode: wake locks + stale UI after exit
npm run test:deep-link                 # @deeplink — clinic:// URI scheme: valid ID / not-found / unauthenticated redirect
npm run test:theming                   # @theming — dark mode readability via Claude Vision
npm run test:orientation               # @orientation — portrait/landscape rotation mid-flow
npm run test:touch-targets             # @touch-targets — WCAG 2.5.8: all clickable elements ≥ 44dp
npm run test:foldable                  # @foldable — dual-panel layout on large screen / foldable device
npm run test:feature-flag              # @feature-flag — AI tab visibility matches ENABLE_AI_RECOMMENDATION flag
npm run test:pact                      # consumer contract tests (Jest, no device required)
npm run test:ai-properties             # property-based + statistical + SLA tests (Jest, no device, needs SUT + ENABLE_AI_RECOMMENDATION=true)
npm run test:maestro                   # Maestro smoke flows (no Appium required — needs maestro CLI)
```

> **Three test runners in one project.** `npm test` and all tagged scripts use WDIO/Cucumber (Appium, device required). `npm run test:pact` and `npm run test:ai-properties` both use Jest — no emulator needed. `jest.tsconfig.json` at root excludes WDIO globals so all Jest tests get clean types. Each Jest script uses `--testPathPattern` to scope itself — extending `jest.config.ts` with a new suite does not silently change other scripts.

## Test tags

| Tag | What | When |
|-----|------|------|
| `@smoke` | Core patient booking flow | After every deploy |
| `@regression` | Full suite | Nightly |
| `@cross-role` | Patient + doctor scenarios | After role-related changes |
| `@chaos` | ADB network kill, force-stop, background/foreground | Weekly |
| `@ai` | Claude Vision, a11y audit, symptom checker invariants, metamorphic relations, hallucination detection, adversarial + confused patient | After AI service changes |
| `@ux-oracle` | Claude rates screens 1–5 for patient completeness, actionability, and informed choice | Before release / after UI changes |
| `@empathy` | Claude rates patient-facing messages 1–5 for medical empathy (error clarity, tone, next steps) | Before release / after copy changes |
| `@idempotency` | Retry after network drop does not create duplicate appointments — cross-layer DB assertion | Before release / after booking flow changes |
| `@observability` | Mobile booking traced in Loki: `appointment.booked` event with correct appointmentId | After deploy; requires `LOKI_ENABLED=true` + observability stack |
| `@security` | JWT and credentials not in logcat; APK manifest `allowBackup=false` (HIPAA: patient data must not be backed up to Google cloud unencrypted) | Before release |
| `@perf` | Cold start time gate (< 2000ms) | Before release |
| `@a11y` | Touch targets, TalkBack, font scale | Before release |
| `@doze` | Android Doze mode: no wake locks held during `force-idle`; appointment status not stale after Doze exit — detects OS-lifecycle/cache bugs invisible to API tests | Weekly |
| `@deeplink` | `clinic://appointment/:id` URI scheme: valid ID → detail screen with correct data; non-existent ID → not-found error; no session → login redirect (not crash) | Before release |
| `@theming` | Dark mode readability: Claude Vision checks login, doctors list, and booking screen for invisible or clipped content | Before release / after UI theme changes |
| `@orientation` | Portrait/landscape rotation mid-booking and mid-doctors-list: screen does not reset, form data not lost, no error triggered | Before release / after UI layout changes |
| `@touch-targets` | WCAG 2.5.8: all clickable elements on each screen are ≥ 44dp; failures reported with resource-id and actual dp/px size | Before release |
| `@self-healing` | Stale testIDs recovered via Claude Vision + W3C pointer tap | After testID renames |
| `@foldable` | Dual-panel layout on large screen (≥ 600 dp): doctors list + booking panel side by side; fold collapses back to single panel; Claude Vision layout check | Before release / after layout changes |
| `@feature-flag` | AI Check tab appears only when `ENABLE_AI_RECOMMENDATION=true`; environment-agnostic contract: `/health` flag state must match visible tab bar | After flag changes / before release |

> **Maestro smoke** (`npm run test:maestro`): same 3 @smoke scenarios without an Appium server — quick sanity check after a build. Requires `brew install maestro` and `cp maestro/.env.example maestro/.env`. See [`docs/maestro-vs-appium.md`](docs/maestro-vs-appium.md) for when to use each tool.

> **Jest-only test suites** (no WDIO tag): `test:pact` — run before merging API client changes; `test:ai-properties` — run before merging AI service changes or after updating `ALLOWED_SPECIALTIES`.

## CI

| Job | Trigger | Runner | Duration | Blocks merge? |
|-----|---------|--------|----------|---------------|
| Type check + Pact + AI properties | Every push / PR | ubuntu-latest | ~3 min | Yes |
| Smoke suite (Android emulator) | `workflow_dispatch` → enable toggle | ubuntu-latest | ~20 min | No |
| Smoke suite (iOS Simulator) | `workflow_dispatch` → enable toggle | macos-14 | ~25 min | No |

**Static job** runs `npm run type-check`, `npm run test:pact`, `npm run test:ai-properties` — no device required, runs in ~3 minutes.

**Smoke job** (`workflow_dispatch` only): checks out `clinic-mobile`, runs `expo prebuild`, builds a debug APK with Gradle, starts an Android API 33 emulator via `reactivecircus/android-emulator-action`, installs the APK, spins up Appium and the SUT via Docker, runs `@smoke`, and uploads an Allure report as a CI artifact.

**Maestro smoke job** (`workflow_dispatch` only, ~8 min): same APK build and emulator setup as the Smoke job, but installs Maestro CLI via `get.maestro.mobile.dev` instead of Appium. No `appium driver install`, no `sleep 8` — Maestro talks directly to the emulator. Runs the 3 YAML flows in `maestro/` and uploads a JUnit XML artifact. Demonstrates the setup cost difference between the two tools on identical infrastructure.

**Fastlane** wraps the most-used test commands into named lanes:
```bash
bundle exec fastlane ci             # type-check + pact + ai-properties (no device)
bundle exec fastlane smoke          # @smoke + Allure report (device required)
bundle exec fastlane regression     # full suite + Allure report
bundle exec fastlane perf           # cold start + jank gate
bundle exec fastlane security       # logcat credential check
bundle exec fastlane maestro_smoke  # Maestro 3-flow smoke (no Appium, needs maestro CLI)
```

## SUT apps in this project

| Repo | Role |
|------|------|
| [clinic-mobile](../clinic-mobile) | React Native app under test |
| [sut](../sut) | Backend API (Node.js + SQLite) |

## Related projects

- [clinic-booking-api-tests](../tests) — API, E2E, and UI tests for the same backend
- Test strategy and portfolio narrative: [`tests/docs/TEST_STRATEGY.md`](../tests/docs/TEST_STRATEGY.md)
