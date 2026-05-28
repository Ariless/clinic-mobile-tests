import { BasePageIOS } from '../abstract/BasePageIOS'

export class DoctorsPage extends BasePageIOS {
  get pageTestID() { return 'doctors-list' }

  async waitForDoctorList(): Promise<void> {
    await $('~doctors-list').waitForDisplayed({ timeout: 15000 })
  }

  async selectFirstDoctorAndGetName(): Promise<string> {
    await this.waitForDoctorList()
    const items = this.findByPattern('doctor-item-')
    if (await items.length === 0) throw new Error('No doctors visible on screen')
    const id = await this.getIdFromElement(await items[0], 'doctor-item-')
    const name = await $(`~doctor-name-${id}`).getText()
    await (await items[0]).click()
    return name
  }

  async switchToMyVisits(): Promise<void> {
    await this.tap('tab-appointments')
  }

  async switchToDoctors(): Promise<void> {
    await this.tap('tab-doctors')
  }

  async logout(): Promise<void> {
    await this.tap('logout-button')
  }

  async isDoctorListVisible(): Promise<boolean> {
    try {
      return await $('~doctors-list').isDisplayed()
    } catch {
      return false
    }
  }

  async tapMapButtonForFirstDoctor(): Promise<string> {
    await this.waitForDoctorList()
    const items = this.findByPattern('doctor-item-')
    if (await items.length === 0) throw new Error('No doctors visible on screen')
    const id = await this.getIdFromElement(await items[0], 'doctor-item-')
    await this.tap(`map-button-${id}`)
    return id
  }
}
