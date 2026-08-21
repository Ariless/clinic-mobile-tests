// mockCreate must be declared before jest.mock() factories run (jest hoists mock
// declarations but factories execute lazily when the module is first required,
// at which point mockCreate is already initialised).
const mockCreate = jest.fn()

// __esModule: true is required, not decorative: support/claude.ts does `import Anthropic from`,
// which ts-jest compiles to an interop call. Without the flag the interop wraps the whole mock
// object as the default export, `new Anthropic()` resolves to a plain object and the suite dies
// with "sdk_1.default is not a constructor" before a single assertion runs. Added 2026-08-21.
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-image-bytes')),
}))

import { Claude } from '../../support/claude'
import * as fs from 'fs'

beforeEach(() => {
  jest.clearAllMocks()
  ;(fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake-image-bytes'))
})

function makeResponse(text: string) {
  return { content: [{ type: 'text', text }] }
}

describe('Claude — compareScreenshot()', () => {
  it('returns pass=true when Claude responds true', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"pass":true,"reason":"looks correct"}'))
    const r = await Claude.compareScreenshot('/tmp/test.png', 'Is form visible?')
    expect(r.pass).toBe(true)
    expect(r.reason).toBe('looks correct')
  })

  it('returns pass=false when Claude responds false', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"pass":false,"reason":"button missing"}'))
    const r = await Claude.compareScreenshot('/tmp/test.png', 'Is submit visible?')
    expect(r.pass).toBe(false)
  })

  it('reads the image file at the given path', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"pass":true,"reason":"ok"}'))
    await Claude.compareScreenshot('/tmp/image.png', 'check')
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/image.png')
  })

  it('sends image as base64 in the API request', async () => {
    const fakeImage = Buffer.from('test-image-content')
    ;(fs.readFileSync as jest.Mock).mockReturnValue(fakeImage)
    mockCreate.mockResolvedValue(makeResponse('{"pass":true,"reason":"ok"}'))
    await Claude.compareScreenshot('/tmp/x.png', 'q')
    const call = mockCreate.mock.calls[0][0]
    expect(call.messages[0].content[0].source.data).toBe(fakeImage.toString('base64'))
  })
})

describe('Claude — auditA11y()', () => {
  it('returns empty array when all elements are accessible', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"unlabeled_elements":[]}'))
    const r = await Claude.auditA11y('/tmp/screen.png')
    expect(r.unlabeled_elements).toEqual([])
  })

  it('returns list of unlabeled elements when issues are found', async () => {
    mockCreate.mockResolvedValue(
      makeResponse('{"unlabeled_elements":["submit button","nav icon"]}'),
    )
    const r = await Claude.auditA11y('/tmp/screen.png')
    expect(r.unlabeled_elements).toHaveLength(2)
    expect(r.unlabeled_elements).toContain('submit button')
  })
})

describe('Claude — evaluateUX()', () => {
  it('returns numeric score from Claude response', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"score":4,"reason":"mostly clear"}'))
    const r = await Claude.evaluateUX('/tmp/s.png', 'Is info clear?')
    expect(r.score).toBe(4)
    expect(r.reason).toBe('mostly clear')
  })

  it('returns score=1 for poor UX', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"score":1,"reason":"confusing layout"}'))
    const r = await Claude.evaluateUX('/tmp/s.png', 'How clear?')
    expect(r.score).toBe(1)
  })
})

describe('Claude — evaluateReadability()', () => {
  it('returns pass=true with empty issues when readable', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"pass":true,"issues":[]}'))
    const r = await Claude.evaluateReadability('/tmp/dark.png')
    expect(r.pass).toBe(true)
    expect(r.issues).toEqual([])
  })

  it('returns pass=false with issues when text is unreadable', async () => {
    mockCreate.mockResolvedValue(
      makeResponse('{"pass":false,"issues":["white text on white bg"]}'),
    )
    const r = await Claude.evaluateReadability('/tmp/dark.png')
    expect(r.pass).toBe(false)
    expect(r.issues).toContain('white text on white bg')
  })
})

describe('Claude — markdown fence stripping (parseJson)', () => {
  it('handles ```json ... ``` fences', async () => {
    mockCreate.mockResolvedValue(
      makeResponse('```json\n{"pass":true,"reason":"fenced"}\n```'),
    )
    const r = await Claude.compareScreenshot('/tmp/x.png', 'q')
    expect(r.pass).toBe(true)
    expect(r.reason).toBe('fenced')
  })

  it('handles plain ``` ... ``` fences without language hint', async () => {
    mockCreate.mockResolvedValue(
      makeResponse('```\n{"pass":false,"reason":"plain fence"}\n```'),
    )
    const r = await Claude.compareScreenshot('/tmp/x.png', 'q')
    expect(r.pass).toBe(false)
  })

  it('handles plain JSON with no fences', async () => {
    mockCreate.mockResolvedValue(makeResponse('{"pass":true,"reason":"no fence"}'))
    const r = await Claude.compareScreenshot('/tmp/x.png', 'q')
    expect(r.reason).toBe('no fence')
  })

  it('throws on malformed JSON (not silently returns undefined)', async () => {
    mockCreate.mockResolvedValue(makeResponse('not json at all'))
    await expect(Claude.compareScreenshot('/tmp/x.png', 'q')).rejects.toThrow()
  })
})
