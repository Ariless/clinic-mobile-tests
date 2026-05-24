import { BasePage } from '../abstract/BasePage'

export class BookingPage extends BasePage {
  get pageTestID() { return 'slots-list' }

  async getDoctorName(): Promise<string> {
    return $(this.rid('booking-doctor-name')).getText()
  }

  async bookFirstAvailableSlot(): Promise<void> {
    await $(this.rid('slots-list')).waitForDisplayed({ timeout: 15000 })
    const slots = this.findByPattern('slot-item-.*')
    if (await slots.length === 0) throw new Error('No available slots on screen')
    await slots[0].click()
  }

  async waitForConfirmation(timeoutMs = 15000): Promise<void> {
    await $(this.rid('booking-success-message')).waitForDisplayed({ timeout: timeoutMs })
  }

  async getConfirmationText(): Promise<string> {
    return $(this.rid('booking-success-message')).getText()
  }

  async goBack(): Promise<void> {
    await this.tap('booking-back-button')
  }

  async getErrorMessage(): Promise<string> {
    return this.getText('booking-error')
  }

  async getEmptyMessage(): Promise<string> {
    return this.getText('slots-empty')
  }

  async isBookingScreenVisible(): Promise<boolean> {
    try {
      return await $(this.rid('slots-list')).isDisplayed()
    } catch {
      return false
    }
  }

  async waitForError(timeoutMs = 10000): Promise<void> {
    await $(this.rid('booking-error')).waitForDisplayed({ timeout: timeoutMs })
  }

  async waitForLoadingIndicator(timeoutMs = 1000): Promise<void> {
    await $(this.rid('booking-loading')).waitForDisplayed({ timeout: timeoutMs })
  }
}
