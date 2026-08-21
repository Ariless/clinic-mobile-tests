import { BasePageIOS } from '../abstract/BasePageIOS'

export class WebViewPage extends BasePageIOS {
  get pageTestID() { return 'webview-screen' }

  async waitForScreen(timeoutMs = 15000): Promise<void> {
    await $('~webview-screen').waitForDisplayed({ timeout: timeoutMs })
  }

  async getTitle(): Promise<string> {
    return this.getText('webview-title')
  }

  async goBack(): Promise<void> {
    await this.tap('webview-back-button')
  }

  // Switches Appium driver to the embedded WebView context.
  // iOS XCUITest context name pattern: WEBVIEW_<numeric-id>
  async switchToWebContext(timeoutMs = 15000): Promise<string> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const contexts = await driver.getContexts() as string[]
      const webCtx = contexts.find(c => c.toString().startsWith('WEBVIEW'))
      if (webCtx) {
        await driver.switchContext(webCtx)
        return webCtx
      }
      await driver.pause(500)
    }
    const contexts = await driver.getContexts() as string[]
    throw new Error(`No WEBVIEW context appeared within ${timeoutMs}ms. Available: ${contexts.join(', ')}`)
  }

  async switchToNativeContext(): Promise<void> {
    await driver.switchContext('NATIVE_APP')
  }

  // Must be called while in WebView context.
  async getWebHeading(): Promise<string> {
    const h1 = await $('h1')
    await h1.waitForDisplayed({ timeout: 10000 })
    return h1.getText()
  }

  // Must be called while in WebView context.
  async webBodyContains(text: string): Promise<boolean> {
    const body = await $('body')
    const content = await body.getText()
    return content.includes(text)
  }

  // Returns the active Appium context name. Useful for diagnostics and
  // asserting iOS WKWebView pattern (WEBVIEW_<pid>) vs NATIVE_APP.
  async getCurrentContextName(): Promise<string> {
    return (await driver.getContext()) as string
  }
}
