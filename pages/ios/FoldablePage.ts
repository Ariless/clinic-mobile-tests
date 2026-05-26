import { BasePageIOS } from '../abstract/BasePageIOS'

export class FoldablePage extends BasePageIOS {
  get pageTestID() { return 'dual-panel-container' }

  async waitForDualPanel(): Promise<void> {
    await this.el('dual-panel-container').waitForDisplayed({ timeout: 10000 })
  }

  async isDualPanelVisible(): Promise<boolean> {
    return this.isVisible('dual-panel-container')
  }

  async isDoctorsPanelVisible(): Promise<boolean> {
    return this.isVisible('panel-doctors')
  }

  async isBookingPlaceholderVisible(): Promise<boolean> {
    return this.isVisible('panel-booking-placeholder')
  }

  async isBookingPanelVisible(): Promise<boolean> {
    return this.isVisible('panel-booking')
  }

  async selectFirstDoctorInPanel(): Promise<void> {
    await this.waitForDualPanel()
    const items = this.findByPattern('doctor-item-')
    if (await items.length === 0) throw new Error('No doctors visible in left panel')
    await (await items[0]).click()
  }
}
