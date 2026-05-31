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
    await this.waitForConfirmation()
  }

  async waitForConfirmation(timeoutMs = 15000): Promise<void> {
    await $(this.rid('booking-success-message')).waitForDisplayed({ timeout: timeoutMs })
  }

  async getConfirmationText(): Promise<string> {
    return $(this.rid('booking-success-message')).getText()
  }

  async goBack(): Promise<void> {
    await this.tap('slots-back-button')
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

  async isAddToCalendarButtonVisible(): Promise<boolean> {
    return this.isVisible('add-to-calendar-button')
  }

  async tapAddToCalendar(): Promise<void> {
    await this.tap('add-to-calendar-button')
  }

  async waitForCalendarConfirmation(timeoutMs = 10000): Promise<void> {
    await $(this.rid('calendar-added-message')).waitForDisplayed({ timeout: timeoutMs })
  }

  async getFirstSlotDisplayedTime(): Promise<string> {
    await $(this.rid('slots-list')).waitForDisplayed({ timeout: 15000 })
    const slots = this.findByPattern('slot-time-.*')
    if (await slots.length === 0) throw new Error('No slot-time elements visible')
    return (await slots[0]).getText()
  }

  async getCalendarStatusText(): Promise<string> {
    for (const id of ['calendar-added-message', 'calendar-denied-message', 'calendar-exists-message', 'calendar-unavailable-message']) {
      try {
        const el = this.el(id)
        if (await el.isExisting() && await el.isDisplayed()) return el.getText()
      } catch { /* not present */ }
    }
    return ''
  }
}
