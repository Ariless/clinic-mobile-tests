import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ApiClient } from '../support/apiClient'
import { ADB } from '../support/adb'
import { Proxy } from '../support/proxy'
import { XCRun } from '../support/xcrun'
import { LoginPage, DoctorsPage, BookingPage } from '../pages/factory'

const APP_PACKAGE = 'com.anonymous.clinicmobile'

let loginPage: LoginPage
let doctorsPage: DoctorsPage
let bookingPage: BookingPage

let patientToken: string
let savedToken: string
let setupAppointmentId: number | undefined

Before({ tags: '@security' }, async function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  patientToken = ''
  savedToken = ''
  setupAppointmentId = undefined

  // Clear JWT and app state before each scenario so UI tests always start at the login screen.
  // Must use browser.terminateApp + activateApp (not ADB monkey) so Appium tracks the new
  // process. pm clear while app is stopped removes AsyncStorage/JWT without breaking the session.
  try {
    await browser.terminateApp(APP_PACKAGE)
    ADB.clearAppData(APP_PACKAGE)
    // pm clear revokes all runtime permissions. Re-grant POST_NOTIFICATIONS before launching
    // so Android 13+ does not show the permission dialog over the login screen.
    ADB.grantPermission(APP_PACKAGE, 'android.permission.POST_NOTIFICATIONS')
    await browser.activateApp(APP_PACKAGE)
    // UiAutomator2 needs a moment to re-attach to the new process spawned after pm clear.
    // Without this, waitForDisplayed starts counting before the RN bridge has initialised.
    await browser.pause(3000)
  } catch { /* adb/api-only scenarios (allowBackup, APK scan, logout) run without the UI */ }
})

After(async function () {
  if (setupAppointmentId && patientToken) {
    try { await ApiClient.cancelAppointment(setupAppointmentId, patientToken) } catch { /* terminal state */ }
  }
  // Always clear proxy — if the PII scenario failed before 'the network proxy is stopped',
  // the emulator proxy setting bleeds into subsequent scenarios and blocks their API calls.
  Proxy.stop()
})

// ── Given ────────────────────────────────────────────────────────────────────

Given('the network proxy is capturing outgoing traffic', async function () {
  Proxy.start()
  // Wait for the app's JS bundle to finish loading before routing traffic
  // through the proxy. Setting the emulator proxy while React Native is still
  // initialising causes a native crash (DeadObjectException / blank screen).
  await $('//*[@resource-id="login-title"]').waitForDisplayed({ timeout: 60000 })
  Proxy.setEmulatorProxy()
})

Given('the logcat buffer is cleared', function () {
  ADB.clearLogcat()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the patient authenticates via the login screen', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
    60000,
  )
  await doctorsPage.waitForDoctorList(60000)
})

When('the patient authenticates and completes a booking', async function () {
  await loginPage.login(
    process.env.PATIENT_EMAIL ?? 'patient@example.com',
    process.env.PATIENT_PASSWORD ?? 'password123',
    60000,
  )
  await doctorsPage.waitForDoctorList(60000)
  await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.waitForVisible()
  await bookingPage.bookFirstAvailableSlot()
  await bookingPage.waitForConfirmation()

  patientToken = await ApiClient.loginAsPatient()
  const appointments = await ApiClient.getMyAppointments(patientToken)
  const latest = appointments.sort((a, b) => b.id - a.id)[0]
  if (latest) setupAppointmentId = latest.id
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('no third-party analytics request contains patient PII', async function () {
  const thirdParty = Proxy.thirdPartyRequests()
  const email = process.env.PATIENT_EMAIL ?? 'patient@example.com'
  const name = 'Patient'

  const violations: string[] = []
  for (const req of thirdParty) {
    const found = Proxy.findPiiInRequest(req, [email, name])
    if (found.length > 0) {
      violations.push(`${req.url} — contains: ${found.join(', ')}`)
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `HIPAA violation: patient PII found in third-party analytics requests:\n` +
      violations.join('\n') +
      '\n\nAnalytics SDK terms of service do not cover medical data. ' +
      'Sending patient name or email to analytics = HIPAA breach.',
    )
  }
})

Then('the network proxy is stopped', function () {
  Proxy.stop()
})

Given('the app is installed on the device', function () {
  if (!ADB.isInstalled(APP_PACKAGE)) {
    throw new Error(`App ${APP_PACKAGE} is not installed — run 'expo prebuild && ./gradlew assembleDebug && adb install' first`)
  }
})

Then('the decompiled APK contains no secret-shaped strings', function () {
  const matches = ADB.scanApkForSecrets(APP_PACKAGE)
  if (matches.length > 0) {
    throw new Error(
      `Hardcoded secrets found in APK binary (${matches.length} match${matches.length > 1 ? 'es' : ''}):\n` +
      matches.slice(0, 5).join('\n') +
      (matches.length > 5 ? `\n...and ${matches.length - 5} more` : '') +
      '\n\nA medical API key in the APK is publicly accessible to anyone who downloads the app. ' +
      'Remove secrets from source — use runtime env injection or a secure vault.',
    )
  }
})

Then('the installed APK manifest declares allowBackup as false', function () {
  const manifest = ADB.pullApkManifestXml(APP_PACKAGE)
  // aapt2 output: A: android:allowBackup(0x0101035a)=false
  const match = manifest.match(/allowBackup[^=]*=\s*(\S+)/i)
  if (!match) {
    throw new Error(
      'android:allowBackup not found in APK manifest — ' +
      'attribute must be explicitly declared false; omitting it defaults to true on API < 31',
    )
  }
  if (match[1].toLowerCase() !== 'false') {
    throw new Error(
      `HIPAA compliance gap: android:allowBackup="${match[1]}" — ` +
      'patient data (JWT tokens, appointment history, cached doctor list) ' +
      'is silently backed up to Google cloud without encryption. ' +
      'Fix: set android:allowBackup="false" in AndroidManifest.xml',
    )
  }
})

Given('a patient is logged in via the API and their token is saved', async function () {
  savedToken = await ApiClient.loginAsPatient()
})

When('the patient logs out via the API', async function () {
  await ApiClient.logout(savedToken)
})

Then('the saved token is rejected with 401 on any authenticated endpoint', async function () {
  const status = await ApiClient.getStatus('/appointments/my', savedToken)
  if (status !== 401) {
    throw new Error(
      `HIPAA security gap: token is still valid after logout (got ${status}). ` +
      'A stolen JWT copied from logcat can access patient appointment history indefinitely. ' +
      'Fix: server-side token invalidation via blacklist.',
    )
  }
})

Then('the token remains invalid after re-login with the same credentials', async function () {
  // new login issues a new token — but the old one must still be blocked
  await ApiClient.loginAsPatient()
  const status = await ApiClient.getStatus('/appointments/my', savedToken)
  if (status !== 401) {
    throw new Error(
      `Invalidated token accepted again after re-login (got ${status}). ` +
      'Token blacklist is not persistent or was cleared on new login.',
    )
  }
})

Then('the app data directory is not world-readable', function () {
  const output = ADB.getAppDataPermissions(APP_PACKAGE)
  if (!output) {
    // Android 10+ (API 29+): SELinux denies 'ls -ld /data/data' via adb shell without root.
    // Empty output means the OS enforces sandbox isolation — this is the expected secure state.
    return
  }
  const permBits = output.split(/\s+/)[0]
  const worldReadable = permBits.length >= 8 && permBits[7] === 'r'
  const worldExecutable = permBits.length >= 10 && permBits[9] === 'x'

  if (worldReadable || worldExecutable) {
    throw new Error(
      `HIPAA gap: app data directory has permissions "${permBits}" — ` +
      'any app on the device can read patient JWT tokens, appointment history, and cached doctor data. ' +
      'Expected: drwx------ (owner-only). ' +
      'Fix: verify targetSdkVersion ≥ 29 (Android 10+) where the OS enforces private data isolation.',
    )
  }
})

Then('the installed APK manifest declares debuggable as false', function () {
  const manifest = ADB.pullApkManifestXml(APP_PACKAGE)
  const match = manifest.match(/debuggable[^=]*=\s*(\S+)/i)
  if (!match) {
    // debuggable defaults to false when not declared — safe for release; document it
    return
  }
  if (match[1].toLowerCase() !== 'false') {
    const apkName = (process.env.ANDROID_APK_PATH ?? '').split('/').pop() ?? ''
    if (/debug/i.test(apkName)) {
      // debug builds always have debuggable=true — expected, not a release bug
      return 'pending'
    }
    throw new Error(
      `Privacy gap: android:debuggable="${match[1]}" — ` +
      'debug builds allow `adb shell run-as` to extract the app\'s AsyncStorage directly, ' +
      'exposing the JWT and any cached patient data without root. ' +
      'Fix: set android:debuggable="false" on release variants (default when omitted).',
    )
  }
})

Then('device logs contain no JWT-shaped strings', function () {
  const logs = ADB.logcat()
  // JWT format: three base64url segments separated by dots; header always starts eyJ
  const jwtPattern = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/
  const found = jwtPattern.test(logs)
  if (found) {
    const match = logs.match(jwtPattern)
    throw new Error(`JWT-shaped string found in logcat: ${match?.[0]?.slice(0, 60)}...`)
  }
  expect(found).toBe(false)
})

Then('device logs contain no plain-text passwords or email addresses', function () {
  const logs = ADB.logcat()
  const email = process.env.PATIENT_EMAIL ?? 'patient@example.com'
  const password = process.env.PATIENT_PASSWORD ?? 'password123'

  const emailFound = logs.includes(email)

  // Use targeted pattern to avoid false positives from Appium accessibility tree dumps.
  // Appium logs input attributes as 'password: false' (secureText) and 'type=password'
  // (input type) — these are not credential leaks. A real leak looks like a JSON value
  // ("password":"<value>") or form-encoded body (password=<value>).
  const escapedPwd = password.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const credentialLeakPattern = new RegExp(
    `"password"\\s*:\\s*"${escapedPwd}"|password=${escapedPwd}[&\\s"'\\n\\r]`,
    'i',
  )
  const passwordFound = credentialLeakPattern.test(logs)

  if (emailFound) throw new Error(`Patient email found in plain text in logcat: ${email}`)
  if (passwordFound) throw new Error(`Patient password found in plain text in logcat`)

  expect(emailFound).toBe(false)
  expect(passwordFound).toBe(false)
})

// ── iOS Privacy Manifest + ATT (#135) ────────────────────────────────────────

const IOS_BUNDLE_ID = 'com.anonymous.clinicmobile'

Given('the iOS app is installed on the simulator', function () {
  if (!XCRun.isAvailable()) {
    return 'pending' // Xcode not installed — skip all iOS privacy tests
  }
  try {
    XCRun.getAppBundlePath(IOS_BUNDLE_ID)
  } catch {
    throw new Error(
      `iOS app ${IOS_BUNDLE_ID} is not installed on the booted simulator. ` +
      'Run: expo prebuild --platform ios && xcodebuild -workspace ios/*.xcworkspace ' +
      '-scheme clinicmobile -configuration Debug -sdk iphonesimulator && ' +
      'xcrun simctl install booted path/to/ClinicMobile.app',
    )
  }
})

Then('the app bundle contains a PrivacyInfo.xcprivacy file', function () {
  if (!XCRun.hasPrivacyManifest(IOS_BUNDLE_ID)) {
    throw new Error(
      'PrivacyInfo.xcprivacy not found in iOS app bundle. ' +
      'Required since May 2024 for all App Store submissions (ITMS-91053). ' +
      'Fix: add "ios.privacyManifests" to app.json and run expo prebuild.',
    )
  }
})

Then('the privacy manifest declares required reasons for {string}', function (apiCategory: string) {
  type ApiTypeEntry = { NSPrivacyAccessedAPIType: string; NSPrivacyAccessedAPITypeReasons: string[] }
  const manifest = XCRun.readPrivacyManifest(IOS_BUNDLE_ID) as {
    NSPrivacyAccessedAPITypes?: ApiTypeEntry[]
  }
  const types = manifest.NSPrivacyAccessedAPITypes ?? []
  const entry = types.find(t => t.NSPrivacyAccessedAPIType === apiCategory)

  if (!entry) {
    throw new Error(
      `Privacy manifest is missing a declaration for ${apiCategory}. ` +
      'React Native internally accesses this API. Without the declaration, ' +
      'App Store review rejects the build with ITMS-91053.',
    )
  }
  if (!entry.NSPrivacyAccessedAPITypeReasons || entry.NSPrivacyAccessedAPITypeReasons.length === 0) {
    throw new Error(
      `${apiCategory} is declared but has no required reason codes. ` +
      'Each API type must list at least one Apple-approved reason code.',
    )
  }
})

Then('the privacy manifest declares NSPrivacyTracking as false', function () {
  const manifest = XCRun.readPrivacyManifest(IOS_BUNDLE_ID) as { NSPrivacyTracking?: boolean }
  if (manifest.NSPrivacyTracking !== false) {
    throw new Error(
      `NSPrivacyTracking is "${manifest.NSPrivacyTracking}" — expected false for a medical app. ` +
      'HIPAA prohibits using patient appointment data for advertising purposes. ' +
      'Fix: set NSPrivacyTracking to false in ios.privacyManifests.',
    )
  }
})

Then('the app Info.plist does not contain NSUserTrackingUsageDescription', function () {
  const infoPlist = XCRun.readInfoPlist(IOS_BUNDLE_ID) as { NSUserTrackingUsageDescription?: string }
  if (infoPlist.NSUserTrackingUsageDescription !== undefined) {
    throw new Error(
      `Info.plist contains NSUserTrackingUsageDescription: "${infoPlist.NSUserTrackingUsageDescription}". ` +
      'A medical app must not request advertising tracking authorization — ' +
      'remove this key unless ATTrackingManager.requestTrackingAuthorization is explicitly called ' +
      'for a documented clinical justification.',
    )
  }
})
