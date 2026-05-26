import type { ChainablePromiseElement } from 'webdriverio'
import * as os from 'os'
import * as path from 'path'
import { Claude } from '../../support/claude'

export abstract class BasePage {
  abstract get pageTestID(): string

  // RN 0.73+ New Architecture puts testID in resource-id, not content-desc.
  // All selectors use XPath by resource-id.
  protected rid(testID: string): string {
    return `//*[@resource-id="${testID}"]`
  }

  async waitForVisible(timeoutMs = 30000): Promise<void> {
    const id = this.pageTestID.replace(/^~/, '')
    await $(this.rid(id)).waitForDisplayed({ timeout: timeoutMs })
  }

  protected el(testID: string): ChainablePromiseElement {
    return $(this.rid(testID))
  }

  protected async tap(testID: string): Promise<void> {
    const el = this.el(testID)
    await el.waitForDisplayed({ timeout: 8000 })
    await el.click()
  }

  protected async typeText(testID: string, text: string): Promise<void> {
    const el = this.el(testID)
    await el.waitForDisplayed({ timeout: 8000 })
    await el.clearValue()
    await el.setValue(text)
  }

  protected async getText(testID: string): Promise<string> {
    const el = this.el(testID)
    await el.waitForDisplayed({ timeout: 8000 })
    return el.getText()
  }

  protected async isVisible(testID: string): Promise<boolean> {
    try {
      return await this.el(testID).isDisplayed()
    } catch {
      return false
    }
  }

  // Tries testID first; if not found within 3 s, falls back to Claude Vision to locate
  // the element by visual description and taps its centre via W3C pointer actions.
  async selfHealingTap(testID: string, visualDescription: string): Promise<void> {
    try {
      const el = this.el(testID)
      await el.waitForDisplayed({ timeout: 3000 })
      await el.click()
    } catch {
      const screenshotPath = path.join(os.tmpdir(), `self-healing-${Date.now()}.png`)
      await browser.saveScreenshot(screenshotPath)
      const bounds = await Claude.findElement(screenshotPath, visualDescription)
      if (!bounds) throw new Error(`selfHealingTap: Claude could not locate element — "${visualDescription}"`)
      const cx = Math.round(bounds.x + bounds.width / 2)
      const cy = Math.round(bounds.y + bounds.height / 2)
      await browser.action('pointer', { parameters: { pointerType: 'touch' } })
        .move({ x: cx, y: cy })
        .down()
        .up()
        .perform()
    }
  }

  // Finds all elements whose resource-id matches an Android UiSelector regex pattern.
  // Usage: this.findByPattern('appointment-item-.*')
  protected findByPattern(pattern: string) {
    return $$(`android=new UiSelector().resourceIdMatches("${pattern}")`)
  }

  // Extracts the ID suffix from the resource-id attribute.
  // e.g. resource-id="doctor-item-3", prefix="doctor-item-" → "3"
  protected async getIdFromElement(el: { getAttribute(attr: string): Promise<string | null> }, prefix: string): Promise<string> {
    const resourceId = await el.getAttribute('resource-id')
    if (!resourceId) throw new Error(`Element missing resource-id (expected prefix: ${prefix})`)
    return resourceId.replace(prefix, '')
  }
}
