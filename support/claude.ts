import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function callWithScreenshot(imagePath: string, prompt: string): Promise<string> {
  const imageData = fs.readFileSync(imagePath).toString('base64')
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageData } },
        { type: 'text', text: prompt },
      ],
    }],
  })
  return (response.content[0] as { type: string; text: string }).text
}

// Claude occasionally wraps JSON in ```json...``` or adds trailing prose — extract first {...} or [...]
function parseJson<T>(text: string): T {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```[\s\S]*$/, '').trim()
  const start = stripped.search(/[{[]/)
  if (start === -1) return JSON.parse(stripped) as T
  const open = stripped[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let end = -1
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === open) depth++
    else if (stripped[i] === close) { depth--; if (depth === 0) { end = i; break } }
  }
  return JSON.parse(end === -1 ? stripped.slice(start) : stripped.slice(start, end + 1)) as T
}

export const Claude = {
  // Semantic screenshot comparison instead of pixel-perfect diffing
  async compareScreenshot(imagePath: string, expectation: string): Promise<{ pass: boolean; reason: string }> {
    const prompt = `${expectation}\n\nRespond with JSON only, no markdown: { "pass": boolean, "reason": string }`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // Accessibility audit from screenshot
  async auditA11y(imagePath: string): Promise<{ unlabeled_elements: string[] }> {
    const prompt = `List any interactive UI elements (buttons, inputs, links) that appear to have no accessible label or role visible to a screen reader.
Respond with JSON only, no markdown: { "unlabeled_elements": string[] }
Return an empty array if everything looks accessible.`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // UX quality evaluation
  async evaluateUX(imagePath: string, question: string): Promise<{ score: number; reason: string }> {
    const prompt = `${question}\n\nRespond with JSON only, no markdown: { "score": number (1-5), "reason": string }`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // Self-healing locator: find an element by visual description, return its center coordinates
  async findElement(imagePath: string, description: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const prompt = `You are looking at a mobile app screenshot.
Find the UI element that matches this description: "${description}"
Return its bounding box as JSON — x and y are the top-left corner in pixels, width and height in pixels.
If you cannot find the element, return null.
Respond with JSON only, no markdown: { "x": number, "y": number, "width": number, "height": number } or null`
    const text = await callWithScreenshot(imagePath, prompt)
    const trimmed = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    if (trimmed === 'null') return null
    return parseJson(trimmed)
  },

  // Dark mode readability check
  async evaluateReadability(imagePath: string): Promise<{ pass: boolean; issues: string[] }> {
    const prompt = `Look at this mobile app screenshot taken in dark mode.
Are there any readability issues — text that is invisible, very hard to read, overlapping, or clipped?
Are there buttons or interactive elements that appear broken, indistinguishable from the background, or missing?
Respond with JSON only, no markdown: { "pass": boolean, "issues": string[] }
Return pass: true and an empty issues array if everything looks readable and complete.`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // Large font scale layout check — truncated text, overflow, hidden content
  async evaluateFontScaleLayout(imagePath: string, screenName: string): Promise<{ pass: boolean; issues: string[] }> {
    const prompt = `You are reviewing a mobile medical app screenshot captured at maximum system font scale (2×).
This is the "${screenName}" screen.
Check for any layout problems caused by large text:
- Text that is truncated or clipped (ends with "..." where important info is cut off)
- Buttons whose labels are partially hidden or overflow the button boundary
- UI elements that overlap because text expanded into adjacent space
- Content that has been pushed off-screen and is no longer visible
- Form labels that have wrapped in a way that makes them hard to read

Respond with JSON only, no markdown: { "pass": boolean, "issues": string[] }
Return pass: true and empty issues if the layout handles large text correctly.`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // RTL layout check — correct mirroring for right-to-left locale
  async evaluateRtlLayout(imagePath: string, screenName: string): Promise<{ pass: boolean; issues: string[] }> {
    const prompt = `You are reviewing a mobile app screenshot for RTL (right-to-left) layout correctness.
This is the "${screenName}" screen, displayed in an Arabic locale.
Check for RTL layout problems:
- Navigation arrows or chevrons that still point left-to-right (they should point right-to-left in RTL)
- Text that is left-aligned instead of right-aligned
- Layout that is not mirrored (in RTL, the primary content should be on the right, not the left)
- List items where action buttons (e.g. Cancel, View) are on the wrong side
- Tab bar or bottom navigation that is not reversed

Respond with JSON only, no markdown: { "pass": boolean, "issues": string[] }
Return pass: true and empty issues if the layout is correctly mirrored for RTL.`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // String overflow check — long-locale text truncation and button overflow
  async evaluateStringOverflow(imagePath: string, screenName: string, locale: string): Promise<{ pass: boolean; issues: string[] }> {
    const prompt = `You are reviewing a mobile medical app screenshot displayed in the "${locale}" locale.
This is the "${screenName}" screen. ${locale.startsWith('de') ? 'German text is 30–40% longer than English, which commonly causes layout problems.' : 'This locale uses longer text than English, which may cause layout problems.'}
Check for string overflow and text truncation issues:
- Button labels that are truncated or clipped (ending with "..." where the full label is cut off)
- Text that overflows outside its container boundary
- UI elements that overlap because long text expanded into adjacent space
- Action buttons (e.g. "Book Appointment", "Cancel") where the label is not fully visible
- Form labels or screen titles that are partially hidden

Respond with JSON only, no markdown: { "pass": boolean, "issues": string[] }
Return pass: true and empty issues if all text fits correctly.`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // Empty state completeness — does the screen guide the patient toward next action?
  async evaluateEmptyState(imagePath: string, screenName: string): Promise<{ score: number; reason: string }> {
    const prompt = `You are reviewing an empty state screen in a mobile medical booking app.
This is the "${screenName}" screen, shown when there is no content to display.
Rate how well this empty state guides the patient (1–5):
5 = excellent: explains why it is empty + gives a clear next action ("Book your first appointment →")
4 = good: explains the empty state, next action is implied
3 = adequate: shows something is empty but does not guide the patient
2 = poor: blank or generic message ("No data"), patient does not know what to do
1 = failing: blank screen with no message at all

Medical context: a confused patient may think the app is broken and abandon it.

Respond with JSON only, no markdown: { "score": number (1-5), "reason": string }`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // User journey friction analysis — all steps in one multi-image request
  async analyzeJourneyFriction(
    steps: Array<{ name: string; imagePath: string }>,
  ): Promise<{
    steps: Array<{ name: string; friction: number; reason: string }>
    worst_step: string
    recommendation: string
  }> {
    type Block =
      | { type: 'image'; source: { type: 'base64'; media_type: 'image/png'; data: string } }
      | { type: 'text'; text: string }
    const content: Block[] = []
    for (const step of steps) {
      const imageData = fs.readFileSync(step.imagePath).toString('base64')
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageData } })
      content.push({ type: 'text', text: `Step: "${step.name}"` })
    }
    content.push({
      type: 'text',
      text: `You have seen ${steps.length} sequential screenshots of a mobile medical appointment booking app, in order.
Rate each step by patient friction (1–5):
1 = effortless — one obvious action, zero ambiguity
2 = easy — minor effort, patient proceeds confidently
3 = some hesitation — patient slows down but continues
4 = confusing — patient likely to pause, go back, or make an error
5 = abandonment risk — patient will likely give up at this step

Medical context: patients may be anxious, elderly, or unfamiliar with technology.
Focus on: label clarity, number of simultaneous choices, confirmation that action succeeded, medical-appropriate language.

Respond with JSON only, no markdown:
{ "steps": [{ "name": string, "friction": number, "reason": string }], "worst_step": string, "recommendation": string }`,
    })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: 'user', content: content as any }],
    })
    return parseJson((response.content[0] as { type: string; text: string }).text)
  },

  // Microcopy quality evaluation — patient-appropriate language across screens
  async evaluateMicrocopy(imagePath: string, screenContext: string): Promise<{ score: number; issues: string[] }> {
    const prompt = `You are reviewing a mobile medical app screenshot for microcopy quality — the quality of every visible text string.
${screenContext}
Evaluate whether all text is written for a patient, not a developer. Check:
- Buttons and CTAs use plain language that describes what happens ("Book Appointment", not "Submit")
- Error messages explain the problem without technical codes (no "Error 422", "401 Unauthorized", "null", "undefined")
- Status labels are human-readable ("Awaiting confirmation", not "PENDING")
- No placeholder text, raw IDs, or developer-facing strings are visible
- Language is appropriate for a patient who may be stressed or unfamiliar with medical systems

Respond with JSON only, no markdown: { "score": number (1-5), "issues": string[] }
Score 5: excellent patient-appropriate language throughout.
Score 4: mostly good, one or two minor issues that do not confuse a patient.
Score 3 or below: visible developer-speak, technical codes, or confusing labels — list each specific issue.`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },

  // Large-screen / foldable layout evaluation
  async evaluateLayout(imagePath: string): Promise<{ pass: boolean; issues: string[] }> {
    const prompt = `Look at this mobile app screenshot taken on a large screen or foldable device in an expanded state.
The app should show a two-panel layout: a doctor list on the left and a booking area or placeholder on the right.
Check for: both panels visible, no content cut off or overflowing, readable text in both panels, a visible boundary between panels.
Respond with JSON only, no markdown: { "pass": boolean, "issues": string[] }
Return pass: true and an empty issues array if the dual-panel layout looks correct and usable.`
    const text = await callWithScreenshot(imagePath, prompt)
    return parseJson(text)
  },
}
