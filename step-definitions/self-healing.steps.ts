import { When, Then, Before } from '@cucumber/cucumber'
import { LoginPage, DoctorsPage, BookingPage } from '../pages/factory'
import { selfHealingTap } from '../support/selfHeal'

let loginPage: InstanceType<typeof LoginPage>
let doctorsPage: InstanceType<typeof DoctorsPage>
let bookingPage: InstanceType<typeof BookingPage>

Before({ tags: '@self-healing' }, function () {
  loginPage = new LoginPage()
  doctorsPage = new DoctorsPage()
  bookingPage = new BookingPage()
})

// Simulates a renamed testID: 'doctor-item-STALE' does not exist in the app.
// selfHealingTap falls back to Claude Vision which finds the first doctor card visually.
When('I tap the first doctor card using a stale testID', async function () {
  await selfHealingTap(
    'doctor-item-STALE',
    'the first doctor card in the list, showing a doctor name and medical specialty'
  )
})

Then('the booking screen opens', async function () {
  await bookingPage.waitForVisible()
})

// Simulates a renamed logout button testID.
When('I tap the logout button using a stale testID', async function () {
  await selfHealingTap(
    'logout-button-RENAMED',
    'the Log out button in the top-right corner of the doctors screen'
  )
})

Then('the login screen is visible', async function () {
  await loginPage.waitForVisible()
})
