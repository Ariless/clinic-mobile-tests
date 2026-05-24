import { BasePage } from '../abstract/BasePage'

export class DoctorAppointmentsPage extends BasePage {
  get pageTestID() { return 'doctor-appointments-list' }

  async waitForList(): Promise<void> {
    await $(this.rid('doctor-appointments-list')).waitForDisplayed({ timeout: 15000 })
  }

  async confirmAppointmentById(id: string): Promise<void> {
    // scroll to the item first — it may be below the visible viewport
    await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("doctor-appointment-confirm-button-${id}"))`)
    await this.tap(`doctor-appointment-confirm-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(this.rid(`doctor-appointment-status-${id}`)).getText()
      return status === 'confirmed'
    }, { timeout: 8000, interval: 500 })
  }

  async rejectAppointmentById(id: string): Promise<void> {
    await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("doctor-appointment-reject-button-${id}"))`)
    await this.tap(`doctor-appointment-reject-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(this.rid(`doctor-appointment-status-${id}`)).getText()
      return status === 'rejected'
    }, { timeout: 8000, interval: 500 })
  }

  async completeAppointmentById(id: string): Promise<void> {
    await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("doctor-appointment-complete-button-${id}"))`)
    await this.tap(`doctor-appointment-complete-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(this.rid(`doctor-appointment-status-${id}`)).getText()
      return status === 'completed'
    }, { timeout: 8000, interval: 500 })
  }

  async cancelAppointmentById(id: string): Promise<void> {
    await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("doctor-appointment-cancel-button-${id}"))`)
    await this.tap(`doctor-appointment-cancel-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(this.rid(`doctor-appointment-status-${id}`)).getText()
      return status === 'cancelled'
    }, { timeout: 8000, interval: 500 })
  }

  async getAppointmentStatus(id: string): Promise<string> {
    await $(this.rid(`doctor-appointment-status-${id}`)).waitForDisplayed({ timeout: 8000 })
    return $(this.rid(`doctor-appointment-status-${id}`)).getText()
  }

  async logout(): Promise<void> {
    await this.tap('doctor-logout-button')
  }
}
