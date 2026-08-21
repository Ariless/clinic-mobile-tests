import { Given, Then, Before, After } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ADB } from '../support/adb'
import { XCRun } from '../support/xcrun'
import { Claude } from '../support/claude'

const PLATFORM = process.env.PLATFORM ?? 'android'

function setLightMode(): void { PLATFORM === 'ios' ? XCRun.setLightMode() : ADB.setLightMode() }
function setDarkMode(): void  { PLATFORM === 'ios' ? XCRun.setDarkMode()  : ADB.setDarkMode()  }

Before({ tags: '@theming' }, function () {
  setLightMode()
})

After({ tags: '@theming' }, function () {
  setLightMode()
})

async function takeScreenshot(): Promise<string> {
  const base64 = await driver.takeScreenshot()
  const tmpPath = path.join(os.tmpdir(), `theming-${Date.now()}.png`)
  fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'))
  return tmpPath
}

Given('the device is in dark mode', async function () {
  setDarkMode()
  await driver.pause(1500)
})

// Parameterised so a single step covers login / doctors / booking / any screen name.
// The screen name is attached to the Allure report for triage clarity.
Then('Claude finds no readability issues on the {word} screen', async function (screen: string) {
  const screenshotPath = await takeScreenshot()
  const result = await Claude.evaluateReadability(screenshotPath)
  this.attach(JSON.stringify({ screen, ...result }, null, 2), 'application/json')
  expect(result.pass).toBe(true)
})
