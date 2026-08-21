// Local stub — mitmproxy integration not available in this environment.
// Real implementation starts/stops a mitmproxy process and reads its HAR log.
// Tests tagged @security (PII check) and @integration (stub rules) will skip
// their proxy-dependent assertions when this stub is active.

export interface StubRule {
  method: string
  path: string
  status: number
  body: Record<string, unknown>
}

interface Request {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

export const Proxy = {
  start(_stubs?: StubRule[]): void {},
  stop(): void {},
  setEmulatorProxy(): void {},
  thirdPartyRequests(): Request[] { return [] },
  capturedRequests(): Request[] { return [] },
  findPiiInRequest(_req: Request, _fields: string[]): string[] { return [] },
}
