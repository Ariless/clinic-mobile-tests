import { Given, Then } from '@wdio/cucumber-framework'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'
import { ApiClient } from '../support/apiClient'

// "When I open My Visits" — reused from booking.steps.ts

Given('the patient has no appointments', async function () {
  const token = await ApiClient.loginAsPatient()
  const appointments = await ApiClient.getMyAppointments(token)
  const cancellable = appointments.filter(
    (a: { status: string }) => a.status === 'pending' || a.status === 'confirmed',
  )
  await Promise.allSettled(
    cancellable.map((a: { id: number }) => ApiClient.cancelAppointment(a.id, token)),
  )
})

Then(
  'Claude rates the {string} empty state guidance at least {int} out of 5',
  async function (screenName: string, minScore: number) {
    if (!process.env.ANTHROPIC_API_KEY) return 'pending'
    const screenshotPath = path.join(
      os.tmpdir(),
      `empty-state-${screenName.replace(/\s+/g, '-')}-${Date.now()}.png`,
    )
    fs.writeFileSync(screenshotPath, Buffer.from(await driver.takeScreenshot(), 'base64'))
    const result = await Claude.evaluateEmptyState(screenshotPath, screenName)
    this.attach(JSON.stringify(result, null, 2), 'application/json')
    if (result.score < minScore) {
      throw new Error(
        `Empty state guidance score ${result.score}/5 on "${screenName}" is below threshold ${minScore}/5.\nReason: ${result.reason}`,
      )
    }
  },
)
