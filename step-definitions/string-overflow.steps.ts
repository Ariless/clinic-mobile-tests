import { Given, Then, Before, After } from '@wdio/cucumber-framework'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'
import { ADB } from '../support/adb'

// "And I am logged in as a patient"                    — reused from booking.steps.ts
// "When I select the first available doctor"           — reused from booking.steps.ts
// "When the patient navigates to the appointments tab" — reused from offline.steps.ts

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'
const LOCALE = 'de-DE'

Before({ tags: '@string-overflow' }, async function () {
  ADB.setLocale(LOCALE)
  try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(5000)
})

After({ tags: '@string-overflow' }, function () {
  ADB.resetLocale()
})

Given('the device locale is set to German', function () {
  // locale applied in @string-overflow Before hook; step documents the precondition
})

Then(
  'Claude finds no string overflow on the {string} screen',
  async function (screenName: string) {
    if (!process.env.ANTHROPIC_API_KEY) return 'pending'
    const screenshotPath = path.join(
      os.tmpdir(),
      `string-overflow-${screenName.replace(/\s+/g, '-')}-${Date.now()}.png`,
    )
    fs.writeFileSync(screenshotPath, Buffer.from(await driver.takeScreenshot(), 'base64'))
    const result = await Claude.evaluateStringOverflow(screenshotPath, screenName, LOCALE)
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    if (!result.pass) {
      throw new Error(
        `String overflow issues on "${screenName}" screen (${LOCALE}):\n${result.issues.join('\n')}`,
      )
    }
  },
)
