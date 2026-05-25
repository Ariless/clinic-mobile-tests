# Performance Budget

Cold start, frame rate, and memory SLAs enforced as CI assertions.

## Why a budget, not just a test

A test with no documented threshold is an assertion without a contract. When a cold start regresses from 1800ms to 2800ms, there is no way to know whether 2800ms was always acceptable or is a new problem. The budget makes the contract explicit and reviewable — it is a product decision, not a test implementation detail.

## Budgets

| Metric | SLA | Enforcement | Measured by |
|--------|-----|-------------|-------------|
| Cold start (TotalTime) | < 2000 ms | `@perf` gate blocks release | `adb am start -W` → `TotalTime:` |
| Janky frame rate | < 5% | `@perf` gate blocks release | `dumpsys gfxinfo` → Janky frames / Total frames |
| Memory (PSS) | < 200 MB | Manual check pre-release | `dumpsys meminfo` → TOTAL PSS |
| Memory growth (navigation) | < 20 MB per 50 navigations | `@memory` gate | `memory.feature` — baseline vs final PSS |
| Wake locks (idle) | 0 held | `@battery @perf` gate | `battery.feature` — `dumpsys power` |
| JS bundle size | < 3 MB | `build-check.yml` in clinic-mobile | `du -k` on exported bundle |
| AI symptom checker p95 | < 3000 ms | `test:ai-properties` (Jest) | `support/claude.ts` timer |
| AI response size | < 2048 bytes | `test:ai-properties` (Jest) | `JSON.stringify(response).length` |

## Cold start

**Definition:** full cold start — app process not running, OS page cache cold, first Activity fully drawn.

**Measured by `ADB.coldStart()`:**
```ts
// support/adb.ts
coldStart(packageName, activity = '.MainActivity'): number {
  adb(`am force-stop ${packageName}`)
  const output = adb(`am start -W -n ${packageName}/${activity}`)
  // TotalTime = time from Intent dispatch to Activity.reportFullyDrawn() or first frame
  const match = output.match(/TotalTime:\s*(\d+)/)
  return parseInt(match[1], 10)
}
```

**Why 2000ms:** React Native bridge initialization adds ~400ms on top of native Android startup. A typical native app cold-starts in 600–900ms on mid-range hardware; adding RN overhead + SQLite-backed SUT API call on first render puts a realistic floor at ~1200ms. 2000ms leaves 800ms of headroom for slow emulators and CI runners while still catching regressions.

**Scenario:**
```gherkin
Scenario: App cold start completes within 2000ms
  Given the app is fully stopped
  When the app is cold launched
  Then total launch time is under 2000 milliseconds
```

**What a failure means:** a change introduced a synchronous operation on the main thread during startup — a large JSON parse, a blocking DB query, a missing lazy import. Investigate by adding `systrace` or checking the React Native startup timeline via `adb logcat -s ReactNative`.

## Frame rate / jank

**Definition:** percentage of frames that took longer than 16ms to render (dropped below 60fps).

**Measured by `ADB.parseJankRate()`:**
```ts
parseJankRate(packageName): { totalFrames, jankyFrames, jankRate } {
  const output = adb(`dumpsys gfxinfo ${packageName}`)
  // "Janky frames: N (X%)" and "Total frames rendered: N"
}
```

**Why 5%:** Android's own performance guidance flags > 5% janky frames as "poor" for user experience. At 60fps a 5% jank rate means 3 dropped frames per second during scroll — perceptible but not disruptive. Above 10% the scroll becomes visually stuttery. 5% is the threshold where a patient would start to notice.

**Scenario:**
```gherkin
Scenario: Scrolling the doctors list produces less than 5% janky frames
  Given the patient is logged in and the doctors list is visible
  And gfxinfo stats are reset
  When the doctors list is scrolled 5 times
  Then janky frame rate is under 5 percent
```

**What a failure means:** a re-render triggered by state update is running on the UI thread — missing `React.memo`, inline object/function props causing unnecessary re-renders, or a FlatList without `keyExtractor`. Check React DevTools Profiler.

## Memory

**Definition:** Proportional Set Size (PSS) — actual RAM usage attributed to this process after sharing.

**Measured manually:**
```bash
adb shell dumpsys meminfo com.clinicmobile | grep TOTAL
```

**Why 200 MB:** React Native apps on Android typically settle at 80–120 MB PSS in steady state. 200 MB gives headroom for the AI symptom checker response cache and Appium instrumentation overhead, while staying below the 300 MB low-memory killer threshold on 2 GB RAM devices.

**Not in CI gate (yet):** memory varies significantly between emulator runs due to OS background processes. A stable CI gate requires sampling at idle after a fixed warm-up sequence. This is a pre-release manual check until a stable baseline is established on real hardware via Firebase Test Lab (#18).

## AI endpoint SLAs

Enforced in `ai-properties/ai.properties.test.ts` (Jest, no device required):

| Assertion | Threshold | Why |
|-----------|-----------|-----|
| p95 response time | < 3000 ms | Claude Haiku median is ~600ms; p95 covers cold-start API calls and retry paths; above 3s a patient would abandon the symptom checker |
| Response JSON size | < 2048 bytes | Specialty name (≤ 30 chars) + reasoning (≤ 500 chars) + doctors array; 2 KB leaves room for expansion without network payload regression |
| Reasoning keyword presence | At least 1 symptom keyword reflected | Guards against placeholder reasoning that passes length checks |

## CI integration

Performance tests run in the `perf` job in `.github/workflows/mobile-ci.yml`. The job is triggered via `workflow_dispatch` with `run_perf: true` — it does not block every push because cold start measurement is stable between commits unless a startup path changes.

After the test run, `scripts/perf-report.js` reads `allure-results/` and writes `perf-summary.json`:

```json
{
  "generatedAt": "2026-05-24T12:00:00.000Z",
  "allPassed": true,
  "metrics": [
    { "label": "Cold start", "status": "passed", "value": 1823, "threshold": 2000, "unit": "ms" },
    { "label": "Jank rate",  "status": "passed", "value": 3.2,  "threshold": 5,    "unit": "%" }
  ]
}
```

Both `perf-summary.json` and the Allure report are uploaded as GitHub Actions artifacts and retained for 30 days. `perf-report.js` exits 1 if any budget is exceeded, which fails the CI step.

```bash
npm run test:perf     # run @perf scenarios against a connected device/emulator
npm run perf:report   # generate perf-summary.json from last allure-results run
```

The `@perf` tag also appears in the "Before release" gate in `docs/run-strategy.md`.

## Device class notes

`docs/pairwise-matrix.md` lists three device classes. Cold start budget should be re-baselined after Firebase Test Lab (#18):
- Low-end (2 GB RAM): expected TotalTime 1600–1900ms — budget may need 2500ms
- High-end (8 GB RAM): expected TotalTime 800–1200ms — budget remains 2000ms
