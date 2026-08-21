import { Then } from '@wdio/cucumber-framework'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'

// Screen-specific context injected into the Claude prompt.
// Each value explains what the screen contains so Claude can focus its evaluation.
const SCREEN_CONTEXTS: Record<string, string> = {
  'doctors list': 'The screen shows a list of available doctors. Focus on: doctor card labels, specialty text, any CTA buttons, navigation labels.',
  'booking': 'The screen shows available appointment time slots and a booking action. Focus on: slot time/date labels, the booking button text, any confirmation or status messages.',
  'my appointments': "The screen shows the patient's list of appointments. Focus on: status badge labels (Pending/Confirmed/Cancelled), appointment detail text, action button labels, and any empty-state message.",
  'login error': 'The screen shows the login form with a visible error message. Focus entirely on that error message — is it written for a patient or does it expose a technical code?',
}

// "Given I am logged in as a patient" — reused from booking.steps.ts
// "When I select the first available doctor" — reused from booking.steps.ts
// "Given the patient is logged in on mobile and sees My Visits" — reused from cross-role.steps.ts
// "Given the app is at the login screen" — reused from chaos.steps.ts
// "When I enter wrong credentials on the login screen" — reused from empathy.steps.ts

Then(
  'Claude rates the {string} screen microcopy at least {int} out of 5',
  async function (screenName: string, minScore: number) {
    if (!process.env.ANTHROPIC_API_KEY) return 'pending'

    const screenshotPath = path.join(
      os.tmpdir(),
      `microcopy-${screenName.replace(/\s+/g, '-')}-${Date.now()}.png`,
    )
    const base64 = await driver.takeScreenshot()
    fs.writeFileSync(screenshotPath, Buffer.from(base64, 'base64'))

    const context = SCREEN_CONTEXTS[screenName] ?? `This is the ${screenName} screen of a medical booking app.`
    const result = await Claude.evaluateMicrocopy(screenshotPath, context)
    this.attach(JSON.stringify(result, null, 2), 'application/json')

    if (result.score < minScore) {
      throw new Error(
        `Microcopy score ${result.score}/5 on "${screenName}" screen is below threshold ${minScore}/5.\nIssues: ${result.issues.join('; ')}`,
      )
    }
  },
)
