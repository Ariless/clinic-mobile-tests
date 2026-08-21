import { Given, Then, Before, After } from '@wdio/cucumber-framework'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'
import { ADB } from '../support/adb'

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

Before({ tags: '@rtl' }, async function () {
  ADB.setLocale('ar-EG')
  // restart so React Native picks up the RTL locale
  try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(5000)
})

After({ tags: '@rtl' }, function () {
  ADB.resetLocale()
})

// "And I am logged in as a patient" — reused from booking.steps.ts
// "When I select the first available doctor" — reused from booking.steps.ts

Given('the device locale is set to Arabic', function () {
  // locale is applied in the @rtl Before hook;
  // this step documents the precondition in the scenario for readability
})

Then(
  'Claude confirms the RTL layout is correct on the {string} screen',
  async function (screenName: string) {
    if (!process.env.ANTHROPIC_API_KEY) return 'pending'
    const screenshotPath = path.join(
      os.tmpdir(),
      `rtl-${screenName.replace(/\s+/g, '-')}-${Date.now()}.png`,
    )
    fs.writeFileSync(screenshotPath, Buffer.from(await driver.takeScreenshot(), 'base64'))
    const result = await Claude.evaluateRtlLayout(screenshotPath, screenName)
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    if (!result.pass) {
      throw new Error(
        `RTL layout issues on "${screenName}" screen:\n${result.issues.join('\n')}`,
      )
    }
  },
)
