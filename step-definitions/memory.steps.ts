import { Given, When, Then, Before } from '@wdio/cucumber-framework'
import { ADB } from '../support/adb'
import { DoctorsPage, BookingPage, AppointmentsPage } from '../pages/factory'

const APP_PACKAGE = 'com.anonymous.clinicmobile'

let doctorsPage: DoctorsPage
let bookingPage: BookingPage
let appointmentsPage: AppointmentsPage

let heapBaselineKb: number
let heapSamples: number[]

Before(function () {
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
  appointmentsPage = new AppointmentsPage()
  heapBaselineKb = 0
  heapSamples = []
})

async function oneNavigationCycle(): Promise<void> {
  await doctorsPage.selectFirstDoctorAndGetName()
  await bookingPage.goBack()
  await doctorsPage.switchToMyVisits()
  await appointmentsPage.waitForList()
  await doctorsPage.switchToDoctors()
  await doctorsPage.waitForDoctorList()
}

// ── Given ────────────────────────────────────────────────────────────────────

Given('the app heap baseline is recorded', function () {
  heapBaselineKb = ADB.parseTotalPss(APP_PACKAGE)
})

// ── When ─────────────────────────────────────────────────────────────────────

When('I navigate the booking flow {int} times', async function (cycles: number) {
  for (let i = 0; i < cycles; i++) {
    await oneNavigationCycle()
  }
})

When('I navigate the booking flow {int} times and sample heap every {int} cycles', async function (cycles: number, interval: number) {
  heapSamples = []
  for (let i = 0; i < cycles; i++) {
    await oneNavigationCycle()
    if ((i + 1) % interval === 0) {
      heapSamples.push(ADB.parseTotalPss(APP_PACKAGE))
    }
  }
})

// ── Then ─────────────────────────────────────────────────────────────────────

Then('total PSS growth is under {int} MB', async function (maxGrowthMb: number) {
  const finalPssKb = ADB.parseTotalPss(APP_PACKAGE)
  const growthKb = finalPssKb - heapBaselineKb
  const toMb = (kb: number) => Math.round(kb / 1024 * 10) / 10

  this.attach(
    JSON.stringify({
      baselineMb: toMb(heapBaselineKb),
      finalMb: toMb(finalPssKb),
      growthMb: toMb(growthKb),
      thresholdMb: maxGrowthMb,
    }, null, 2),
    'application/json',
  )

  if (toMb(growthKb) > maxGrowthMb) {
    throw new Error(
      `Heap grew by ${toMb(growthKb)} MB after navigation loop (threshold: ${maxGrowthMb} MB) — unreleased event listeners or subscriptions likely cause`,
    )
  }
})

Then('no heap sampling window grew by more than {int} MB', async function (maxWindowMb: number) {
  if (heapSamples.length < 2) {
    throw new Error(`Expected at least 2 heap samples, got ${heapSamples.length}`)
  }

  const toMb = (kb: number) => Math.round(kb / 1024 * 10) / 10
  const samplesMb = heapSamples.map(toMb)

  this.attach(
    JSON.stringify({ samplesMb, thresholdMb: maxWindowMb }, null, 2),
    'application/json',
  )

  for (let i = 1; i < heapSamples.length; i++) {
    const deltaMb = toMb(heapSamples[i] - heapSamples[i - 1])
    if (deltaMb > maxWindowMb) {
      throw new Error(
        `Heap grew by ${deltaMb} MB between sampling windows ${i} and ${i + 1} (threshold: ${maxWindowMb} MB) — linear growth indicates a leak. Samples (MB): [${samplesMb.join(', ')}]`,
      )
    }
  }
})
