import { Given, When, Then, Before, After } from '@wdio/cucumber-framework'
import { LoginPage, WebViewPage } from '../pages/factory'

let loginPage: LoginPage
let webViewPage: WebViewPage

Before({ tags: '@webview' }, async function () {
  loginPage = new LoginPage()
  webViewPage = new WebViewPage()
})

After({ tags: '@webview' }, async function () {
  // Ensure we return to native context if a test fails mid-context-switch
  try {
    const ctx = await driver.getContext() as string
    if (ctx !== 'NATIVE_APP') await driver.switchContext('NATIVE_APP')
  } catch { /* ignore */ }
})

Given('the app is on the login screen', async function () {
  await loginPage.waitForVisible()
})

When('I tap the {string} link', async function (label: string) {
  if (label === 'Terms & Conditions') {
    await loginPage.tapTermsLink()
  } else if (label === 'Privacy Policy') {
    await loginPage.tapPrivacyLink()
  } else {
    throw new Error(`Unknown link label: "${label}"`)
  }
})

Then('the WebView screen is displayed', async function () {
  await webViewPage.waitForScreen()
})

Then('the WebView title is {string}', async function (expected: string) {
  const actual = await webViewPage.getTitle()
  expect(actual).toBe(expected)
})

When('I switch to the WebView context', async function () {
  await webViewPage.switchToWebContext()
})

Then('the web page heading contains {string}', async function (text: string) {
  const heading = await webViewPage.getWebHeading()
  expect(heading).toContain(text)
})

When('I switch back to the native context', async function () {
  await webViewPage.switchToNativeContext()
})

Then('the WebView back button is visible', async function () {
  await $(process.env.PLATFORM === 'ios'
    ? '~webview-back-button'
    : '//*[@resource-id="webview-back-button"]'
  ).waitForDisplayed({ timeout: 8000 })
})

When('I press the WebView back button', async function () {
  await webViewPage.goBack()
})

Then('the login screen is displayed', async function () {
  await loginPage.waitForVisible()
})

// iOS-only: verifies context switch works → app uses WKWebView, not SFSafariViewController.
Then('the WebView context is accessible via XCUITest', async function () {
  const ctxName = await webViewPage.switchToWebContext()
  // iOS WKWebView context name is always WEBVIEW_<pid> — never NATIVE_APP.
  // If this assertion fails, the app opened an external browser instead of in-app WebView.
  expect(ctxName).toMatch(/^WEBVIEW_/)
  await webViewPage.switchToNativeContext()
})
