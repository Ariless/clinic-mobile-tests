import { When, Then, Before, After } from '@wdio/cucumber-framework'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Claude } from '../support/claude'
import { ApiClient } from '../support/apiClient'
import { DoctorsPage, BookingPage, AppointmentsPage } from '../pages/factory'

type JourneyStep = { name: string; imagePath: string }

// module-level state — reset in Before so scenarios are independent
const journeySteps: JourneyStep[] = []
let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let appointmentsPage: AppointmentsPage
let patientToken: string

Before({ tags: '@friction' }, async function () {
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  appointmentsPage = new AppointmentsPage()
  journeySteps.length = 0
  patientToken = await ApiClient.loginAsPatient()
})

After({ tags: '@friction' }, async function () {
  // cancel any pending appointment created during the flow so state is clean for next run
  if (!patientToken) return
  const appointments = await ApiClient.getMyAppointments(patientToken).catch(() => [])
  const pending = appointments.find((a: { status: string }) => a.status === 'pending')
  if (pending) {
    await ApiClient.cancelAppointment(pending.id, patientToken).catch(() => {})
  }
})

async function captureStep(name: string): Promise<void> {
  const imagePath = path.join(
    os.tmpdir(),
    `friction-${name.replace(/\s+/g, '-')}-${Date.now()}.png`,
  )
  fs.writeFileSync(imagePath, Buffer.from(await driver.takeScreenshot(), 'base64'))
  journeySteps.push({ name, imagePath })
}

// "Given I am logged in as a patient" — reused from booking.steps.ts

When('I capture screenshots through the full booking flow', async function () {
  // step 1: doctors list — the starting point every patient sees
  await doctorsPage.waitForDoctorList()
  await captureStep('Doctors list')

  // step 2: slot selection — after choosing a doctor
  await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.waitForVisible()
  await captureStep('Slot selection')

  // step 3: booking confirmation — after tapping a slot
  await bookingPage.bookFirstAvailableSlot()
  await bookingPage.waitForConfirmation()
  await captureStep('Booking confirmation')

  // step 4: My Visits — patient sees their new appointment
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
  await captureStep('My Visits — appointment list')
})

Then('no step in the journey has a friction score above {int} out of 5', async function (maxAllowed: number) {
  if (!process.env.ANTHROPIC_API_KEY) return 'pending'

  const report = await Claude.analyzeJourneyFriction(journeySteps)
  this.attach(JSON.stringify(report, null, 2), 'application/json')

  const highFriction = report.steps.filter(s => s.friction > maxAllowed)
  if (highFriction.length > 0) {
    const details = highFriction
      .map(s => `  "${s.name}" scored ${s.friction}/5 — ${s.reason}`)
      .join('\n')
    throw new Error(
      `${highFriction.length} step(s) exceed friction threshold ${maxAllowed}/5:\n${details}\n\nRecommendation: ${report.recommendation}`,
    )
  }
})
