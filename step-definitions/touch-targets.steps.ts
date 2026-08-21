import { Then } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import { ADB } from '../support/adb'

const PLATFORM = process.env.PLATFORM ?? 'android'

// WCAG 2.2 SC 2.5.8 — minimum touch target: 44dp (Android) / 44pt (iOS).
// Android: getSize() returns px — convert via device density.
// iOS: getSize() returns logical points — no conversion needed.
Then('all interactive elements meet the 44dp minimum touch target', async function () {
  const failures: string[] = []

  if (PLATFORM === 'ios') {
    const clickables = $$('-ios predicate string:accessible == true AND enabled == true')
    const count = await clickables.length
    for (let i = 0; i < count; i++) {
      const size = await clickables[i].getSize()
      if (size.width < 44 || size.height < 44) {
        const label = (await clickables[i].getAttribute('label')) ?? `element[${i}]`
        failures.push(`${label}: ${size.width}×${size.height}pt`)
      }
    }
    this.attach(JSON.stringify({ minPt: 44, platform: 'ios', failures }, null, 2), 'application/json')
  } else {
    const density = ADB.getDisplayDensity()
    const clickables = $$('android=new UiSelector().clickable(true)')
    const count = await clickables.length
    for (let i = 0; i < count; i++) {
      const size = await clickables[i].getSize()
      // Convert px → dp before comparing: RN renders 44dp as floor(44 * density/160) px,
      // which can be 1px short of Math.round(44 * density/160). Comparing in dp avoids
      // false failures from sub-pixel rounding at non-standard densities (e.g. 420dpi).
      const wDp = Math.round(size.width * 160 / density)
      const hDp = Math.round(size.height * 160 / density)
      if (wDp < 44 || hDp < 44) {
        const resourceId = (await clickables[i].getAttribute('resource-id')) ?? `element[${i}]`
        failures.push(`${resourceId}: ${wDp}×${hDp}dp (${size.width}×${size.height}px)`)
      }
    }
    this.attach(JSON.stringify({ minDp: 44, density, failures }, null, 2), 'application/json')
  }

  expect(failures).toHaveLength(0)
})
