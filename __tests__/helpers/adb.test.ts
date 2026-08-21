import { execSync } from 'child_process'
import { ADB } from '../../support/adb'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

const mockExecSync = execSync as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ADB — coldStart()', () => {
  it('parses TotalTime from am start output', () => {
    mockExecSync.mockReturnValue('Starting: Intent {}\nTotalTime: 1823\nWaitTime: 1824')
    expect(ADB.coldStart('com.example.app')).toBe(1823)
  })

  it('throws when TotalTime line is absent', () => {
    mockExecSync.mockReturnValue('Error: Activity not found')
    expect(() => ADB.coldStart('com.example.app')).toThrow(/TotalTime/)
  })

  it('force-stops the app before launching', () => {
    mockExecSync.mockReturnValue('TotalTime: 900')
    ADB.coldStart('com.test.app')
    const cmds = mockExecSync.mock.calls.map((c: any[]) => c[0] as string)
    expect(cmds.some((c: string) => c.includes('force-stop'))).toBe(true)
    expect(cmds.some((c: string) => c.includes('am start'))).toBe(true)
  })

  it('returns TotalTime as a number, not a string', () => {
    mockExecSync.mockReturnValue('TotalTime: 1500')
    expect(typeof ADB.coldStart('com.example.app')).toBe('number')
  })
})

describe('ADB — parseJankRate()', () => {
  it('calculates jank rate from gfxinfo output', () => {
    mockExecSync.mockReturnValue(
      'Total frames rendered: 200\nJanky frames: 10 (5.00%)',
    )
    const r = ADB.parseJankRate('com.example.app')
    expect(r.totalFrames).toBe(200)
    expect(r.jankyFrames).toBe(10)
    expect(r.jankRate).toBeCloseTo(0.05)
  })

  it('returns jankRate=0 when totalFrames=0 (avoids NaN)', () => {
    mockExecSync.mockReturnValue(
      'Total frames rendered: 0\nJanky frames: 0 (0.00%)',
    )
    expect(ADB.parseJankRate('com.example.app').jankRate).toBe(0)
  })

  it('throws when gfxinfo output is malformed', () => {
    mockExecSync.mockReturnValue('no gfx data yet')
    expect(() => ADB.parseJankRate('com.example.app')).toThrow()
  })

  it('divides jankyFrames by totalFrames (not the reverse)', () => {
    mockExecSync.mockReturnValue(
      'Total frames rendered: 100\nJanky frames: 3',
    )
    expect(ADB.parseJankRate('com.example.app').jankRate).toBeCloseTo(0.03)
  })

  it('distinguishes 3 janky out of 100 from 100 janky out of 3', () => {
    mockExecSync.mockReturnValue(
      'Total frames rendered: 100\nJanky frames: 3',
    )
    const rate = ADB.parseJankRate('com.example.app').jankRate
    expect(rate).toBeLessThan(0.5)
  })
})

describe('ADB — parseTotalPss()', () => {
  it('parses PSS in KB from the TOTAL: line', () => {
    mockExecSync.mockReturnValue(
      'Native Heap: 40000 30000\nJava Heap: 30000 25000\nTOTAL: 120000 90000',
    )
    expect(ADB.parseTotalPss('com.example.app')).toBe(120000)
  })

  it('throws when TOTAL: line is absent', () => {
    mockExecSync.mockReturnValue('no memory info here')
    expect(() => ADB.parseTotalPss('com.example.app')).toThrow()
  })

  it('returns a number, not a string', () => {
    mockExecSync.mockReturnValue('TOTAL: 85000 60000')
    expect(typeof ADB.parseTotalPss('com.example.app')).toBe('number')
  })
})

describe('ADB — isInstalled()', () => {
  it('returns true when pm path starts with "package:"', () => {
    mockExecSync.mockReturnValue('package:/data/app/com.example.app-1.apk')
    expect(ADB.isInstalled('com.example.app')).toBe(true)
  })

  it('returns false when execSync throws (app not found)', () => {
    mockExecSync.mockImplementation(() => { throw new Error('not found') })
    expect(ADB.isInstalled('com.example.app')).toBe(false)
  })

  it('returns false when output does not start with "package:"', () => {
    mockExecSync.mockReturnValue('error: no devices connected')
    expect(ADB.isInstalled('com.example.app')).toBe(false)
  })
})

describe('ADB — getAppUid()', () => {
  it('parses userId from dumpsys package output', () => {
    mockExecSync.mockReturnValue('userId=10123\n  dataDir=/data/data/com.example.app')
    expect(ADB.getAppUid('com.example.app')).toBe(10123)
  })

  it('throws when userId is missing from output', () => {
    mockExecSync.mockReturnValue('Package does not exist')
    expect(() => ADB.getAppUid('com.example.app')).toThrow()
  })

  it('returns a number, not a string', () => {
    mockExecSync.mockReturnValue('userId=10456')
    expect(typeof ADB.getAppUid('com.example.app')).toBe('number')
  })
})

describe('ADB — getHeldWakeLockCount()', () => {
  it('counts only PARTIAL_WAKE_LOCK lines matching the app UID', () => {
    const uid = 10123
    mockExecSync
      .mockReturnValueOnce(`userId=${uid}`)
      .mockReturnValueOnce(
        [
          `PARTIAL_WAKE_LOCK tag=wake1 HELD_BY_UID=${uid}`,
          `PARTIAL_WAKE_LOCK tag=wake2 HELD_BY_UID=${uid}`,
          `PARTIAL_WAKE_LOCK tag=other HELD_BY_UID=99999`,
        ].join('\n'),
      )
    expect(ADB.getHeldWakeLockCount('com.example.app')).toBe(2)
  })

  it('returns 0 when no wake locks are held', () => {
    mockExecSync
      .mockReturnValueOnce('userId=10123')
      .mockReturnValueOnce('no wake locks held')
    expect(ADB.getHeldWakeLockCount('com.example.app')).toBe(0)
  })

  it('does not count wake locks belonging to other processes', () => {
    mockExecSync
      .mockReturnValueOnce('userId=10123')
      .mockReturnValueOnce('PARTIAL_WAKE_LOCK HELD_BY_UID=99999')
    expect(ADB.getHeldWakeLockCount('com.example.app')).toBe(0)
  })
})

describe('ADB — getDisplayDensity()', () => {
  it('parses density value from wm density output', () => {
    mockExecSync.mockReturnValue('Physical density: 420')
    expect(ADB.getDisplayDensity()).toBe(420)
  })

  it('returns 160 as fallback when command fails', () => {
    mockExecSync.mockImplementation(() => { throw new Error('no device') })
    expect(ADB.getDisplayDensity()).toBe(160)
  })

  it('returns 160 when output contains no digits', () => {
    mockExecSync.mockReturnValue('no density info')
    expect(ADB.getDisplayDensity()).toBe(160)
  })
})

describe('ADB — command wrappers', () => {
  it('disableWifi sends wifi disable command', () => {
    ADB.disableWifi()
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('svc wifi disable'),
      expect.any(Object),
    )
  })

  it('enableWifi sends wifi enable command', () => {
    ADB.enableWifi()
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('svc wifi enable'),
      expect.any(Object),
    )
  })

  it('forceStop sends am force-stop command', () => {
    ADB.forceStop('com.example.app')
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('am force-stop com.example.app'),
      expect.any(Object),
    )
  })

  it('setDarkMode enables night mode', () => {
    ADB.setDarkMode()
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('night yes'),
      expect.any(Object),
    )
  })

  it('setLightMode disables night mode', () => {
    ADB.setLightMode()
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('night no'),
      expect.any(Object),
    )
  })

  it('resetGfxinfo sends gfxinfo reset command', () => {
    ADB.resetGfxinfo('com.example.app')
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('gfxinfo com.example.app reset'),
      expect.any(Object),
    )
  })

  it('enterDozeMode sends force-idle command', () => {
    ADB.enterDozeMode()
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('force-idle'),
      expect.any(Object),
    )
  })
})
