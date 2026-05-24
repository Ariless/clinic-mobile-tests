import { BasePageIOS } from '../abstract/BasePageIOS'

export class SymptomCheckerPage extends BasePageIOS {
  get pageTestID() { return 'symptom-input' }

  async navigateTo(): Promise<void> {
    await this.tap('tab-ai')
    await $('~symptom-input').waitForDisplayed({ timeout: 10000 })
  }

  async enterSymptoms(text: string): Promise<void> {
    await this.typeText('symptom-input', text)
  }

  async submit(): Promise<void> {
    await this.tap('symptom-submit')
  }

  async waitForResult(timeoutMs = 20000): Promise<void> {
    await $('~symptom-result').waitForDisplayed({ timeout: timeoutMs })
  }

  async waitForError(timeoutMs = 15000): Promise<void> {
    await $('~symptom-error').waitForDisplayed({ timeout: timeoutMs })
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
    const items = this.findByPattern('symptom-doctor-item-')
    return items.length
  }

  async selectFirstDoctor(): Promise<void> {
    const items = this.findByPattern('symptom-doctor-item-')
    if (await items.length === 0) throw new Error('No doctors visible in symptom checker result')
    await (await items[0]).click()
  }

  async getDoctorSpecialties(): Promise<string[]> {
    const items = this.findByPattern('symptom-doctor-specialty-')
    const count = await items.length
    const specialties: string[] = []
    for (let i = 0; i < count; i++) {
      specialties.push(await (await items[i]).getText())
    }
    return specialties
  }
}
