import { BasePage } from '../abstract/BasePage'

export class SymptomCheckerPage extends BasePage {
  get pageTestID() { return 'symptom-input' }

  async waitForScreen(): Promise<void> {
    await this.el('symptom-input').waitForDisplayed({ timeout: 10000 })
  }

  async submitSymptoms(text: string): Promise<void> {
    await this.typeText('symptom-input', text)
    await this.tap('symptom-submit')
  }

  async waitForResultOrError(): Promise<void> {
    await browser.waitUntil(
      async () => (await this.isVisible('symptom-result')) || (await this.isVisible('symptom-error')),
      { timeout: 20000, timeoutMsg: 'Neither symptom-result nor symptom-error appeared within 20s' },
    )
  }

  async isResultVisible(): Promise<boolean> {
    return this.isVisible('symptom-result')
  }

  async isErrorVisible(): Promise<boolean> {
    return this.isVisible('symptom-error')
  }

  async getErrorText(): Promise<string> {
    return this.getText('symptom-error')
  }
}
