import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { ADB } from '../support/adb'
import { ApiClient } from '../support/apiClient'
import { BookingPage } from '../pages/factory'

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

// Maps friendly permission names to Android permission strings
const PERMISSIONS: Record<string, string[]> = {
  calendar: ['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR'],
  microphone: ['android.permission.RECORD_AUDIO'],
}

let bookingPage: BookingPage
let patientToken: string

Before({ tags: '@permissions' }, async function () {
  bookingPage = new BookingPage()
  patientToken = await ApiClient.loginAsPatient()
})

After({ tags: '@permissions' }, async function () {
  // restore all permissions so subsequent tests are not affected
  for (const perms of Object.values(PERMISSIONS)) {
    for (const p of perms) {
      try { ADB.grantPermission(APP_PACKAGE, p) } catch { /* best-effort */ }
    }
  }
  // cancel any appointment created during the scenario
  const appts = await ApiClient.getMyAppointments(patientToken).catch(() => [])
  const pending = appts.find((a: { status: string }) => a.status === 'pending')
  if (pending) {
    await ApiClient.cancelAppointment(pending.id, patientToken).catch(() => {})
  }
})

// "Given I am logged in as a patient" — reused from booking.steps.ts
// "Given I am logged in as a patient on the symptom checker tab" — reused from symptom-checker.steps.ts
// "When I select the first available doctor" — reused from booking.steps.ts
// "When I book the first available slot" — reused from booking.steps.ts
// "When I tap {string}" — reused from calendar.steps.ts
// "Then I see {string} confirmation" — reused from calendar.steps.ts
// "When I tap the voice input button without granting mic permission" — reused from voice-ai.steps.ts
// "Then I see the voice permission error message" — reused from voice-ai.steps.ts

Given('{string} permission is revoked', function (permissionName: string) {
  const perms = PERMISSIONS[permissionName.toLowerCase()]
  if (!perms) throw new Error(`Unknown permission name: "${permissionName}". Use: ${Object.keys(PERMISSIONS).join(', ')}`)
  for (const p of perms) {
    ADB.revokePermission(APP_PACKAGE, p)
  }
})

When('{string} permission is re-granted at runtime', function (permissionName: string) {
  // grants at runtime without restarting the app — tests Android 11+ behaviour
  const perms = PERMISSIONS[permissionName.toLowerCase()]
  if (!perms) throw new Error(`Unknown permission name: "${permissionName}". Use: ${Object.keys(PERMISSIONS).join(', ')}`)
  for (const p of perms) {
    ADB.grantPermission(APP_PACKAGE, p)
  }
})

Then('the calendar shows a permission denied response', async function () {
  const text = await bookingPage.getCalendarStatusText()
  if (!text) {
    throw new Error('No calendar status message visible — app may have crashed or the permission state was not detected')
  }
  if (text.toLowerCase().includes('added to calendar')) {
    throw new Error(`Expected a denied/error response but calendar was added successfully: "${text}". Was the permission actually revoked?`)
  }
})
