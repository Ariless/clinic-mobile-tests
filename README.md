# clinic-mobile-tests

[![Mobile CI](https://github.com/Ariless/clinic-mobile-tests/actions/workflows/mobile-ci.yml/badge.svg)](https://github.com/Ariless/clinic-mobile-tests/actions/workflows/mobile-ci.yml)

**Appium + WDIO + Cucumber** suite for a React Native clinic booking app, run against real Android
and iOS devices — the layer where permissions, Doze, offline transitions and deep links live, and
where an API or browser test cannot reach.

| | |
| --- | --- |
| **Suite** | 165 scenarios across 50 `.feature` files (177 runs once `Examples` expand) · 50 step-definition files |
| **Page objects** | 11 screens, most of them split Android / iOS behind one factory — no platform knowledge in any feature |
| **Also runs without a device** | 20 Jest tests: Pact consumer contract, AI property/statistical suites, and the engine-parity differential |
| **Platforms** | Android (primary) · iOS via `PLATFORM=ios` |
| **Stack** | WebdriverIO · Cucumber · Appium · TypeScript · Jest · fast-check · Pact · Stryker · Allure |

> **The apps under test are private repositories, the suite is the point.** You cannot run these
> tests without the app and its backend. What they are: a React Native booking client against a
> Node.js + SQLite API — patients book slots, doctors confirm or reject, and the mobile layer adds
> what only a device has: permissions, Doze, offline transitions, deep links, biometrics.

## Three findings worth the read

**A CI step reported three broken suites as "skipped" for three months.** The helper-test step was
written as `[ -f jest.helpers.config.ts ] && npm run test:helpers || echo "Skipping: … not present"`.
The file was there, the tests ran, the tests failed — and `||` caught the non-zero exit, printed the
skip message and exited zero. In shell, `A && B || C` is not if-then-else: `C` runs when *either* A
or B fails, and its exit code becomes the line's. Behind the mask sat three real defects: an ADB test
still waiting on `svc wifi disable`, an `@anthropic-ai/sdk` mock missing `__esModule: true`, and a
WDIO globals stub that did not know about `browser`. Fixed by moving the file check into the step's
`if:` — 66 tests across 3 suites green. Any `|| echo` in a CI step reads as *a failure is muted here*.

**The obvious way to take a phone offline leaves it online.** `adb shell svc wifi disable` is the
command everyone reaches for first, and on an emulator it leaves the route to the host (`10.0.2.2`)
up. The scenario looks convincing, the app stays connected, and the offline test passes without ever
testing offline. The suite uses `cmd connectivity airplane-mode enable` instead.

**Contrast failures in a design system are systematic, not accidental.** The accessibility audit
found every Tailwind-500 colour paired with white text failing WCAG AA, across all screens in one
run — one fix, one step darker on interactive colours, closed the whole class. The same audit checks
WCAG 2.5.8 touch targets, which manual testing does not catch: a tester with ordinary motor control
rarely misses a small button, so the defect never gets reported.

More of these, with mechanisms: `MOBILE_TESTING_INSIGHTS.md` (17 entries).

## Where to look

| If you want | Read |
| --- | --- |
| Screens, testIDs, selector formats, seed accounts | `docs/SURFACEMAP.md` |
| Which tags to run when, and why | `docs/run-strategy.md` |
| The appointment lifecycle as a formal model | `docs/state-machine.md` |
| Exploratory sessions with real findings | `docs/et-sessions/` |
| Accessibility conformance, WCAG evidence | `docs/accessibility-conformance.md` |
| Where Maestro beats Appium and where it does not | `docs/maestro-vs-appium.md` |
| Android vs iOS parity, per feature | `docs/platform-parity.md` |
| Security audit, performance budget, regulatory packs | `docs/security-audit.md`, `docs/performance-budget.md`, `docs/fda-samd-validation.md` |

## What makes this different

**Claude Vision instead of pixel-perfect screenshots.**
Appium captures a screenshot; Claude evaluates it semantically — _"does this screen give a patient everything they need before their appointment?"_ Solves the core mobile testing pain: screenshot tests that break on every device density change. The accessibility audit runs Claude three times and flags only elements that appear in the majority of runs — a non-determinism guard that makes AI-based assertions reliable.

**Two-actor Cucumber scenarios.**
A single `.feature` file drives both patient and doctor simultaneously. Patient books on mobile → doctor confirms on mobile → patient sees `confirmed` badge without refreshing. Cross-role state machine testing on a real device — not mocked.

**ADB chaos as a test pattern.**
`adb shell cmd connectivity airplane-mode enable` inside a booking scenario, background/foreground transitions mid-flow, force-stop and reopen. Mobile equivalent of chaos engineering from Project 1 — testing the environment, not just the buttons. (`svc wifi disable` is the command everyone reaches for first; it leaves the emulator's route to the host up, so the scenario stays online while the test looks convincing.)

**Non-deterministic systems testing methodology.**
A non-deterministic system can't be tested with deterministic assertions. The suite uses four techniques in parallel: property-based (fast-check invariants over random inputs), metamorphic (rephrasing/irrelevance relations), statistical distribution (≥8/10 threshold), and bounded SLA (p95 latency, response size, reasoning relevance). Layer matters: iteration-heavy tests run at API level via Jest; visible-state tests run via Appium/Cucumber.

**AI exploration vs contract testing.**
`pact/mobile.pact.consumer.test.ts` formalises the mobile app's contract with the API — field names, types, status codes — and runs in CI without a device. Playwright MCP can discover what fields the API actually returns in a live session; the Pact file locks that discovery down so regressions are caught automatically. See [`../tests/docs/mcp-demo.md`](https://github.com/Ariless/clinic-booking-api-tests/blob/main/docs/mcp-demo.md) for the comparison scenario.

## Architecture

<details>
<summary><b>Full layout</b> — every directory, with what lives in it and why</summary>

```
clinic-mobile-tests/
  features/                    # 50 Cucumber .feature files — no platform knowledge in any of them.
                               # Grouped below by what they interrogate; the directory is the full list.
    # Core journeys
    booking · cross-role · integration · state-transitions · deep-link · calendar · maps · qr-scan
    # AI behaviour and compliance
    ai-recommend      # Claude Vision + a11y audit (no on-device AI needed)
    symptom-checker   # invariants, graceful degradation, adversarial input, confused patient
    ux-oracle         # Claude rates screen completeness from the patient's perspective (1–5)
    empathy           # Claude rates patient-facing messages for medical-grade communication (1–5)
    microcopy · friction · voice-ai · ondevice-ai
    eu-ai-act         # EU AI Act, HIGH RISK medical AI: transparency, human oversight, golden dataset
    # Environment as part of the system
    chaos · offline · doze · battery · memory · permissions · push-notifications · webview
    circuit-breaker · n-plus-one · idempotency · event-chain · self-healing
    # Device surface and rendering
    foldable · orientation · font-scale · theming · rtl · contrast · touch-targets · a11y
    string-overflow · reduce-motion · empty-states · datetime-locale
    # Cross-cutting
    security · performance · observability · otel-trace · analytics-ab · feature-flag · pairwise
  step-definitions/            # Cucumber step implementations — steps are global across all files
    foldable.steps.ts           # @foldable; defines shared "I am logged in as a patient" step (used by all features)
    feature-flag.steps.ts       # @feature-flag; environment-agnostic /health ↔ tab-bar contract assertion
    eu-ai-act.steps.ts          # @eu-ai-act; compliance assertions — disclosure banner, browse-all override, golden dataset
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
    adb.ts                     # ADB helpers: disableWifi(), enableWifi(), logcat(), coldStart(), resetGfxinfo(), parseJankRate(), isInstalled(), pullApkManifestXml(), enterDozeMode(), exitDozeMode(), setDisplaySize(), resetDisplaySize(), setFontScale(), resetFontScale(), setLocale(), resetLocale(), revokePermission(), grantPermission()
    xcrun.ts                   # iOS mirror: forceStop(), coldStart(), getLog(), setTimezone(), enrollBiometric(), screenshot()
    claude.ts                  # Claude Vision helpers: compareScreenshot(), auditA11y(), evaluateUX(), evaluateLayout(), evaluateReadability(), evaluateMicrocopy(), analyzeJourneyFriction(), evaluateFontScaleLayout(), evaluateRtlLayout(), evaluateEmptyState()
  pact/
    mobile.pact.consumer.test.ts  # Consumer contract: clinic-mobile → clinic-booking-api (6 interactions)
    tsconfig.json              # IDE type support for pact/ (Jest uses jest.tsconfig.json at root)
  pacts/
    clinic-mobile-clinic-booking-api.json  # Generated pact file. Verified against the running API by
                               # clinic-booking-api-tests: tests/api/pact/mobile.pact.provider.test.ts,
                               # which keeps its own copy and fails if this one drifts (since 2026-08-22).
  ai-properties/
    ai.properties.test.ts      # Jest: #33 property-based, #35 statistical, #36 hallucination, #37 bounded SLA,
                               # plus a wording group that runs only against a real model. Skips with a
                               # reason when no SUT answers at /health (since 2026-08-22).
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

</details>

## Prerequisites

- Node.js 22+ (`engines.node` is `>=22`)
- Java 17+ (required by Appium)
- Android Studio with AVD — Pixel 6 API 33 recommended
- Appium 2.x and uiautomator2 driver:
  ```bash
  npm install -g appium
  appium driver install uiautomator2
  ```
- clinic-mobile APK installed on the emulator (built from the `clinic-mobile` repository, private)
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
npm run test:qr                        # @qr — QR code scan via ADB deep link: valid / offline / cancelled appointment
npm run test:biometrics                # @biometrics — biometric login: success / 3×fail→fallback / unavailable (requires matching APK build)
npm run test:string-overflow           # @string-overflow — de-DE locale: no truncated labels or overflowing buttons (requires ANTHROPIC_API_KEY)
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
| `@calendar` | Calendar integration: booking triggers add-to-calendar flow; permission granted/denied/exists/unavailable states; event not duplicated | After calendar service changes |
| `@maps` | Maps SDK: clinic location pin displayed with correct coordinates from API; permission handling; Android + iOS | After location data changes |
| `@webview` | WebView rendering: title shown, HTML body accessible; WKWebView context switch; iOS regression guard against SFSafariViewController | After WebView changes |
| `@voice` | Voice AI: mic permission flow; text and voice input produce equivalent results (metamorphic); denied mic → specific error, not crash | After voice feature changes |
| `@ondevice` | On-device AI: local keyword recommender returns correct specialty; on-device badge visible; response < 500ms; no network call made | After on-device AI changes |
| `@notifications @android` | Push notifications: booking fires notification with doctor name and meaningful title; tap navigates to AppointmentDetailScreen; background notification delivery | Before release / Android only |

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
| `clinic-mobile` (private) | React Native app under test |
| `clinic-booking-api` (private) | Backend API (Node.js + SQLite) |

## Related projects

- [clinic-booking-api-tests](https://github.com/Ariless/clinic-booking-api-tests) — API, E2E, and UI tests for the same backend
- Test strategy and portfolio narrative: [`docs/TEST_STRATEGY.md` in clinic-booking-api-tests](https://github.com/Ariless/clinic-booking-api-tests/blob/main/docs/TEST_STRATEGY.md) — a separate repository, so the relative link this line used to carry only resolved on a machine with both checked out side by side
