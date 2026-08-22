# Platform Parity Report

**Generated:** 2026-05-26  
**Suite:** clinic-mobile-tests  
**Platforms:** Android (primary) · iOS (secondary, via `PLATFORM=ios`)

---

## Summary

| Category | Feature count | Android | iOS-ready | iOS — work needed |
|----------|:---:|:---:|:---:|:---:|
| Cross-platform (no ADB) | 14 | ✅ | ✅ | none |
| Explicitly `@android` | 6 | ✅ | ❌ | platform-specific APIs |
| Implicitly Android (ADB-backed) | 7 | ✅ | ⚠️ | xcrun equivalents |
| iOS-only (`@ios`) | 1 (`security`) | — | ✅ | — |
| **Total features** | **28** | **28** | **15** | **13** |

**Updated 2026-05-27:** `security` feature moved from "implicitly Android" to split: 8 Android scenarios + 3 iOS-only scenarios (`PrivacyInfo.xcprivacy` + ATT compliance, #135). iOS-ready count: 14 → 15.

Page objects are symmetric: 8 Android + 8 iOS implementations (Login, Doctors, Booking, Appointments, DoctorAppointments, DeepLink, Foldable, SymptomChecker). Factory pattern in `pages/factory.ts` — switch via `PLATFORM=ios`.

---

## Cross-platform features (run as-is on iOS with `PLATFORM=ios`)

These features use no ADB — only factory.ts page objects, ApiClient, and Appium W3C actions.

| Feature | Tags | Notes |
|---------|------|-------|
| `booking` | `@smoke @regression` | Full patient booking flow |
| `cross-role` | `@smoke @regression` | Patient books → doctor confirms → patient sees confirmed |
| `empathy` | — | Error messaging, network UX, cancellation confirmation |
| `state-transitions` | — | 11 scenarios: valid/invalid transitions + concurrent |
| `symptom-checker` | `@regression` | AI recommendation flow; skip guard `ENABLE_AI_RECOMMENDATION` |
| `ux-oracle` | — | Claude Vision UX quality evaluation |
| `ai-recommend` | `@ai @regression` | Vision oracle + a11y non-determinism guard (Claude-based, not TalkBack) |
| `ondevice-ai` | — | On-device vs cloud AI differential; badge detection |
| `voice-ai` | — | Voice pipeline metamorphic + graceful degradation |
| `self-healing` | `@regression` | Claude Vision fallback for stale locators |
| `eu-ai-act` | `@compliance` | AI Act transparency + human-override scenarios |
| `idempotency` | — | POST deduplicated under network retry |
| `integration` | `@regression` | mitmproxy stub-based error injection (proxy runs on host, cross-platform) |
| `observability` | — | Loki log correlation; requires `LOKI_ENABLED=true` |

---

## Explicitly `@android` features

Tagged at scenario level — no iOS implementation planned. Each relies on an Android-specific OS API with no direct xcrun equivalent.

| Feature | Scenarios | Android API | iOS gap |
|---------|:---------:|-------------|---------|
| `deep-link` | 3 | `adb shell am start -a android.intent.action.VIEW` | iOS uses `xcrun simctl openurl`; `DeepLinkPage` iOS exists but step not wired |
| `doze` | 2 | `dumpsys deviceidle force-idle` | No iOS Simulator equivalent; Low Power Mode ≠ Doze |
| `foldable` | 4 | `adb wm size` + split-screen intents | iPadOS Slide Over is gestures-only, not automatable via simctl |
| `orientation` | 2 | `adb shell content insert` (rotate via settings) | `xcrun simctl io booted rotate` (simctl 12+); implementable |
| `theming` | 3 | `adb shell cmd uimode night yes/no` | `xcrun simctl ui booted appearance dark/light`; implementable |
| `touch-targets` | 4 | `UiSelector().clickable(true)` + `wm density` dp conversion | XCUITest `XCUIElementTypeAny` + `frame.width/height`; implementable |

**Orientation, theming, touch-targets** have clear xcrun equivalents — lowest-effort iOS port.

---

## Implicitly Android-only (ADB-backed, not tagged `@android`)

These features have no `@android` tag but use ADB internally. Running with `PLATFORM=ios` will reach the correct page objects but fail at the ADB call.

| Feature | ADB dependency | xcrun.ts equivalent | Status |
|---------|---------------|---------------------|--------|
| `a11y` | `enableTalkBack()` / `disableTalkBack()` | VoiceOver: `xcrun simctl spawn <device> accessibility` — partial | Gap: TalkBack automation not portable; iOS VoiceOver requires different driver config |
| `battery` | `getHeldWakeLockCount()` → `dumpsys power` | No direct iOS equivalent; Energy Impact in Instruments | Gap: wake lock concept is Android-only |
| `chaos` | `disableWifi()` / `setSlowNetwork()` | iOS Simulator uses host network stack; Network Link Conditioner is a manual tool | Gap: documented in `xcrun.ts` `setSlowNetwork` comment |
| `memory` | `parseTotalPss()` → `dumpsys meminfo` | No `simctl` equivalent; would need `leaks` / Instruments XML | Gap: PSS metric is Android-only |
| `n-plus-one` | `ADB.openApp()` + mitmproxy | `xcrun.ts coldStart()` covers launch; mitmproxy works on iOS too | Partial: open-app step uses ADB monkey; xcrun `coldStart` is the iOS replacement |
| `offline` | `disableWifi()` / `enableWifi()` | Network Link Conditioner or Charles Proxy (manual) | Gap: no programmatic wifi toggle on iOS Simulator |
| `performance` | `coldStart()` / `parseJankRate()` / `parseTotalPss()` | `xcrun.ts coldStart()` exists ✅; jank → Core Animation Instruments | Partial: cold start portable; jank/PSS iOS-only workaround needed |
| `security` | `logcat()` / `pullApkManifestXml()` / `scanApkForSecrets()` | `xcrun.ts getLog()` for logs ✅; **`@ios` scenarios added (#135): `hasPrivacyManifest()`, `readPrivacyManifest()`, `readInfoPlist()` via `plutil`** | **Partial → growing**: Android has 8 scenarios (`@android`); iOS now has 3 (`@ios`) covering Privacy Manifest + ATT compliance |

---

## Page object coverage

Both platforms have identical page object sets. No cross-platform test is blocked by a missing page object.

| Page object | Android | iOS | Notes |
|-------------|:-------:|:---:|-------|
| LoginPage | ✅ | ✅ | |
| DoctorsPage | ✅ | ✅ | |
| BookingPage | ✅ | ✅ | |
| AppointmentsPage | ✅ | ✅ | |
| DoctorAppointmentsPage | ✅ | ✅ | iOS uses `mobile: scroll` + predicateString |
| DeepLinkPage | ✅ | ✅ | iOS page exists; step not yet wired for `xcrun simctl openurl` |
| FoldablePage | ✅ | ✅ | iOS page exists; fold simulation not automatable on Simulator |
| SymptomCheckerPage | ✅ | ✅ | |

---

## Recommended next steps for iOS parity

**Done (2026-05-21–27):** Orientation ✅ · Theming ✅ · Touch targets ✅ · Privacy Manifest/ATT ✅

Remaining, by effort vs. portfolio value:

1. **Deep link** — `xcrun simctl openurl booted "clinic://appointment/..."` already in `xcrun.ts`; just wire up step; ~1 h
2. **Security log check** — `xcrun.ts getLog()` exists; add 2 iOS scenarios for JWT/credentials not in system log; ~1 h
3. **N+1 requests** — mitmproxy works on iOS too; open-app step is the only ADB call; replace with `xcrun.ts coldStart()`; ~2 h

Battery, memory, chaos, and offline require architectural changes (different measurement APIs or manual network tooling) — defer or document as known platform gap.

---

## Audit decisions

| Decision | Rationale |
|----------|-----------|
| `a11y` not tagged `@android` | Scenarios use Claude Vision for non-determinism guard (cross-platform), not TalkBack — but TalkBack step is Android-only |
| `battery` gap accepted | Wake lock concept is Android-specific; iOS equivalent requires Instruments — out of scope for Appium suite |
| `chaos` gap accepted | iOS Simulator uses host network; Network Link Conditioner is a manual macOS preference pane — not automatable from ADB/xcrun |
| `offline` gap accepted | Same root cause as chaos — iOS has no `svc wifi` command |
