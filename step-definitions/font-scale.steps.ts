import { Given, Then, Before, After } from '@wdio/cucumber-framework'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'
import { ADB } from '../support/adb'

const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE ?? 'com.anonymous.clinicmobile'

Before({ tags: '@font-scale' }, async function () {
  ADB.setFontScale(2.0)
  // booking.steps.ts untagged Before already restarted the app once;
  // restart again so React Native picks up the new font scale
  try { ADB.forceStop(APP_PACKAGE) } catch { /* best-effort */ }
  try { ADB.openApp(APP_PACKAGE) } catch { /* best-effort */ }
  await browser.pause(5000)
})

After({ tags: '@font-scale' }, function () {
  ADB.resetFontScale()
})

// "And I am logged in as a patient" — reused from booking.steps.ts
// "And the patient is logged in on mobile and sees My Visits" — reused from cross-role.steps.ts
// "When I select the first available doctor" — reused from booking.steps.ts

Given('the device font scale is set to maximum', function () {
  // font scale is applied in the @font-scale Before hook;
  // this step documents the precondition in the scenario for readability
})

Then(
  'Claude finds no truncated or overlapping content on the {string} screen',
  async function (screenName: string) {
    if (!process.env.ANTHROPIC_API_KEY) return 'pending'
    const screenshotPath = path.join(
      os.tmpdir(),
      `font-scale-${screenName.replace(/\s+/g, '-')}-${Date.now()}.png`,
    )
    fs.writeFileSync(screenshotPath, Buffer.from(await driver.takeScreenshot(), 'base64'))
    const result = await Claude.evaluateFontScaleLayout(screenshotPath, screenName)
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    if (!result.pass) {
      throw new Error(
        `Font scale layout issues on "${screenName}" screen:\n${result.issues.join('\n')}`,
      )
    }
  },
)
