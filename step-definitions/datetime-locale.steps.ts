import { Given, When, Then, After } from '@wdio/cucumber-framework'
import { ADB } from '../support/adb'
import { ApiClient } from '../support/apiClient'
import { DoctorsPage, BookingPage } from '../pages/factory'

// "And I am logged in as a patient" — reused from booking.steps.ts

// Asia/Tashkent = UTC+5 year-round (no DST) — reliable for deterministic offset assertions.
const TZ_UTC5 = 'Asia/Tashkent'
const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let firstSlotStartTimeUtc: string   // ISO from API
let displayedSlotTime: string       // text from screen

After({ tags: '@datetime-locale' }, async function () {
  ADB.resetLocale()
  ADB.resetTimezone()
})

// ── Given ────────────────────────────────────────────────────────────────────

// "Given the device locale is set to German" is in string-overflow.steps.ts — reused.
// For en-US we need a new step (different locale, same locale-step pattern).

Given('the device locale is set to en-US', async function () {
  ADB.setLocale('en-US')
  try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(5000)
})

Given('the device timezone is set to UTC+5', async function () {
  ADB.setTimezone(TZ_UTC5)
  try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(5000)
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I open the booking screen for the first doctor', async function () {
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()

  await doctorsPage.waitForDoctorList()

  // Capture the first available slot's UTC time from the API for later assertions
  const token = await ApiClient.loginAsPatient()
  const slots = await ApiClient.getAvailableSlots(1, token)
  if (slots.length > 0) firstSlotStartTimeUtc = slots[0].startTime

  await doctorsPage.selectFirstDoctorAndGetName()
  displayedSlotTime = await bookingPage.getFirstSlotDisplayedTime()
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the slot times are not in ISO format', function () {
  // ISO pattern: contains "T" followed by time and "Z" or "+offset"
  const isoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
  if (isoPattern.test(displayedSlotTime)) {
    throw new Error(`Slot time displayed in raw ISO format: "${displayedSlotTime}"`)
  }
})

Then('the slot times match the de-DE locale format', function () {
  if (!firstSlotStartTimeUtc) return
  const expected = new Intl.DateTimeFormat('de-DE', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(firstSlotStartTimeUtc))
  // Normalise whitespace — different Android versions may use narrow no-break spaces
  const normalise = (s: string) => s.replace(/\s+/g, ' ').trim()
  if (normalise(displayedSlotTime) !== normalise(expected)) {
    throw new Error(`Expected de-DE format "${expected}", got "${displayedSlotTime}"`)
  }
})

Then('the slot times match the en-US locale format', function () {
  if (!firstSlotStartTimeUtc) return
  const expected = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(firstSlotStartTimeUtc))
  const normalise = (s: string) => s.replace(/\s+/g, ' ').trim()
  if (normalise(displayedSlotTime) !== normalise(expected)) {
    throw new Error(`Expected en-US format "${expected}", got "${displayedSlotTime}"`)
  }
})

Then('the displayed slot time reflects the UTC+5 offset', function () {
  if (!firstSlotStartTimeUtc) return
  const expectedHour = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', hour12: false, timeZone: TZ_UTC5,
  }).format(new Date(firstSlotStartTimeUtc))
  // Assert the displayed time contains the expected hour (±1 for DST edge cases)
  if (!displayedSlotTime.includes(expectedHour.padStart(2, '0'))) {
    const utcHour = new Date(firstSlotStartTimeUtc).getUTCHours()
    throw new Error(
      `Timezone offset not applied: UTC hour=${utcHour}, expected local hour=${expectedHour}, displayed="${displayedSlotTime}"`,
    )
  }
})
