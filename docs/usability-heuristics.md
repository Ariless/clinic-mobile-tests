# Usability Heuristics Audit — Clinic Mobile

**Framework:** Nielsen's 10 Usability Heuristics  
**Date:** 2026-05-29  
**Auditor:** Darya  
**Screens evaluated:** Login · Doctors list · Booking · My Appointments · AI Symptom Checker · Appointment Detail (deep link)

---

## Severity scale

| Rating | Meaning |
|--------|---------|
| 0 | Not a usability problem |
| 1 | Cosmetic — fix only if time available |
| 2 | Minor — low priority |
| 3 | Major — important, high priority |
| 4 | Catastrophe — must fix before release |

---

## H1 — Visibility of System Status

> The system should always keep users informed about what is going on.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Loading indicators present on all async operations (slots-loading, appointments-loading, deep-link-loading) | All | — |
| ✅ Booking confirmation message shown immediately after success | Booking | — |
| ✅ Offline banner appears when device loses network | Doctors, Appointments | — |
| ✅ Cancellation loading state shown on button ("Cancelling…") | Appointments | — |
| ⚠️ AI symptom checker shows no progress indicator while the Claude API call is in flight — button becomes unresponsive with no visual feedback | Symptom Checker | 2 |
| ⚠️ Appointment Detail screen (deep link): loading spinner appears but no timeout message if the server takes > 10s | Appointment Detail | 1 |

---

## H2 — Match Between System and the Real World

> Use words, phrases, and concepts familiar to the user.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Doctor specialties use patient-friendly names (General Practitioner, not ICD codes) | Doctors | — |
| ✅ Date/time slots formatted as "10:00 AM", not ISO timestamps | Booking | — |
| ⚠️ Status label `pending` — a patient expects "Awaiting confirmation", not a database state name | Appointments | 2 |
| ⚠️ Status label `confirmed` — acceptable, but "Appointment confirmed" with date would be clearer | Appointments | 1 |
| ⚠️ AI result screen shows "specialty" (technical field name) rather than "We suggest seeing a…" | Symptom Checker | 1 |

---

## H3 — User Control and Freedom

> Users often choose system functions by mistake and need a clearly marked "emergency exit".

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Back buttons present on all secondary screens | All | — |
| ✅ Cancel appointment button available on pending and confirmed appointments | Appointments | — |
| ❌ **No confirmation dialog before cancellation.** `onPress` fires the API call immediately — one mis-tap cancels a medical appointment with no undo. | Appointments | **3** |
| ⚠️ No way to modify a booking. Patients must cancel and rebook — losing the slot if someone else books it. | Appointments | 2 |
| ⚠️ After successful AI recommendation, "Browse all doctors" returns to list but loses the recommendation — no way to go back to result | Symptom Checker | 1 |

---

## H4 — Consistency and Standards

> Users should not have to wonder whether different words, situations, or actions mean the same thing.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Blue primary buttons consistent across all screens | All | — |
| ✅ Red destructive actions (Cancel appointment) consistent | Appointments | — |
| ✅ "← Back" navigation label consistent | All | — |
| ⚠️ "Scan QR" placed in screen header (top right) while other patient actions (Cancel) are inline in the list — inconsistent action placement | Appointments | 1 |
| ⚠️ Success messages: booking success uses a full-screen success state; cancellation success uses an inline text banner at top — two patterns for the same action type | Booking / Appointments | 1 |

---

## H5 — Error Prevention

> Even better than good error messages is a careful design that prevents problems from occurring.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Unavailable slots filtered from booking list — patient cannot select a taken slot | Booking | — |
| ✅ Login button disabled during loading — prevents double submission | Login | — |
| ❌ **No confirmation before cancellation** (also H3). A patient with fat-finger syndrome can cancel a hospital appointment with one tap. | Appointments | **3** |
| ⚠️ Symptom input accepts empty string — form submits with no text, triggers an unnecessary API call. AI-01 finding from ET Session 02. | Symptom Checker | 2 |
| ⚠️ No character limit shown on symptom input — submitting 1000+ characters is possible and may produce poor AI output | Symptom Checker | 1 |

---

## H6 — Recognition Rather than Recall

> Minimise the user's memory load. Make objects, actions, and options visible.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Doctor cards show name, specialty, and available slot count in one view | Doctors | — |
| ✅ Appointment cards show doctor name, type, and status without requiring navigation | Appointments | — |
| ✅ Booking confirmation screen shows doctor name — confirms who was booked | Booking | — |
| ⚠️ After cancellation, cancelled appointments remain in the list marked as "cancelled" — patients must remember which ones are active | Appointments | 1 |
| ⚠️ No doctor photo or distinguishing visual — patients choosing between 5 General Practitioners rely on names only | Doctors | 1 |

---

## H7 — Flexibility and Efficiency of Use

> Accelerators — unseen by novice users — may speed up the interaction for expert users.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Biometric login available for returning users — skips email/password entry | Login | — |
| ✅ AI Symptom Checker provides a shortcut to relevant doctor specialty | Symptom Checker | — |
| ✅ QR code scan shortcut to appointment detail | Appointments | — |
| ⚠️ **No search or filter for doctors.** With 3 seeded doctors this is acceptable; at production scale (20+ doctors across specialties) this becomes a major efficiency blocker. | Doctors | **2** |
| ⚠️ No way to filter appointments by status (pending / confirmed / cancelled). Cancelled appointments accumulate and obscure active ones. | Appointments | 2 |
| ⚠️ No "quick rebook" — after cancellation, patient must go to Doctors tab and start the full booking flow. | Appointments | 1 |

---

## H8 — Aesthetic and Minimalist Design

> Every extra unit of information competes with relevant information and diminishes their relative visibility.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Clean card-based layout with whitespace | All | — |
| ✅ No marketing copy or banners in the core booking flow | All | — |
| ⚠️ Status badge colours fail WCAG AA contrast (white text on amber, green, slate — 2.1–2.6:1). Badge communicates status visually but the text is hard to read. Documented as A11Y-01 in `accessibility-conformance.md`. | Appointments | 2 |
| ⚠️ AI disclosure banner (`ai-disclosure-banner`) is always visible on Symptom Checker, adding visual weight even when the patient has already read it | Symptom Checker | 1 |

---

## H9 — Help Users Recognize, Diagnose, and Recover from Errors

> Error messages should be expressed in plain language, precisely indicate the problem, and constructively suggest a solution.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Login error: "Invalid credentials. Please check your email and password." — plain language, actionable | Login | — |
| ✅ Network error during booking shows patient-friendly empathy message | Booking | — |
| ✅ Offline cancellation: "No connection" with explanation | Appointments | — |
| ✅ Biometric failure shows countdown: "2 attempts remaining" then "Please sign in with your password." | Login | — |
| ⚠️ Offline banner reads "You are offline" — does not suggest action ("Check your Wi-Fi connection") | Doctors, Appointments | 2 |
| ⚠️ Appointment Detail "not found" error (`deep-link-not-found`) shows generic message with no context — patient does not know if the appointment was cancelled, if the link is expired, or if there is a server error | Appointment Detail | 2 |

---

## H10 — Help and Documentation

> Even though it is better if the system can be used without documentation, it may be necessary to provide help.

| Finding | Screen | Severity |
|---------|--------|----------|
| ✅ Terms & Conditions and Privacy Policy accessible from Login | Login | — |
| ✅ AI disclosure banner explains that results are AI-generated (Art. 13 EU AI Act) | Symptom Checker | — |
| ⚠️ No onboarding or first-run tutorial — new patient is dropped directly onto the Doctors list with no explanation of the booking flow | Doctors | 2 |
| ⚠️ No in-app help or FAQ — if a patient does not understand why their appointment was "rejected", there is no guidance | Appointments | 1 |
| ⚠️ Empty Appointments list has no call-to-action explaining how to book | Appointments | 1 |

---

## Issues by severity

| ID | Severity | Heuristic | Issue | Screen |
|----|----------|-----------|-------|--------|
| UX-01 | 3 | H3 + H5 | No confirmation dialog before appointment cancellation | Appointments |
| UX-02 | 2 | H1 | No loading indicator during AI API call | Symptom Checker |
| UX-03 | 2 | H2 | Status label "pending" — should be "Awaiting Confirmation" | Appointments |
| UX-04 | 2 | H3 | No way to modify a booking without cancel + rebook | Appointments |
| UX-05 | 2 | H5 | Empty symptom input submits to AI (ET Session 02 — AI-01) | Symptom Checker |
| UX-06 | 2 | H7 | No search or filter for doctors list | Doctors |
| UX-07 | 2 | H7 | No filter for appointment status | Appointments |
| UX-08 | 2 | H8 | Status badge contrast fails WCAG AA (see A11Y-01) | Appointments |
| UX-09 | 2 | H9 | Offline banner gives no recovery action | Doctors, Appointments |
| UX-10 | 2 | H9 | "Appointment not found" gives no context about cause | Appointment Detail |
| UX-11 | 2 | H10 | No onboarding for new patients | Doctors |
| UX-12 | 1 | H2 | "specialty" field label — could be "We suggest seeing a…" | Symptom Checker |
| UX-13 | 1 | H4 | Inconsistent success message patterns (full-screen vs inline banner) | Booking / Appointments |
| UX-14 | 1 | H6 | No doctor photo for recognition | Doctors |

---

_Updated: 2026-05-29. Review trigger: any new screen, redesign, or user research finding._
