import { BasePage } from '../abstract/BasePage'

export class LoginPage extends BasePage {
  get pageTestID() { return '~login-title' }

  async login(email: string, password: string, timeoutMs = 30000): Promise<void> {
    await this.waitForVisible(timeoutMs)
    await this.typeText('login-email-input', email)
    await this.typeText('login-password-input', password)
    await this.tap('login-submit-button')
  }

  async waitForLoginError(timeoutMs = 8000): Promise<void> {
    await $(this.rid('login-error')).waitForDisplayed({ timeout: timeoutMs })
  }

  async getErrorMessage(): Promise<string> {
    return this.getText('login-error')
  }

  async tapTermsLink(): Promise<void> {
    await this.tap('terms-link')
  }

  async tapPrivacyLink(): Promise<void> {
    await this.tap('privacy-link')
  }
}
