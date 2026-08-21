import { BasePage } from '../../pages/abstract/BasePage'

// Concrete subclass that exposes protected methods for testing
class TestPage extends BasePage {
  get pageTestID(): string { return 'test-page' }
  publicEl(id: string) { return this.el(id) }
  publicRid(id: string) { return this.rid(id) }
  async publicTap(id: string) { return this.tap(id) }
  async publicTypeText(id: string, text: string) { return this.typeText(id, text) }
  async publicGetText(id: string) { return this.getText(id) }
  async publicIsVisible(id: string) { return this.isVisible(id) }
  publicFindByPattern(pattern: string) { return this.findByPattern(pattern) }
  async publicGetIdFromElement(
    el: { getAttribute(attr: string): Promise<string | null> },
    prefix: string,
  ) { return this.getIdFromElement(el, prefix) }
}

class TildePage extends BasePage {
  get pageTestID(): string { return '~tilde-screen' }
}

const mockEl = {
  waitForDisplayed: jest.fn().mockResolvedValue(undefined),
  click: jest.fn().mockResolvedValue(undefined),
  clearValue: jest.fn().mockResolvedValue(undefined),
  setValue: jest.fn().mockResolvedValue(undefined),
  getText: jest.fn().mockResolvedValue('Doctor Smith'),
  isDisplayed: jest.fn().mockResolvedValue(true),
}

const mockGlobal$ = jest.fn().mockReturnValue(mockEl)
const mockGlobal$$ = jest.fn().mockReturnValue([mockEl])

beforeAll(() => {
  ;(global as any).$ = mockGlobal$
  ;(global as any).$$ = mockGlobal$$
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGlobal$.mockReturnValue(mockEl)
  mockGlobal$$.mockReturnValue([mockEl])
  mockEl.isDisplayed.mockResolvedValue(true)
  mockEl.waitForDisplayed.mockResolvedValue(undefined)
  mockEl.click.mockResolvedValue(undefined)
  mockEl.clearValue.mockResolvedValue(undefined)
  mockEl.setValue.mockResolvedValue(undefined)
  mockEl.getText.mockResolvedValue('Doctor Smith')
})

const page = new TestPage()

describe('BasePage — rid()', () => {
  it('builds XPath selector with resource-id attribute', () => {
    expect(page.publicRid('login-button')).toBe('//*[@resource-id="login-button"]')
  })

  it('handles IDs with hyphens and digits', () => {
    expect(page.publicRid('appointment-item-42')).toBe('//*[@resource-id="appointment-item-42"]')
  })

  it('wraps ID in double-quotes (not single)', () => {
    expect(page.publicRid('x')).not.toContain("'")
    expect(page.publicRid('x')).toContain('"x"')
  })
})

describe('BasePage — el()', () => {
  it('calls $ with the XPath selector from rid()', () => {
    page.publicEl('submit-btn')
    expect(mockGlobal$).toHaveBeenCalledWith('//*[@resource-id="submit-btn"]')
  })

  it('returns the element returned by $()', () => {
    expect(page.publicEl('any-id')).toBe(mockEl)
  })
})

describe('BasePage — tap()', () => {
  it('waits for display before clicking', async () => {
    await page.publicTap('login-button')
    expect(mockEl.waitForDisplayed).toHaveBeenCalledWith({ timeout: 8000 })
    expect(mockEl.click).toHaveBeenCalled()
  })

  it('calls waitForDisplayed before click', async () => {
    const order: string[] = []
    mockEl.waitForDisplayed.mockImplementation(() => { order.push('wait'); return Promise.resolve() })
    mockEl.click.mockImplementation(() => { order.push('click'); return Promise.resolve() })
    await page.publicTap('btn')
    expect(order).toEqual(['wait', 'click'])
  })
})

describe('BasePage — typeText()', () => {
  it('clears existing value before setting new text', async () => {
    await page.publicTypeText('email-input', 'test@example.com')
    expect(mockEl.clearValue).toHaveBeenCalled()
    expect(mockEl.setValue).toHaveBeenCalledWith('test@example.com')
  })

  it('calls clearValue before setValue', async () => {
    const order: string[] = []
    mockEl.clearValue.mockImplementation(() => { order.push('clear'); return Promise.resolve() })
    mockEl.setValue.mockImplementation(() => { order.push('set'); return Promise.resolve() })
    await page.publicTypeText('input', 'text')
    expect(order).toEqual(['clear', 'set'])
  })
})

describe('BasePage — getText()', () => {
  it('returns text from the element', async () => {
    mockEl.getText.mockResolvedValue('Dr. Johnson')
    expect(await page.publicGetText('doctor-name')).toBe('Dr. Johnson')
  })
})

describe('BasePage — isVisible()', () => {
  it('returns true when element is displayed', async () => {
    mockEl.isDisplayed.mockResolvedValue(true)
    expect(await page.publicIsVisible('some-el')).toBe(true)
  })

  it('returns false when element is not displayed', async () => {
    mockEl.isDisplayed.mockResolvedValue(false)
    expect(await page.publicIsVisible('some-el')).toBe(false)
  })

  it('returns false when element lookup throws', async () => {
    mockGlobal$.mockReturnValue({ isDisplayed: jest.fn().mockRejectedValue(new Error('not found')) })
    expect(await page.publicIsVisible('absent')).toBe(false)
  })
})

describe('BasePage — findByPattern()', () => {
  it('queries with UiSelector resourceIdMatches', () => {
    page.publicFindByPattern('appointment-item-.*')
    expect(mockGlobal$$).toHaveBeenCalledWith(
      'android=new UiSelector().resourceIdMatches("appointment-item-.*")',
    )
  })

  it('embeds the exact pattern string in the selector', () => {
    page.publicFindByPattern('doctor-\\d+')
    expect(mockGlobal$$).toHaveBeenCalledWith(
      expect.stringContaining('doctor-\\d+'),
    )
  })
})

describe('BasePage — getIdFromElement()', () => {
  it('strips the prefix from resource-id attribute', async () => {
    const el = { getAttribute: jest.fn().mockResolvedValue('doctor-item-3') }
    expect(await page.publicGetIdFromElement(el, 'doctor-item-')).toBe('3')
  })

  it('throws when resource-id attribute is null', async () => {
    const el = { getAttribute: jest.fn().mockResolvedValue(null) }
    await expect(page.publicGetIdFromElement(el, 'prefix-')).rejects.toThrow(/resource-id/)
  })

  it('strips only the first occurrence of the prefix', async () => {
    const el = { getAttribute: jest.fn().mockResolvedValue('slot-item-slot-42') }
    expect(await page.publicGetIdFromElement(el, 'slot-item-')).toBe('slot-42')
  })
})

describe('BasePage — waitForVisible()', () => {
  it('waits for the pageTestID element', async () => {
    await page.waitForVisible()
    expect(mockGlobal$).toHaveBeenCalledWith('//*[@resource-id="test-page"]')
    expect(mockEl.waitForDisplayed).toHaveBeenCalled()
  })

  it('strips leading ~ from pageTestID before building selector', async () => {
    const tp = new TildePage()
    await tp.waitForVisible()
    expect(mockGlobal$).toHaveBeenCalledWith('//*[@resource-id="tilde-screen"]')
  })

  it('passes the custom timeout to waitForDisplayed', async () => {
    await page.waitForVisible(5000)
    expect(mockEl.waitForDisplayed).toHaveBeenCalledWith({ timeout: 5000 })
  })
})
