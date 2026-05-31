# Mobile SUT Surface Map

Compact index of screens, testIDs, and selector patterns.
Read this before writing page objects or step-definitions.

SUT API: same as Project 1 — see `tests/docs/SURFACEMAP.md` for full endpoint reference.

### Mobile-specific SUT endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/v1/ai/recommend-doctor` | POST | AI symptom checker |
| `GET /api/v1/ai/circuit-state` | GET | Returns `{ state, failures, openedAt }` — circuit breaker state |
| `POST /api/v1/debug/ai-circuit-control` | POST | `{ action: "open" \| "reset" }` — force circuit state for testing (`ENABLE_DEBUG_ROUTES=true`) |

### W3C traceparent header

Every mobile API call includes a `traceparent` header (W3C Trace Context format: `00-{traceId:32hex}-{spanId:16hex}-01`).  
SUT logs it via pino-http `customProps` — appears in every Loki entry alongside domain events.  
Mobile logs `[trace] {traceparent} METHOD /path` to console (readable via `ADB.logcat()`).

### Analytics events (logcat)

Mobile fires `console.log('[analytics]', event)` at key user actions — readable via `ADB.logcat()`.

| Event | When fired |
|-------|-----------|
| `booking_manual` | Booking confirmed — doctor selected from DoctorsScreen |
| `booking_ai` | Booking confirmed — doctor selected from AI recommendation |
| `ai_recommendation_used` | AI symptom checker returns a result |
App: React Native (Expo) · Appium 3.x · WebdriverIO 9.x

---

## Selector format

```typescript
// Android — XPath by resource-id (BasePage.rid / BasePage.el)
//*[@resource-id="{testID}"]

// Android scroll-into-view
android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("{testID}"))

// iOS — accessibility name (BasePageIOS.rid)
~{testID}
```

Use `this.el('testID')` or `this.rid('testID')` — never write raw XPath in page objects.

---

## Screens and testIDs

### LoginScreen
**Page marker:** `login-title`

| testID | Element |
|--------|---------|
| `login-email-input` | email text field |
| `login-password-input` | password text field |
| `login-submit-button` | Log in button |
| `login-error` | error message |
| `login-loading` | loading indicator |
| `terms-link` | Terms & Conditions link (opens WebViewScreen) |
| `privacy-link` | Privacy Policy link (opens WebViewScreen) |
| `biometric-login-button` | biometric login button (visible only when hardware enrolled + prior token) |
| `biometric-fallback-notice` | notice shown after 3 failed biometric attempts |

**Biometric test hook:** `EXPO_PUBLIC_TEST_BIOMETRIC=success|fail|unavailable` — baked at build time. `success` → immediate login; `fail` → each tap increments failure counter; `unavailable` → button never renders. Requires APK built with the appropriate value.

### WebViewScreen
**Page marker:** `webview-screen`
Opened from LoginScreen via `terms-link` or `privacy-link`. Contains static HTML content rendered in a WebView.

| testID | Element |
|--------|---------|
| `webview-screen` | root container |
| `webview-title` | native header title text |
| `webview-back-button` | back → LoginScreen |
| `webview-content` | `react-native-webview` component (native container) |

**Appium context switching:**
- While in `NATIVE_APP` context: use `resource-id` (Android) / `~accessibility-id` (iOS) selectors for `webview-back-button`, `webview-title`
- After `driver.switchContext(webviewCtx)`: use standard web selectors (`h1`, `body`, CSS) to assert HTML content
- Always call `driver.switchContext('NATIVE_APP')` before interacting with native elements again
- Android context name: `WEBVIEW_<appPackage>` (e.g. `WEBVIEW_com.anonymous.clinicmobile`)
- iOS context name: `WEBVIEW_<numeric-id>` (dynamic — find by `startsWith('WEBVIEW')`)

### DoctorsScreen
**Page marker:** `doctors-list`

Single-panel layout (width < 600 dp):

| testID | Element |
|--------|---------|
| `doctors-list` | scrollable list of doctor cards |
| `doctors-loading` | loading indicator |
| `doctors-empty` | empty state |
| `doctors-error` | error message |
| `offline-banner` | offline mode banner |
| `logout-button` | log out button |
| `doctor-item-{id}` | doctor card touchable (dynamic) |
| `doctor-name-{id}` | doctor name text (dynamic) |
| `doctor-specialty-{id}` | doctor specialty text (dynamic) |
| `map-button-{id}` | open ClinicMapScreen for this doctor (dynamic) |

Dual-panel layout (width ≥ 600 dp — foldable / large screen):

| testID | Element |
|--------|---------|
| `dual-panel-container` | root container (present only on large screens) |
| `panel-doctors` | left panel — doctor list (same doctor-item-* cards inside) |
| `panel-booking` | right panel — BookingScreen inline (visible after selecting a doctor) |
| `panel-booking-placeholder` | right panel — placeholder text "Select a doctor to book" (visible before selection) |

### BookingScreen — slot selection
**Page marker:** `slots-list`

| testID | Element |
|--------|---------|
| `booking-doctor-name` | selected doctor name |
| `slots-list` | available slots list |
| `slots-loading` | loading indicator |
| `slots-empty` | no slots available |
| `slots-back-button` | back to doctors |
| `booking-error` | booking error message |
| `booking-loading` | booking in-progress indicator |

### BookingScreen — success state
| testID | Element |
|--------|---------|
| `booking-success-icon` | ✓ checkmark — static visual indicator (WCAG 2.3.3 Reduce Motion: confirms booking without relying on animation) |
| `booking-success-message` | confirmation message |
| `add-to-calendar-button` | add appointment to device calendar (hidden after tapped) |
| `add-to-calendar-loading` | activity indicator while calendar permission/write in progress |
| `calendar-added-message` | shown after successful calendar write |
| `calendar-denied-message` | shown when calendar permission denied |
| `calendar-exists-message` | shown when event already exists for this appointment |
| `calendar-unavailable-message` | shown when no writable calendar found |
| `booking-back-button` | back to doctors |

> **Push notification (system-level, Android):** after `booking-success-message` appears, `expo-notifications` fires a local notification in the Android notification shade. No in-app testID — use `driver.openNotifications()` + `UiSelector().textContains(doctorName)` to assert. Tapping the notification navigates to `AppointmentDetailScreen` (same as deep link flow — `testID="deep-link-screen"`).

### AppointmentsScreen (patient)
**Page marker:** `appointments-list`

| testID | Element |
|--------|---------|
| `appointments-list` | list of patient appointments |
| `appointments-loading` | loading indicator |
| `appointments-empty` | empty state |
| `appointments-error` | error message |
| `offline-banner` | offline mode banner |
| `appointment-cancel-button-{id}` | cancel button per appointment (dynamic) |
| `appointment-status-{id}` | status label per appointment (dynamic) |

### DoctorAppointmentsScreen
**Page marker:** `doctor-appointments-list`

| testID | Element |
|--------|---------|
| `doctor-appointments-list` | list of doctor appointments |
| `doctor-appointments-loading` | loading indicator |
| `doctor-appointments-empty` | empty state |
| `doctor-appointments-error` | error message |
| `doctor-logout-button` | log out button |
| `doctor-appointment-confirm-button-{id}` | confirm button (dynamic, requires scroll) |
| `doctor-appointment-reject-button-{id}` | reject button (dynamic, requires scroll) |
| `doctor-appointment-complete-button-{id}` | complete button (dynamic, requires scroll) |
| `doctor-appointment-cancel-button-{id}` | cancel-as-doctor button (dynamic, requires scroll) |
| `doctor-appointment-status-{id}` | status text per appointment (dynamic) |

### AppointmentDetailScreen (deep link target)
**Page marker:** `deep-link-screen`
Opened via `clinic://appointment/:id` URI scheme. Fetches single appointment by ID.

| testID | Element |
|--------|---------|
| `deep-link-screen` | root container (always present when screen is active) |
| `deep-link-loading` | loading indicator while fetching |
| `appointment-item-{id}` | appointment card (dynamic, same pattern as AppointmentsScreen) |
| `appointment-status-{id}` | status text on the card (dynamic) |
| `deep-link-not-found` | error state — 404 or any fetch error |
| `deep-link-back` | back button → navigates to My Appointments tab |

### QRScannerScreen
**Page marker:** `qr-scanner-screen`
**Access:** tapping `qr-scan-button` on AppointmentsScreen (My Visits tab). Navigates to AppointmentDetailScreen after a successful scan.

| testID | Element |
|--------|---------|
| `qr-scanner-screen` | root container |
| `qr-back-button` | back → AppointmentsScreen |
| `qr-camera-placeholder` | placeholder text (no real camera in test builds) |

**How tests simulate a scan:** tap `qr-scan-button` → wait for `qr-scanner-screen` → call `ADB.openDeepLink('clinic://appointment/{id}')` → App.tsx's Linking listener fires `handleQRResult` → navigates to AppointmentDetailScreen.

**QR test hook:** `EXPO_PUBLIC_TEST_QR_VALUE=clinic://appointment/123` — when baked at build time, `QRScannerScreen` immediately calls `onResult` on mount (same pattern as `EXPO_PUBLIC_TEST_VOICE_TEXT`). Tests prefer the ADB approach to avoid needing a special build.

---

### ClinicMapScreen
**Page marker:** `map-screen`
**Page object:** `ClinicMapPage` — `waitForScreen()`, `getAddressText()`, `isAddressVisible()`, `tapDirections()`, `isScreenVisible()`, `goBack()`
**Access:** tapping `map-button-{id}` on DoctorsScreen

| testID | Element |
|--------|---------|
| `map-screen` | root container |
| `map-back-button` | back → DoctorsScreen |
| `map-container` | MapView wrapper (present only when AIRMap native module is available) |
| `map-unavailable` | empty view shown when Maps SDK is unavailable on the device |
| `clinic-address-text` | doctor's clinic address string |
| `clinic-coords-text` | lat/lng coordinates string |
| `directions-button` | opens geo-intent (Google Maps / system maps app) |

**Notes:**
- Map availability checked once at mount via `NativeModules.AIRMap` — no Error Boundary, no runtime re-render on failure
- After tapping `directions-button`, the geo-intent may open an external app; use `driver.activateApp()` to return to clinic-mobile before asserting `map-screen`
- `clinic-address-text` and `clinic-coords-text` are always present regardless of map availability

### SymptomCheckerScreen
**Page marker:** `symptom-input`
**Page object:** `SymptomCheckerPage` — `submitSymptoms()`, `waitForResultOrError()`, `isResultVisible()`, `isErrorVisible()`
**Access:** only reachable via `tab-ai`, which is absent when `ENABLE_AI_RECOMMENDATION=false`

| testID | Element |
|--------|---------|
| `symptom-input` | symptom text field |
| `symptom-submit` | submit button |
| `symptom-loading` | AI request in progress |
| `symptom-result` | result container (visible on success) |
| `symptom-specialty` | recommended specialty |
| `symptom-reasoning` | AI reasoning text |
| `symptom-doctors-list` | filtered doctors list |
| `symptom-doctors-empty` | no doctors for specialty |
| `symptom-error` | error message — shown for `FEATURE_DISABLED`, `UNKNOWN_SPECIALTY`, or network failure |
| `voice-input-button` | mic button; tapping with `EXPO_PUBLIC_TEST_VOICE_TEXT` set injects that value instead of real mic |
| `voice-listening-indicator` | shown while Voice.start() is active |
| `voice-permission-error` | shown when RECORD_AUDIO denied |
| `ondevice-badge` | visible only when built with `EXPO_PUBLIC_DEVICE_AI_MODE=ondevice`; used as runtime signal in tests |
| `ai-disclosure-banner` | permanent AI disclosure notice — always visible on SymptomCheckerScreen; EU AI Act Art. 13 Transparency |
| `ai-browse-all-button` | visible inside `symptom-result`; allows patient to navigate to full doctors list ignoring AI recommendation; EU AI Act Art. 14 Human Oversight |

**`symptom-error` messages by errorCode:**

| errorCode | Message shown |
|-----------|--------------|
| `FEATURE_DISABLED` | "AI recommendations are temporarily unavailable. Please browse all doctors instead." |
| `UNKNOWN_SPECIALTY` | "Could not determine a specialty from these symptoms. Please try describing them differently." |
| anything else | "Something went wrong. Please try again." |

---

## Dynamic testID patterns

| Pattern | Usage |
|---------|-------|
| `doctor-item-{id}` | doctor card touchable, `id` = DB doctor record id |
| `doctor-name-{id}` | doctor name text, `id` = DB doctor record id |
| `doctor-specialty-{id}` | doctor specialty text, `id` = DB doctor record id |
| `appointment-cancel-button-{id}` | patient cancel, `id` = appointment id |
| `appointment-status-{id}` | appointment status text (AppointmentsScreen + AppointmentDetailScreen) |
| `appointment-item-{id}` | appointment card (AppointmentsScreen + AppointmentDetailScreen) |
| `doctor-appointment-confirm-button-{id}` | doctor confirm (scroll required) |
| `doctor-appointment-reject-button-{id}` | doctor reject (scroll required) |
| `doctor-appointment-complete-button-{id}` | doctor complete (scroll required) |
| `doctor-appointment-cancel-button-{id}` | doctor cancel (scroll required) |
| `doctor-appointment-status-{id}` | appointment status in doctor view |
| `map-button-{id}` | open ClinicMapScreen for this doctor (DoctorsScreen) |

---

## Navigation (tab bar)

Patient role: **Doctors** tab → **My Appointments** tab → **AI Check** tab *(AI Check only when `ENABLE_AI_RECOMMENDATION=true`)*
Doctor role: single **Appointments** screen

| testID | Tab |
|--------|-----|
| `tab-doctors` | Doctors (always visible) |
| `tab-appointments` | My Visits (always visible) |
| `tab-ai` | AI Check (conditional — absent when flag is OFF) |

`tab-ai` is not rendered when `ENABLE_AI_RECOMMENDATION=false`. Use `isExisting()` before `isDisplayed()`.

Tab navigation uses `driver.switchContext` is not needed — all tabs in same Native context.

---

## Seed accounts (same SUT)

| Email | Password | Role |
|-------|----------|------|
| `doctor@example.com` | `password` | doctor |
| `doctor2@example.com` | `password` | doctor |

Patient accounts created via `ApiClient` in `Before()` hook, deleted in `After()`.

---

## Environment flags

| Flag | Effect |
|------|--------|
| `ENABLE_AI_RECOMMENDATION=true` | enables symptom checker endpoint |
| `AI_MOCK_RESPONSE=true` | deterministic AI response, no API key needed |
| `LOKI_ENABLED=true` | enables observability tests |
| `CIRCUIT_BREAKER_THRESHOLD=2` | failures before circuit opens (default 3; override to 2 in test env) |
| `CIRCUIT_BREAKER_RECOVERY_MS=2000` | ms before half-open (default 30 000; override to 2000 in test env) |
| `ENABLE_DEBUG_ROUTES=true` | enables `/api/v1/debug/*` endpoints including `ai-circuit-control` |
| `PLATFORM=android` | default; selects `pages/android/` via factory |
| `PLATFORM=ios` | selects `pages/ios/` via factory |
| `EXPO_PUBLIC_TEST_QR_VALUE=clinic://appointment/{id}` | QR scanner immediately fires result on mount (baked at build time) |
| `EXPO_PUBLIC_TEST_BIOMETRIC=success\|fail\|unavailable` | controls biometric result in LoginScreen (baked at build time) |

---

## Locale testing

Tests that change the device locale use ADB helpers — no special APK build required.

| Helper | Command | Restore |
|--------|---------|---------|
| `ADB.setLocale('ar-EG')` | RTL layout tests (`@rtl`) | `ADB.resetLocale()` |
| `ADB.setLocale('de-DE')` | String overflow tests (`@string-overflow`) | `ADB.resetLocale()` |

**Pattern:** `Before` hook sets locale + force-stops + reopens app + `browser.pause(5000)` (React Native requires a restart to pick up locale). `After` hook calls `ADB.resetLocale()`. The `Given` step in the feature file is documentation-only (locale is already applied by the time it runs).

**Why restart is required:** React Native reads locale once at startup via the native bridge. `setprop persist.sys.locale` takes effect on the next launch, not on the running app.

---

## Deep link scheme

`clinic://appointment/{id}` — opens AppointmentDetailScreen for the given appointment ID.

Fire via ADB: `ADB.openDeepLink('clinic://appointment/123')` → wraps `am start -a android.intent.action.VIEW -d`.

Behaviour matrix:
| State | Result |
|-------|--------|
| Authenticated, valid ID | AppointmentDetailScreen with appointment card |
| Authenticated, invalid ID | AppointmentDetailScreen with `deep-link-not-found` |
| Unauthenticated | LoginScreen (deep link ID stored; after login → detail screen) |
