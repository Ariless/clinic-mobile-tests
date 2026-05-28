import { BasePage } from '../abstract/BasePage'

export class NotificationPage extends BasePage {
  get pageTestID() { return 'notification-shade' }

  async open(): Promise<void> {
    await driver.openNotifications()
    // allow shade animation to complete
    await driver.pause(1500)
  }

  async findNotificationByText(partialText: string): Promise<boolean> {
    try {
      const el = await $(`android=new UiSelector().textContains("${partialText}")`)
      return el.isDisplayed()
    } catch {
      return false
    }
  }

  async tapNotificationByText(partialText: string): Promise<void> {
    const el = await $(`android=new UiSelector().textContains("${partialText}")`)
    await el.waitForDisplayed({ timeout: 8000 })
    await el.click()
    await driver.pause(1000)
  }

  async getNotificationTitle(partialBody: string): Promise<string | null> {
    try {
      const body = await $(`android=new UiSelector().textContains("${partialBody}")`)
      if (!(await body.isDisplayed())) return null
      const container = body.$('..')
      const texts = await container.$$('android.widget.TextView')
      if (await texts.length === 0) return null
      return texts[0].getText()
    } catch {
      return null
    }
  }

  async dismiss(): Promise<void> {
    await driver.pressKeyCode(4) // KEYCODE_BACK
    await driver.pause(500)
  }
}
