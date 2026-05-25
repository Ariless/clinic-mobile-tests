# Pairwise Coverage Matrix

Device × OS × network × locale combinations we run, and how we choose them.

## Why pairwise, not exhaustive

Full combinatorial coverage of 4 variables with reasonable ranges produces ~200+ combinations.
Pairwise (all-pairs) testing reduces this to ~20 without dropping any two-variable interaction uncovered.
For a clinic booking app, the risk is in two-variable interactions: a locale-specific date format that breaks only on API 34, or a network timeout that only manifests on a low-RAM device.

## Variables and values

| Variable | Values |
|----------|--------|
| **Device class** | Low-end (2 GB RAM), Mid (4 GB RAM), High-end (8 GB RAM) |
| **Android API** | 31 (Android 12), 33 (Android 13), 34 (Android 14) |
| **Network condition** | Fast (WiFi), Slow (2 G netem), Offline → recover |
| **Locale** | `en-GB`, `ru-RU`, `ar-SA` (RTL) |

## Pairwise selection — 18 combinations

| # | Device class | Android API | Network | Locale | Priority |
|---|-------------|-------------|---------|--------|----------|
| 1 | Low-end | 31 | Slow | en-GB | `@regression` |
| 2 | Low-end | 33 | Fast | ru-RU | `@smoke` |
| 3 | Low-end | 34 | Offline→recover | ar-SA | `@chaos` |
| 4 | Mid | 31 | Fast | ar-SA | `@regression` |
| 5 | Mid | 33 | Offline→recover | en-GB | `@chaos` |
| 6 | Mid | 34 | Slow | ru-RU | `@regression` |
| 7 | High-end | 31 | Offline→recover | ru-RU | `@regression` |
| 8 | High-end | 33 | Slow | ar-SA | `@regression` |
| 9 | High-end | 34 | Fast | en-GB | `@smoke` |
| 10 | Low-end | 31 | Fast | ru-RU | `@regression` |
| 11 | Low-end | 33 | Offline→recover | en-GB | `@chaos` |
| 12 | Low-end | 34 | Slow | ar-SA | `@regression` |
| 13 | Mid | 31 | Slow | en-GB | `@regression` |
| 14 | Mid | 33 | Fast | ar-SA | `@regression` |
| 15 | Mid | 34 | Offline→recover | ru-RU | `@chaos` |
| 16 | High-end | 31 | Fast | en-GB | `@smoke` |
| 17 | High-end | 33 | Slow | ru-RU | `@regression` |
| 18 | High-end | 34 | Offline→recover | ar-SA | `@chaos` |

Every pair of (Device class, API), (Device class, Network), (Device class, Locale), (API, Network), (API, Locale), and (Network, Locale) appears at least once.

## Local vs CI execution

| Environment | Combinations run | Rationale |
|-------------|-----------------|-----------|
| Local dev | #2, #9, #16 (`@smoke`, Fast network, en-GB) | Fastest feedback loop |
| PR gate | #2, #9, #16 | Same as local — blocks merge |
| Nightly CI | All 18 | Full pairwise coverage; Allure report attached |
| Firebase Test Lab | All 18, real devices | Removes emulator drift; planned for Phase 2h |

Local and PR runs use AVD Pixel 6 API 33 (`en-GB`, WiFi). This covers rows #2 and #9 — both high-priority smoke combinations.

## AVD configuration for pairwise coverage (local)

```bash
# Low-end — 2 GB RAM, Pixel 3a
avdmanager create avd -n pairwise_low_31 -k "system-images;android-31;google_apis;x86_64" -d "Nexus S"
# memory in config.ini: hw.ramSize=2048

# Mid — 4 GB RAM, Pixel 5
avdmanager create avd -n pairwise_mid_33 -k "system-images;android-33;google_apis;x86_64" -d "pixel_5"

# High-end — 8 GB RAM, Pixel 8
avdmanager create avd -n pairwise_high_34 -k "system-images;android-34;google_apis;x86_64" -d "pixel_8"
```

Locale is set per-run via ADB before launching the app:
```bash
adb shell settings put system system_locales en-GB   # or ru-RU / ar-SA
adb shell am force-stop com.clinicmobile
```

## Risk mapping

Which combinations are expected to be highest risk and why.

| Combination | Risk reason |
|-------------|-------------|
| Low-end + Slow + ar-SA | RTL layout + netem delay; React Native bridge under memory pressure |
| Low-end + Offline→recover | JS bundle reload race on low RAM after reconnect |
| API 31 + Slow | Older WebSocket implementation; reconnect backoff differs from API 33+ |
| ar-SA any | RTL text input direction affects booking form field order |

## What we do not test here

- iOS × network × locale — separate matrix; `xcrun.ts` mirrors ADB helpers; planned for Phase 2h
- Tablet form factors — not a clinic booking app risk dimension
- Android API < 31 — React Native 0.73 minimum supported SDK is 23; below API 31 is < 1% market share in the EU (clinic's target geography)
