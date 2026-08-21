import { BasePage } from '../abstract/BasePage'

export class ClinicMapPage extends BasePage {
  get pageTestID() { return 'map-screen' }

  async waitForScreen(timeoutMs = 12000): Promise<void> {
    await this.waitForVisible(timeoutMs)
  }

  async getAddressText(): Promise<string> {
    return this.getText('clinic-address-text')
  }

  async isAddressVisible(): Promise<boolean> {
    return this.isVisible('clinic-address-text')
  }

  async isMapContainerVisible(): Promise<boolean> {
    return this.isVisible('map-container')
  }

  async tapDirections(): Promise<void> {
    await this.tap('directions-button')
  }

  async isScreenVisible(): Promise<boolean> {
    return this.isVisible('map-screen')
  }

  async goBack(): Promise<void> {
    await this.tap('map-back-button')
  }
}
