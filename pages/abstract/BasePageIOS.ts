import type { ChainablePromiseElement } from 'webdriverio'
import { BasePage } from './BasePage'

// iOS uses accessibility id (XCUITest accessibilityIdentifier), which React Native
// sets from the testID prop. WDIO Appium resolves the ~ prefix as accessibility id.
export abstract class BasePageIOS extends BasePage {
  // Returns a WDIO accessibility-id selector for XCUITest.
  // Overrides the Android resource-id XPath selector.
  protected override rid(testID: string): string {
    return `~${testID}`
  }

  override async waitForVisible(timeoutMs = 30000): Promise<void> {
    await $(`~${this.pageTestID}`).waitForDisplayed({ timeout: timeoutMs })
  }

  protected override el(testID: string): ChainablePromiseElement {
    return $(`~${testID}`)
  }

  // iOS predicate string matches elements by accessibility id prefix.
  // Replaces: android=new UiSelector().resourceIdMatches("pattern.*")
  protected override findByPattern(prefix: string) {
    return $$(`-ios predicate string:name BEGINSWITH "${prefix}"`)
  }

  // On iOS the accessibility id is in the 'name' attribute, not 'resource-id'.
  protected override async getIdFromElement(
    el: { getAttribute(attr: string): Promise<string | null> },
    prefix: string
  ): Promise<string> {
    const name = await el.getAttribute('name')
    if (!name) throw new Error(`Element missing accessibility id (expected prefix: ${prefix})`)
    return name.replace(prefix, '')
  }
}
