import { BasePageIOS } from '../abstract/BasePageIOS'

export class DoctorAppointmentsPage extends BasePageIOS {
  get pageTestID() { return 'doctor-appointments-list' }

  async waitForList(): Promise<void> {
    await $('~doctor-appointments-list').waitForDisplayed({ timeout: 15000 })
  }

  async confirmAppointmentById(id: string): Promise<void> {
    // Scroll the list until the confirm button is visible (XCUITest equivalent of UiScrollable)
    await driver.execute('mobile: scroll', {
      elementId: (await $('~doctor-appointments-list')).elementId,
      direction: 'down',
      predicateString: `name == "doctor-appointment-confirm-button-${id}"`,
    })
    await this.tap(`doctor-appointment-confirm-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(`~doctor-appointment-status-${id}`).getText()
      return status === 'confirmed'
    }, { timeout: 8000, interval: 500 })
  }

  async rejectAppointmentById(id: string): Promise<void> {
    await driver.execute('mobile: scroll', {
      elementId: (await $('~doctor-appointments-list')).elementId,
      direction: 'down',
      predicateString: `name == "doctor-appointment-reject-button-${id}"`,
    })
    await this.tap(`doctor-appointment-reject-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(`~doctor-appointment-status-${id}`).getText()
      return status === 'rejected'
    }, { timeout: 8000, interval: 500 })
  }

  async completeAppointmentById(id: string): Promise<void> {
    await driver.execute('mobile: scroll', {
      elementId: (await $('~doctor-appointments-list')).elementId,
      direction: 'down',
      predicateString: `name == "doctor-appointment-complete-button-${id}"`,
    })
    await this.tap(`doctor-appointment-complete-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(`~doctor-appointment-status-${id}`).getText()
      return status === 'completed'
    }, { timeout: 8000, interval: 500 })
  }

  async cancelAppointmentById(id: string): Promise<void> {
    await driver.execute('mobile: scroll', {
      elementId: (await $('~doctor-appointments-list')).elementId,
      direction: 'down',
      predicateString: `name == "doctor-appointment-cancel-button-${id}"`,
    })
    await this.tap(`doctor-appointment-cancel-button-${id}`)
    await driver.waitUntil(async () => {
      const status = await $(`~doctor-appointment-status-${id}`).getText()
      return status === 'cancelled'
    }, { timeout: 8000, interval: 500 })
  }

  async getAppointmentStatus(id: string): Promise<string> {
    await $(`~doctor-appointment-status-${id}`).waitForDisplayed({ timeout: 8000 })
    return $(`~doctor-appointment-status-${id}`).getText()
  }

  async logout(): Promise<void> {
    await this.tap('doctor-logout-button')
  }
}
