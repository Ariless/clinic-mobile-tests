import { BasePage } from '../abstract/BasePage'

export class SymptomCheckerPage extends BasePage {
  get pageTestID() { return 'symptom-input' }

  async navigateTo(): Promise<void> {
    await this.tap('tab-ai')
    await $(this.rid('symptom-input')).waitForDisplayed({ timeout: 10000 })
  }

  async waitForScreen(timeoutMs = 10000): Promise<void> {
    await $(this.rid('symptom-input')).waitForDisplayed({ timeout: timeoutMs })
  }

  async enterSymptoms(text: string): Promise<void> {
    await this.typeText('symptom-input', text)
  }

  async submitSymptoms(text: string): Promise<void> {
    await this.enterSymptoms(text)
    await this.submit()
  }

  async submit(): Promise<void> {
    await this.tap('symptom-submit')
  }

  async waitForResultOrError(timeoutMs = 20000): Promise<void> {
    await browser.waitUntil(
      async () => (await this.isResultVisible()) || (await this.isErrorVisible()),
      { timeout: timeoutMs, timeoutMsg: 'Neither symptom-result nor symptom-error appeared' },
    )
  }

  async waitForResult(timeoutMs = 20000): Promise<void> {
    await $(this.rid('symptom-result')).waitForDisplayed({ timeout: timeoutMs })
  }

  async waitForError(timeoutMs = 15000): Promise<void> {
    await $(this.rid('symptom-error')).waitForDisplayed({ timeout: timeoutMs })
  }

  async getRecommendedSpecialty(): Promise<string> {
    return this.getText('symptom-specialty')
  }

  async getReasoning(): Promise<string | null> {
    try {
      const el = this.el('symptom-reasoning')
      const exists = await el.isExisting()
      return exists ? el.getText() : null
    } catch {
      return null
    }
  }

  async getErrorText(): Promise<string> {
    return this.getText('symptom-error')
  }

  async isResultVisible(): Promise<boolean> {
    return this.isVisible('symptom-result')
  }

  async isErrorVisible(): Promise<boolean> {
    return this.isVisible('symptom-error')
  }

  async isInputVisible(): Promise<boolean> {
    return this.isVisible('symptom-input')
  }

  async getDoctorCount(): Promise<number> {
    const items = this.findByPattern('symptom-doctor-item-.*')
    return await items.length
  }

  async selectFirstDoctor(): Promise<void> {
    const items = this.findByPattern('symptom-doctor-item-.*')
    if (await items.length === 0) throw new Error('No doctors visible in symptom checker result')
    await (await items[0]).click()
  }

  async getDoctorSpecialties(): Promise<string[]> {
    const items = this.findByPattern('symptom-doctor-specialty-.*')
    const count = await items.length
    const specialties: string[] = []
    for (let i = 0; i < count; i++) {
      specialties.push(await (await items[i]).getText())
    }
    return specialties
  }

  async clearSymptomInput(): Promise<void> {
    const el = this.el('symptom-input')
    await el.clearValue()
  }

  async getSymptomInputValue(): Promise<string> {
    return (await this.el('symptom-input').getText()) ?? ''
  }

  async tapVoiceButton(): Promise<void> {
    await this.tap('voice-input-button')
  }

  async isVoiceListeningVisible(): Promise<boolean> {
    return this.isVisible('voice-listening-indicator')
  }

  async getVoicePermissionError(): Promise<string> {
    return this.getText('voice-permission-error')
  }

  async isVoicePermissionErrorVisible(): Promise<boolean> {
    return this.isVisible('voice-permission-error')
  }

  async isOnDeviceBadgeVisible(): Promise<boolean> {
    return this.isVisible('ondevice-badge')
  }

  async submitAndMeasureMs(): Promise<number> {
    const start = Date.now()
    await this.tap('symptom-submit')
    await $(this.rid('symptom-result')).waitForDisplayed({ timeout: 10000 })
    return Date.now() - start
  }

  async isDisclosureBannerVisible(): Promise<boolean> {
    return this.isVisible('ai-disclosure-banner')
  }

  async isBrowseAllButtonVisible(): Promise<boolean> {
    return this.isVisible('ai-browse-all-button')
  }

  async tapBrowseAll(): Promise<void> {
    await this.tap('ai-browse-all-button')
  }
}
