import { BasePage } from '../abstract/BasePage'

export class DeepLinkPage extends BasePage {
  get pageTestID() { return 'deep-link-screen' }

  async waitForScreen(timeoutMs = 10000): Promise<void> {
    await this.waitForVisible(timeoutMs)
  }

  async waitForContent(timeoutMs = 10000): Promise<void> {
    await driver.waitUntil(
      async () => {
        const loading = await $(this.rid('deep-link-loading')).isDisplayed().catch(() => false)
        return !loading
      },
      { timeout: timeoutMs, interval: 500, timeoutMsg: 'Deep link screen still loading' },
    )
  }

  async isAppointmentVisible(id: number): Promise<boolean> {
    return $(this.rid(`appointment-item-${id}`)).isDisplayed().catch(() => false)
  }

  async getAppointmentStatus(id: number): Promise<string> {
    await $(this.rid(`appointment-status-${id}`)).waitForDisplayed({ timeout: 8000 })
    return $(this.rid(`appointment-status-${id}`)).getText()
  }

  async getAnyAppointmentStatus(): Promise<string> {
    const items = this.findByPattern('appointment-status-.*')
    const el = await items[0]
    await el.waitForDisplayed({ timeout: 8000 })
    return el.getText()
  }

  async waitForNotFound(timeoutMs = 10000): Promise<void> {
    await $(this.rid('deep-link-not-found')).waitForDisplayed({ timeout: timeoutMs })
  }
}
