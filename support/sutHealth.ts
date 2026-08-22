import { execFileSync } from 'node:child_process'

export type SutHealth = {
  /** A server answered at the health URL. */
  reachable: boolean
  /** Which recommendation path the server is configured to take: 'mock' | 'claude' | 'ai-service'. */
  aiImplementation: string | null
}

/**
 * Synchronous health probe for the SUT.
 *
 * Jest decides which describe blocks to skip before any async hook runs, so the
 * check has to be synchronous. It runs one short-lived node process that fetches
 * /health once and prints the body.
 *
 * Why this exists: the AI property suite used to gate on ENABLE_AI_RECOMMENDATION
 * alone. That flag states an intention about the SUT's configuration, not whether
 * a server is running — so with the flag set locally and nothing listening, eight
 * tests failed with "fetch failed" instead of skipping. CI never saw it, because
 * CI never sets the flag.
 *
 * aiImplementation answers the second half: a test that asserts on the quality of
 * generated prose is meaningless against the mock, whose reasoning is a fixed
 * template. The mode belongs to the server, so it is read from the server rather
 * than from a local env var that only describes what the caller intended.
 */
export function readSutHealth(url: string, timeoutMs = 2000): SutHealth {
  const probe = `
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), ${timeoutMs})
    fetch(${JSON.stringify(url)}, { signal: c.signal })
      .then(r => r.json())
      .then(b => { clearTimeout(t); process.stdout.write(JSON.stringify(b)); process.exit(0) })
      .catch(() => { clearTimeout(t); process.exit(1) })
  `
  try {
    const out = execFileSync(process.execPath, ['-e', probe], {
      encoding: 'utf8',
      timeout: timeoutMs + 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const body = JSON.parse(out) as { checks?: { ai?: { implementation?: string } } }
    return { reachable: true, aiImplementation: body.checks?.ai?.implementation ?? null }
  } catch {
    return { reachable: false, aiImplementation: null }
  }
}
