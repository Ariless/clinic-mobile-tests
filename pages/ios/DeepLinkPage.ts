import { BasePageIOS } from '../abstract/BasePageIOS'

export class DeepLinkPage extends BasePageIOS {
  get pageTestID() { return 'deep-link-screen' }

  async waitForScreen(timeoutMs = 10000): Promise<void> {
    await this.waitForVisible(timeoutMs)
  }

  async waitForContent(timeoutMs = 10000): Promise<void> {
    await driver.waitUntil(
      async () => {
        const loading = await $(`~deep-link-loading`).isDisplayed().catch(() => false)
        return !loading
      },
      { timeout: timeoutMs, interval: 500, timeoutMsg: 'Deep link screen still loading' },
    )
  }

  async isAppointmentVisible(id: number): Promise<boolean> {
    return $(`~appointment-item-${id}`).isDisplayed().catch(() => false)
  }

  async getAppointmentStatus(id: number): Promise<string> {
    await $(`~appointment-status-${id}`).waitForDisplayed({ timeout: 8000 })
    return $(`~appointment-status-${id}`).getText()
  }

  async waitForNotFound(timeoutMs = 10000): Promise<void> {
    await $(`~deep-link-not-found`).waitForDisplayed({ timeout: timeoutMs })
  }
}
