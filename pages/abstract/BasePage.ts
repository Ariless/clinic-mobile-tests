import type { ChainablePromiseElement } from 'webdriverio'

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
    await this.el(testID).waitForDisplayed({ timeout: 8000 })
    await this.el(testID).click()
  }

  protected async typeText(testID: string, text: string): Promise<void> {
    // Retry once: in RN New Architecture, onChangeText re-renders can briefly unmount
    // the element between waitForDisplayed and setValue.
    await this.el(testID).waitForDisplayed({ timeout: 8000 })
    try {
      await this.el(testID).setValue(text)
    } catch {
      await this.el(testID).waitForDisplayed({ timeout: 5000 })
      await this.el(testID).setValue(text)
    }
  }

  protected async getText(testID: string): Promise<string> {
    await this.el(testID).waitForDisplayed({ timeout: 8000 })
    return this.el(testID).getText()
  }

  protected async isVisible(testID: string): Promise<boolean> {
    try {
      return await this.el(testID).isDisplayed()
    } catch {
      return false
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
