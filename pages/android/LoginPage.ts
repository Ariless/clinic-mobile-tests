import { BasePage } from '../abstract/BasePage'

export class LoginPage extends BasePage {
  get pageTestID() { return '~login-title' }

  async login(email: string, password: string, timeoutMs = 30000): Promise<void> {
    await this.waitForVisible(timeoutMs)
    // Wait for the password input before typing — a health check useEffect in React Native
    // New Architecture can re-render the login form after the title appears, briefly
    // unmounting both inputs. Waiting here ensures the form is stable before interaction.
    await this.el('login-password-input').waitForDisplayed({ timeout: timeoutMs })
    await this.typeText('login-email-input', email)
    // Re-wait after email entry: onChangeText re-render briefly unmounts the password field
    await this.el('login-password-input').waitForDisplayed({ timeout: 5000 })
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
