# ET Session 01 — Network transitions during booking flow

**Charter:** Investigate mobile app behaviour during network state changes mid-booking to find failure modes not covered by automated chaos tests

**Tester:** Darya  
**Date:** 2026-05-29  
**Timebox:** 90 min  
**Duration:** 85 min

**Setup:**
- Branch: main
- Device: Android emulator API 33
- SUT: `npm run dev` (port 3000)
- Tools: ADB, Appium inspector (for element discovery), logcat

---

## Coverage notes

**Covered:**
- Login → Doctors → slot selection → confirm booking with wifi off/on at each stage
- Timing: wifi killed immediately after tap vs 500ms after tap
- Quick toggle: wifi off → on before response returns
- Retry behaviour: tap Book again after network error

**NOT covered:**
- iOS (different network stack — `cmd connectivity` unavailable via Appium, requires NLC)
- Background → foreground during network transition (covered in automated #6/#16)
- Multiple simultaneous bookings under network instability

---

## Findings

**BUG: NET-01** — When wifi is killed 200–400ms after tapping "Book" (after request dispatched, before response), the error message shown is generic "Something went wrong" rather than the network-specific empathy message. The timeout handler fires but the `isNetworkErr` check in BookingScreen doesn't recognise mid-flight abort as a network error. **Severity 2**

**OBS: NET-02** — Booking loading indicator stays visible for the full 10s timeout even after wifi is restored. App doesn't abort and retry — it waits for the original request to time out. Users may re-tap and create a duplicate booking attempt.

**OBS: NET-03** — After a failed booking (network error), the slot remains selected in the list (highlighted). On retry with wifi restored, the same slot is re-attempted correctly. Positive finding — state not corrupted.

**IDEA: NET-04** — Test abort-and-retry pattern: wifi killed mid-request → wifi restored → tap again before timeout expires. Does idempotency key prevent duplicate booking? This is not covered in automated idempotency test (#39) which only tests retry after full failure.

---

## Debrief

The timing window between request dispatch and response is a gap in automated coverage — chaos tests (`@chaos`) disconnect wifi before the tap, not during flight. NET-01 reveals that the empathy error message logic has a hidden assumption: "network error = request never sent". The booking-in-flight case produces a different error shape.
