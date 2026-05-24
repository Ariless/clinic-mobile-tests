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

// Claude occasionally wraps JSON in ```json ... ``` — strip before parsing
function parseJson<T>(text: string): T {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(stripped) as T
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
}
