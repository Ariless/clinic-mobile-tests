# Test Run Strategy

When to run each tag, expected duration, and the policy for handling flaky tests.

## Tag reference

| Tag | What it covers | Command |
|-----|---------------|---------|
| `@smoke` | Core patient booking flow; cross-role confirm | `npm run test:smoke` |
| `@regression` | Full suite — all scenarios | `npm run test:regression` |
| `@cross-role` | Patient + doctor two-actor scenarios | `npm run test:cross-role` |
| `@chaos` | ADB network kill, force-stop, background/foreground | `npm run test:chaos` |
| `@ai` | Claude Vision semantic checks, a11y non-determinism guard | `npm run test:ai` |
| `@ux-oracle` | Patient-centred UX quality: booking confirmation completeness, appointments actionability, doctor list informed choice | `npm run test:ux-oracle` |
| `@empathy` | Medical-grade communication quality: login error, network failure, cancellation messages rated by Claude 1–5 | `npm run test:empathy` |
| `@idempotency` | Retry after network drop does not create duplicate appointments — cross-layer DB assertion via API | `npm run test:idempotency` |
| `@observability` | Mobile booking traced in Loki: `appointment.booked` event with correct appointmentId | `npm run test:observability` |
| `@security` | JWT not in logcat, credentials not in logcat; APK manifest declares `allowBackup=false` (HIPAA compliance) | `npm run test:security` |
| `@a11y` | Touch targets, TalkBack, font scale | `npm run test:a11y` |
| `@perf` | Cold start time gate (< 2000ms) | `npm run test:perf` |
| `@offline` | Cache served when offline; cancel blocked; conflict resolution (doctor confirms while patient offline → reconnect → correct status); sync on reconnect | `npm run test:offline` |
| `@doze` | Android Doze mode: (1) no partial wake locks held during Doze; (2) UI is not stale after Doze exit — appointment status refreshes when doctor confirms via API while device is idle | `npm run test:doze` |
| `@deeplink` | `clinic://appointment/:id` URI scheme: authenticated user → detail screen; invalid ID → not-found error; unauthenticated → login redirect | `npm run test:deep-link` |
| `@theming` | Dark mode readability: Claude Vision checks that login, doctors list, and booking screen have no invisible or clipped content in dark mode | `npm run test:theming` |
| `@orientation` | Portrait/landscape rotation mid-flow: booking screen and doctors list survive rotation without reset or data loss | `npm run test:orientation` |
| `@touch-targets` | WCAG 2.5.8: all clickable elements on each screen are ≥ 44dp; failures reported with resource-id and actual dp size | `npm run test:touch-targets` |
| `@self-healing` | Self-healing locator resilience: stale testIDs are recovered via Claude Vision screenshot analysis and W3C pointer tap | `npm run test:self-healing` |
| `@foldable` | Foldable / large-screen layout: dual-panel visible at ≥ 600 dp, fold collapses to single panel, Claude Vision layout check | `npm run test:foldable` |
| `@feature-flag` | Feature flag routing: AI Check tab visible only when flag ON; `/health` flag state must match tab bar; graceful degradation when flag OFF | `npm run test:feature-flag` |

## When to run

| Trigger | Tags | Target duration | Blocks deploy? |
|---------|------|----------------|----------------|
| After every deploy | `@smoke` | < 5 min | Yes |
| Nightly | `@regression` | < 30 min | No (async alert) |
| After role or auth changes | `@cross-role` | < 10 min | Yes |
| After AI service changes | `@ai` | < 15 min | Yes |
| Weekly (Monday CI) | `@chaos` | < 20 min | No |
| Before release | `@security` + `@a11y` + `@perf` | < 20 min | Yes |
| Before release / after booking flow changes | `@offline` | < 10 min | Yes |
| Weekly (Monday CI) | `@doze` | < 5 min | No |
| Before release / after booking flow changes | `@deeplink` | < 5 min | Yes |
| Before release / after UI theme changes | `@theming` | < 5 min | No (informational) |
| Before release / after UI layout changes | `@orientation` | < 5 min | Yes |
| Before release / after UI changes | `@touch-targets` | < 10 min | Yes |
| Before release / after UI changes | `@ux-oracle` | < 10 min | No (informational) |
| Before release / after copy changes | `@empathy` | < 10 min | No (informational) |
| Before release / after booking flow changes | `@idempotency` | < 5 min | Yes |
| After deploy (optional) | `@observability` | < 2 min | No (informational) |
| After any testID rename / locator change | `@self-healing` | < 5 min | No (informational) |
| Before release / after layout changes | `@foldable` | < 10 min | Yes |
| After flag changes / before release | `@feature-flag` | < 5 min | Yes |

## Maestro smoke layer

Maestro runs the same 3 @smoke scenarios as Appium but without an Appium server. It's a separate tool — not a tag, not a WDIO script.

```bash
# Prerequisites: brew install maestro
cp maestro/.env.example maestro/.env   # first time only

# Run all three flows
npm run test:maestro

# Single flow
maestro test maestro/01_booking.yaml

# Via Fastlane
bundle exec fastlane maestro_smoke
```

| Flow | Covers | Duration |
|------|--------|----------|
| `01_booking.yaml` | Login → doctor → slot → booking confirmation | ~30 s |
| `02_my-visits.yaml` | Booking → My Visits → status "pending" | ~40 s |
| `03_cancel.yaml` | Booking → My Visits → cancel → status "cancelled" | ~50 s |

**When to use Maestro instead of Appium smoke:**
- Quick build sanity check without setting up Appium server
- Onboarding: no `npm install`, no Appium, just CLI + emulator
- After a UI-only change where you need a < 2 min sanity check

**When Maestro is not enough:** any test that needs `ApiClient` (state setup, teardown), network interception, ADB chaos, or AI Vision assertions. See `docs/maestro-vs-appium.md` for the full comparison.

**Known fragility:** `idRegex: "doctor-item-.*" index: 0` assumes seed data is intact. If all slots are booked the flow hangs at `assertVisible: id: "slots-list"`. Appium tests handle this by creating a fresh slot in `Before()`.

---

## Flakiness policy

A test is considered flaky if it fails on a clean emulator with no code changes.

- **One failure** — rerun manually; if green, note in test comment.
- **Two failures in a week** — add `@flaky` tag, open investigation issue, exclude from `@smoke` gate until fixed.
- **Root cause** — prefer fixing the test or the app; do not increase `waitForDisplayed` timeouts beyond 5 s without a documented reason.

ADB chaos tests are expected to have higher variance (network timing, emulator speed). A chaos test failing 1 in 5 runs is acceptable; 1 in 2 is not.

## Environment requirements

| Tag | Requires |
|-----|----------|
| All | Android emulator running, SUT on port 3000, Appium server on port 4723 |
| `@ai` | `ANTHROPIC_API_KEY` in `.env` |
| `@ux-oracle` | `ANTHROPIC_API_KEY` in `.env` |
| `@empathy` | `ANTHROPIC_API_KEY` in `.env` |
| `@idempotency` | ADB access; SUT on port 3000 |
| `@offline` | ADB access; SUT on port 3000 (Background step populates cache via API before killing wifi) |
| `@observability` | `LOKI_ENABLED=true`; Loki on port 3100 (`docker-compose -f docker-compose.yml -f docker-compose.observability.yml up` in sut/) |
| `@chaos` | ADB access to emulator (`adb devices` shows device) |
| `@cross-role` | Doctor and patient test accounts seeded in SUT |
| `@security` | `aapt2` in `$ANDROID_HOME/build-tools` or PATH (for APK manifest inspection; part of Android SDK build-tools) |
| `@doze` | ADB access to emulator; `dumpsys deviceidle force-idle` requires API 23+; SUT on port 3000 |
| `@deeplink` | ADB access; `clinic://` scheme registered in app.json + APK installed; SUT on port 3000 |
| `@theming` | `ANTHROPIC_API_KEY` in `.env`; ADB access (dark mode toggle requires API 28+) |
| `@orientation` | ADB access; `setOrientation` requires Appium capability `appium:settings[ignoreUnimportantViews]=false` or default behaviour |
| `@touch-targets` | ADB access (`wm density` for px→dp conversion) |
| `@self-healing` | `ANTHROPIC_API_KEY` in `.env`; ADB access; SUT on port 3000 |
| `@foldable` | ADB access (`wm size` requires API 28+); `ANTHROPIC_API_KEY` for `@ai` scenario |
| `@feature-flag` | SUT on port 3000; scenario 1 is environment-agnostic; scenarios 2+3 require specific `ENABLE_AI_RECOMMENDATION` value |

## Local quick run

```bash
# Start SUT
cd ../sut && npm run dev

# Start Appium (separate terminal)
appium

# Run smoke suite
cd ../clinic-mobile-tests
npm run test:smoke
```

## CI

Each push runs `@smoke`. Nightly cron runs `@regression`. Both jobs publish an Allure report as a CI artifact and fail the pipeline on any untagged-`@flaky` failure.
