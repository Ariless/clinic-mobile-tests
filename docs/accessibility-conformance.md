# Accessibility Conformance Report — Clinic Mobile

**Standard:** WCAG 2.2, Levels A and AA  
**Product:** clinic-mobile (React Native, Expo, Android + iOS)  
**Date:** 2026-05-29  
**Tested by:** Darya (manual + Appium automation)

---

## Testing methodology

| Method | What it covers |
|--------|---------------|
| Appium + TalkBack enabled | content-desc on interactive elements, focus traversal (`#19`) |
| Appium touch target size | all clickable elements ≥ 44dp (`#108`) |
| Appium font scale 2.0 | text reflow, no truncation, no overlap (`#109`) |
| ADB Reduce Motion | no animation-only success indicators (`#110`) |
| ADB + Claude Vision RTL | layout mirroring under ar-EG locale (`#125`) |
| ADB orientation rotation | portrait ↔ landscape mid-flow (`#114`) |
| Claude Vision dark mode | readability under system dark theme (`#65`) |
| Code review | accessibilityRole, accessibilityLabel attributes in source |
| Not tested | contrast ratio (planned `#112a`), axe-core, VoiceOver (iOS) |

---

## Conformance table

Legend: ✅ Supported · ⚠️ Partially Supported · ❌ Not Supported · — Not Applicable · 🔲 Not Evaluated

### Principle 1 — Perceivable

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 1.1.1 Non-text Content | A | ✅ | All interactive images have `accessibilityLabel` (success icon, map button, biometric button). Decorative text chars (✓) use `accessibilityRole="image"` with label. |
| 1.2.1–1.2.5 Time-based Media | A/AA | — | No audio or video content. |
| 1.3.1 Info and Relationships | A | ⚠️ | `accessibilityRole` set on all buttons and links. Form inputs have `accessibilityLabel`. No explicit heading hierarchy — screen titles are styled `Text`, not native heading elements. |
| 1.3.2 Meaningful Sequence | A | ✅ | Linear top-to-bottom layout. RTL tested (`ar-EG`, `#125`) — layout mirrors correctly. |
| 1.3.3 Sensory Characteristics | A | ⚠️ | Status badges show text label ("confirmed", "cancelled") alongside color. Booking success uses text + icon, not icon alone (`#110`). AI recommendation result text-only. Not systematically audited across all states. |
| 1.3.4 Orientation | AA | ✅ | Portrait ↔ landscape rotation tested mid-booking and mid-doctors list. No content lost. (`#114`) |
| 1.3.5 Identify Input Purpose | AA | ⚠️ | Email input has `accessibilityLabel="Email address"`. RN does not support `textContentType` equivalent for autofill at the framework level — autofill relies on platform heuristics. |
| 1.4.1 Use of Color | A | ⚠️ | Status badges use color + text. Offline banner uses color + text. Appointment confirm/reject buttons distinguished by label not only color. Not fully audited: AI result specialty list uses color coding without confirmed text-only alternative. |
| 1.4.3 Contrast (Minimum) | AA | ❌ | **Known failure.** Primary button (`#3b82f6` blue on `#fff`) and button text (`#fff` on `#3b82f6`) — estimated contrast ~3.8:1, below 4.5:1 for normal text. `#64748b` secondary text on white — ~4.7:1, passes. Automated contrast check not yet implemented (`#112a`). |
| 1.4.4 Resize Text | AA | ✅ | Layout tested at font_scale 2.0. No text truncation, no overlap. Claude Vision confirms readability. (`#109`) |
| 1.4.5 Images of Text | AA | — | No images of text used. Labels are native text elements. |
| 1.4.10 Reflow | AA | ⚠️ | Orientation change tested. No horizontal scroll introduced. 320 CSS px equivalent width not explicitly tested. |
| 1.4.11 Non-text Contrast | AA | 🔲 | UI component boundaries (input borders, button outlines) not measured. Planned as part of `#112a`. |
| 1.4.12 Text Spacing | AA | 🔲 | RN text spacing override not tested. |
| 1.4.13 Content on Hover or Focus | AA | — | Mobile — no hover state. |

---

### Principle 2 — Operable

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 2.1.1 Keyboard | A | — | Mobile native app — keyboard in the WCAG sense (switch access, external BT keyboard) not tested. Touch navigation is the primary pointer. |
| 2.1.2 No Keyboard Trap | A | — | No modal traps identified in code review. WebView screen has explicit back button. |
| 2.4.1 Bypass Blocks | A | — | Single-screen navigation — no repeated block bypass needed. |
| 2.4.2 Page Titled | A | ✅ | Each screen has a visible title element (`login-title`, `booking-doctor-name`, etc.). |
| 2.4.3 Focus Order | A | ⚠️ | TalkBack focus traversal tested on login, doctors, booking screens (`#19`). AppointmentDetailScreen and QRScannerScreen not in TalkBack test scope. |
| 2.4.4 Link Purpose | A | ✅ | All `TouchableOpacity` buttons have descriptive `accessibilityLabel`. "Terms & Conditions" and "Privacy Policy" links have distinct labels. |
| 2.4.6 Headings and Labels | AA | ⚠️ | Form inputs labelled. Screen headers are visual only — no `accessibilityRole="header"` on screen titles. |
| 2.4.7 Focus Visible | AA | ⚠️ | TalkBack shows green focus ring on Android. No explicit `focusStyle` in RN components — relies on platform default. Not tested on iOS VoiceOver. |
| 2.4.11 Focus Not Obscured (Minimum) | AA | ⚠️ | Tab bar is fixed bottom — may obscure focused items when TalkBack scrolls. Not formally tested. |
| 2.5.1 Pointer Gestures | A | ✅ | All interactions are single-tap. No swipe-only actions. Scroll uses standard platform scroll. |
| 2.5.2 Pointer Cancellation | A | ✅ | React Native uses `onPress` (fires on pointer up). No `onPressIn`-only actions that would activate on down event. |
| 2.5.3 Label in Name | A | ✅ | Visible button text matches or is contained in `accessibilityLabel` (e.g. visible "Log in" → label "Log in"). Verified in TalkBack tests. |
| 2.5.4 Motion Actuation | A | ✅ | No shake-to-action, no device tilt interactions in any screen. |
| 2.5.7 Dragging Movements | AA | ✅ | No drag-required interactions. All actions are tap-based. (New in WCAG 2.2) |
| 2.5.8 Target Size (Minimum) | AA | ✅ | All clickable elements ≥ 44dp × 44dp verified via Appium getSize + density conversion (`#108`). (New in WCAG 2.2) |

---

### Principle 3 — Understandable

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 3.1.1 Language of Page | A | ⚠️ | App UI is English. No programmatic language declaration in RN — relies on device locale. Locale switching tested (`ar-EG`, `de-DE`). |
| 3.2.1 On Focus | A | ✅ | No context change triggered by focus alone. |
| 3.2.2 On Input | A | ✅ | No automatic navigation on text input. Form submission requires explicit button tap. |
| 3.3.1 Error Identification | A | ✅ | Login errors, booking errors, network errors all display descriptive text messages (empathy-tested in `#26`). |
| 3.3.2 Labels or Instructions | A | ✅ | Email and password fields have `accessibilityLabel`. Slot buttons include time in label. |
| 3.3.7 Redundant Entry | A | ✅ | No repeated data entry required within a flow. (New in WCAG 2.2) |
| 3.3.8 Accessible Authentication (Minimum) | AA | ✅ | Biometric login available as alternative to password. 3× failure → password fallback. Password is always visible as primary option. (`#49`) (New in WCAG 2.2) |

---

### Principle 4 — Robust

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 4.1.2 Name, Role, Value | A | ✅ | All interactive elements have `accessibilityRole` and `accessibilityLabel`. State changes (loading, error, success) reflected via visible text with `testID`. Dynamic elements (appointment cards) include ID in label. |
| 4.1.3 Status Messages | AA | ⚠️ | Error messages and success messages rendered as `Text` elements, visible to TalkBack. No explicit `accessibilityLiveRegion` for dynamic updates — status changes require focus to discover. |

---

## Known issues

| ID | Criterion | Severity | Description |
|----|-----------|----------|-------------|
| A11Y-01 | 1.4.3 | High | Primary button color `#3b82f6` on white background — contrast ~3.8:1 fails WCAG AA minimum 4.5:1 for normal text. Affects Login button, Book button, Cancel button. |
| A11Y-02 | 1.3.1 | Low | Screen titles (`<Text style={styles.title}>`) lack `accessibilityRole="header"`. TalkBack users cannot navigate by heading. |
| A11Y-03 | 4.1.3 | Low | No `accessibilityLiveRegion` on booking success or error messages. TalkBack users must move focus to discover state changes. |
| A11Y-04 | 2.4.3 | Low | TalkBack focus order not verified for AppointmentDetailScreen, QRScannerScreen, and ClinicMapScreen. |

---

## Coverage gaps (planned)

| Gap | Planned fix |
|-----|------------|
| Contrast ratio not measured | Automated pixel-sampling check `#112a` |
| iOS VoiceOver not tested | Requires macOS + Simulator; deferred (see `docs/platform-parity.md`) |
| `accessibilityLiveRegion` on status messages | SUT change required before retesting |
| Heading roles on screen titles | SUT change: add `accessibilityRole="header"` to title `Text` elements |

---

_Updated: 2026-05-29. Review trigger: any change to screen layout, color palette, or interactive elements._
