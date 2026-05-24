import { BasePage } from '../abstract/BasePage'

export class AppointmentsPage extends BasePage {
  get pageTestID() { return 'appointments-list' }

  async waitForList(): Promise<void> {
    await $(this.rid('appointments-list')).waitForDisplayed({ timeout: 15000 })
  }

  async getFirstAppointmentStatus(): Promise<string> {
    const items = this.findByPattern('appointment-item-.*')
    if (await items.length === 0) throw new Error('No appointments visible')
    const id = await this.getIdFromElement(await items[0], 'appointment-item-')
    return $(this.rid(`appointment-status-${id}`)).getText()
  }

  async getAppointmentStatus(id: string): Promise<string> {
    await $(this.rid(`appointment-status-${id}`)).waitForDisplayed({ timeout: 8000 })
    return $(this.rid(`appointment-status-${id}`)).getText()
  }

  async cancelAppointmentById(id: string): Promise<void> {
    await $(this.rid(`appointment-cancel-button-${id}`)).waitForDisplayed({ timeout: 8000 })
    await this.tap(`appointment-cancel-button-${id}`)
  }

  async cancelFirstPendingAppointment(): Promise<void> {
    const items = this.findByPattern('appointment-item-.*')
    const count = await items.length
    for (let i = 0; i < count; i++) {
      const id = await this.getIdFromElement(await items[i], 'appointment-item-')
      const status = await $(this.rid(`appointment-status-${id}`)).getText()
      if (status === 'pending' || status === 'confirmed') {
        await this.tap(`appointment-cancel-button-${id}`)
        return
      }
    }
    throw new Error('No pending appointment found to cancel')
  }
}
