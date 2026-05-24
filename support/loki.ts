// Loki HTTP API helpers — mirror of the pattern in clinic-booking-api-tests/observability.loki.test.ts.
// Requires observability stack:
//   docker-compose -f docker-compose.yml -f docker-compose.observability.yml up

const LOKI_BASE = process.env.LOKI_URL ?? 'http://localhost:3100'
const LOKI_QUERY_URL = `${LOKI_BASE}/loki/api/v1/query_range`

export async function isLokiReady(): Promise<boolean> {
  try {
    const res = await fetch(`${LOKI_BASE}/ready`)
    return res.ok
  } catch {
    return false
  }
}

// Searches for any log line in the clinic-api job that contains searchTerm as a substring.
async function queryLoki(searchTerm: string, startMs: number): Promise<unknown[]> {
  const startNs = (startMs * 1_000_000).toString()
  const endNs = (Date.now() * 1_000_000).toString()
  const query = `{job="clinic-api"} |= ${JSON.stringify(searchTerm)}`
  const params = new URLSearchParams({ query, start: startNs, end: endNs, limit: '50' })
  const res = await fetch(`${LOKI_QUERY_URL}?${params}`)
  if (!res.ok) return []
  const json = await res.json() as { data?: { result?: unknown[] } }
  return json?.data?.result ?? []
}

// Polls Loki until at least one result appears or timeout is reached.
// Promtail ingestion has ~1–3 s lag — polling loop is necessary.
export async function waitForLokiLog(searchTerm: string, startMs: number, timeoutMs = 15000): Promise<unknown[]> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const results = await queryLoki(searchTerm, startMs)
    if (results.length > 0) return results
    await new Promise<void>(r => setTimeout(r, 1500))
  }
  return []
}

type LogStream = { values: Array<[string, string]> }

// Flattens Loki stream results into parsed JSON log objects.
export function parseLogLines(results: unknown[]): Array<Record<string, unknown>> {
  return (results as LogStream[])
    .flatMap(stream => stream.values.map(([, line]) => {
      try { return JSON.parse(line) as Record<string, unknown> } catch { return null }
    }))
    .filter((l): l is Record<string, unknown> => l !== null)
}
