import { execSync, spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const PROXY_PORT = 8080
const LOG_FILE = '/tmp/mitmproxy-requests.jsonl'
const STUB_FILE = '/tmp/mitmproxy-stubs.json'
const ADDON_SCRIPT = path.resolve(__dirname, 'mitmproxy-logger.py')
const STUB_SCRIPT = path.resolve(__dirname, 'mitmproxy-stub.py')

export interface StubRule {
  method: string
  path: string
  status: number
  body: Record<string, unknown>
}

// Known analytics / telemetry domains — requests to these are checked for PII
const THIRD_PARTY_DOMAINS = [
  'firebaseio.com',
  'firebase.google.com',
  'google-analytics.com',
  'analytics.google.com',
  'app-measurement.com',         // Firebase Performance
  'crashlytics.com',
  'sentry.io',
  'mixpanel.com',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'appsflyer.com',
  'adjust.com',
  'onesignal.com',
]

interface CapturedRequest {
  host: string
  url: string
  method: string
  query: Record<string, string>
  body: string
}

let mitmdumpProcess: ChildProcess | null = null

export const Proxy = {
  start(stubs?: StubRule[]): void {
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE)

    const args = ['-s', ADDON_SCRIPT, '--listen-port', String(PROXY_PORT), '--quiet']
    const env: NodeJS.ProcessEnv = { ...process.env, MITMPROXY_LOG_FILE: LOG_FILE }

    if (stubs && stubs.length > 0) {
      fs.writeFileSync(STUB_FILE, JSON.stringify(stubs))
      // Insert stub script after logger script so logger runs first
      args.splice(2, 0, '-s', STUB_SCRIPT)
      env.MITMPROXY_STUB_FILE = STUB_FILE
    }

    mitmdumpProcess = spawn('mitmdump', args, { env, stdio: 'ignore' })

    // Give mitmdump time to bind the port
    execSync('sleep 1')
  },

  // Route emulator traffic through the running mitmdump proxy.
  // Must be called AFTER the app's JS bundle has fully loaded — if called while
  // React Native is still initialising, its native-layer requests go through the
  // proxy and crash the process (DeadObjectException / blank screen).
  setEmulatorProxy(): void {
    execSync(`adb shell settings put global http_proxy 10.0.2.2:${PROXY_PORT}`)
  },

  stop(): void {
    // Remove emulator proxy settings.
    // 'settings put global http_proxy' sets both http_proxy AND global_http_proxy_host/port —
    // deleting only http_proxy leaves global_http_proxy_host intact and keeps blocking traffic.
    try {
      execSync('adb shell settings put global http_proxy :0', { stdio: 'ignore' })
      execSync('adb shell settings delete global global_http_proxy_host', { stdio: 'ignore' })
      execSync('adb shell settings delete global global_http_proxy_port', { stdio: 'ignore' })
      execSync('adb shell settings delete global global_http_proxy_exclusion_list', { stdio: 'ignore' })
    } catch { /* emulator may not be running */ }

    if (mitmdumpProcess) {
      mitmdumpProcess.kill('SIGTERM')
      mitmdumpProcess = null
    }
  },

  capturedRequests(): CapturedRequest[] {
    if (!fs.existsSync(LOG_FILE)) return []
    return fs
      .readFileSync(LOG_FILE, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as CapturedRequest)
  },

  thirdPartyRequests(): CapturedRequest[] {
    return this.capturedRequests().filter(r =>
      THIRD_PARTY_DOMAINS.some(domain => r.host.endsWith(domain)),
    )
  },

  findPiiInRequest(req: CapturedRequest, pii: string[]): string[] {
    const haystack = [
      req.url,
      req.body,
      Object.values(req.query).join(' '),
    ].join(' ').toLowerCase()

    return pii.filter(value => value.length > 3 && haystack.includes(value.toLowerCase()))
  },
}
