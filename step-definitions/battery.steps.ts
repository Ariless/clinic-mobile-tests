import { When, Then, Before } from '@wdio/cucumber-framework'
import { execSync } from 'child_process'
import { ADB } from '../support/adb'

const APP_PACKAGE = 'com.anonymous.clinicmobile'

Before({ tags: '@battery' }, function () {
  if (!ADB.isInstalled(APP_PACKAGE)) {
    return 'pending'
  }
})

// ── When ─────────────────────────────────────────────────────────────────────

When('the app is idle for {int} seconds', function (seconds: number) {
  execSync(`sleep ${seconds}`)
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the app holds no partial wake locks', function () {
  const count = ADB.getHeldWakeLockCount(APP_PACKAGE)
  if (count > 0) {
    const powerDump = execSync('adb shell dumpsys power', { encoding: 'utf-8' })
    const uid = ADB.getAppUid(APP_PACKAGE)
    const relevant = powerDump
      .split('\n')
      .filter(l => l.includes('PARTIAL_WAKE_LOCK') && l.includes(`HELD_BY_UID=${uid}`))
      .join('\n')
    this.attach(
      JSON.stringify({ packageName: APP_PACKAGE, uid, heldWakeLocks: relevant }),
      'application/json',
    )
  }
  expect(count).toBe(0)
})
