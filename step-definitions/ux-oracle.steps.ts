import { Then } from '@wdio/cucumber-framework'
import { expect } from 'expect-webdriverio'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'

// ai.steps.ts Before hook already skips all scenarios when ANTHROPIC_API_KEY is absent —
// no duplicate skip guard needed here.

async function takeScreenshot(): Promise<string> {
  const base64 = await driver.takeScreenshot()
  const tmpPath = path.join(os.tmpdir(), `ux-oracle-${Date.now()}.png`)
  fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'))
  return tmpPath
}

Then(
  'the UX oracle rates the booking confirmation at least {int} out of 5 for patient completeness',
  async function (minScore: number) {
    const screenshotPath = await takeScreenshot()
    const result = await Claude.evaluateUX(
      screenshotPath,
      'This is a mobile medical booking confirmation screen. ' +
        'Rate 1–5 how completely it gives a patient everything they need before their appointment. ' +
        'Consider: is the doctor name and specialty visible? Is the date and time of the appointment clear? ' +
        'Does the patient know what happens next (e.g. appointment is pending, doctor will confirm)? ' +
        'Is there a way to cancel or reschedule if needed?',
    )
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    expect(result.score).toBeGreaterThanOrEqual(minScore)
  },
)

Then(
  'the UX oracle rates the appointments list at least {int} out of 5 for patient actionability',
  async function (minScore: number) {
    const screenshotPath = await takeScreenshot()
    const result = await Claude.evaluateUX(
      screenshotPath,
      'This is a mobile medical appointments list screen. ' +
        'Rate 1–5 how actionable it is for a patient managing their appointments. ' +
        'Consider: can the patient immediately see each appointment\'s status (pending/confirmed/cancelled)? ' +
        'Are doctor name and appointment date/time clearly visible at a glance? ' +
        'Can the patient cancel or take other action without confusion?',
    )
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    expect(result.score).toBeGreaterThanOrEqual(minScore)
  },
)

Then(
  'the UX oracle rates the doctors list at least {int} out of 5 for informed decision support',
  async function (minScore: number) {
    const screenshotPath = await takeScreenshot()
    const result = await Claude.evaluateUX(
      screenshotPath,
      'This is a mobile medical app doctor selection screen. ' +
        'Rate 1–5 how well it supports informed decision-making for a patient choosing a doctor. ' +
        'Consider: can the patient understand each doctor\'s specialty? ' +
        'Is there enough information to distinguish between doctors? ' +
        'Does the patient know what they are selecting before they tap to book?',
    )
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    expect(result.score).toBeGreaterThanOrEqual(minScore)
  },
)
