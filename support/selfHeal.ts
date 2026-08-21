import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Claude } from './claude'

// Tries a native tap by testID first; falls back to Claude Vision if the element
// is not found (renamed testID, layout change, etc.).
// Throws if Claude also cannot locate the element.
export async function selfHealingTap(testID: string, description: string): Promise<void> {
  const platform = process.env.PLATFORM ?? 'android'
  const sel = platform === 'ios' ? $(`~${testID}`) : $(`//*[@resource-id="${testID}"]`)

  const exists = await sel.isExisting().catch(() => false)
  if (exists) {
    await sel.click()
    return
  }

  const screenshot = await driver.takeScreenshot()
  const tmpPath = path.join(os.tmpdir(), `self-heal-${Date.now()}.png`)
  fs.writeFileSync(tmpPath, Buffer.from(screenshot, 'base64'))

  try {
    const coords = await Claude.findElement(tmpPath, description)
    if (!coords) throw new Error(`selfHealingTap: Claude could not locate "${description}" on screen`)
    await driver.performActions([{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: Math.round(coords.x + coords.width / 2), y: Math.round(coords.y + coords.height / 2) },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 50 },
        { type: 'pointerUp', button: 0 },
      ],
    }])
  } finally {
    fs.unlinkSync(tmpPath)
  }
}
