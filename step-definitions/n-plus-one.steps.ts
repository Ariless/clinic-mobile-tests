import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { execSync } from 'child_process'
import { Proxy } from '../support/proxy'
import { ADB } from '../support/adb'

const APP_PACKAGE = 'com.anonymous.clinicmobile'

Before({ tags: '@n-plus-one' }, function () {
  Proxy.stop()
})

After({ tags: '@n-plus-one' }, function () {
  Proxy.stop()
})

// ── Given ────────────────────────────────────────────────────────────────────

// Variant of 'the network proxy is capturing outgoing traffic' for use when
// the app is already fully loaded — skips the login-title wait.
Given('the network proxy is capturing outgoing traffic after app load', function () {
  Proxy.start()
  Proxy.setEmulatorProxy()
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I send the app to background and bring it to foreground', function () {
  ADB.pressHome()
  execSync('sleep 1')
  ADB.openApp(APP_PACKAGE)
  // Allow AppState 'active' event to fire and the triggered fetch to complete.
  // Requests to localhost:3000 finish well within 3 s on a local emulator.
  execSync('sleep 3')
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('exactly {int} request was made to GET {string}', function (count: number, urlFragment: string) {
  const captured = Proxy.capturedRequests()
  const actual = captured.filter(r => r.method === 'GET' && r.url.includes(urlFragment)).length
  expect(actual).toBe(count)
})
