import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

// Targets the booted simulator by default. Set IOS_DEVICE_UDID for a specific device.
const DEVICE = process.env.IOS_DEVICE_UDID ?? 'booted'

function simctl(command: string): string {
  return execSync(`xcrun simctl ${command}`, { encoding: 'utf-8' }).trim()
}

export const XCRun = {
  // Terminate the app process (equivalent of ADB.forceStop).
  forceStop(bundleId: string): void {
    try {
      simctl(`terminate ${DEVICE} ${bundleId}`)
    } catch {
      // terminate throws if the app is not running — treat as success
    }
  },

  // Cold start: terminate → launch → return elapsed ms.
  // Unlike `adb am start -W`, simctl launch does not return TotalTime,
  // so we measure wall-clock time from invoke to command return.
  coldStart(bundleId: string): number {
    this.forceStop(bundleId)
    const start = Date.now()
    simctl(`launch ${DEVICE} ${bundleId}`)
    return Date.now() - start
  },

  // Open the app (warm start — process may already exist).
  openApp(bundleId: string): void {
    simctl(`launch ${DEVICE} ${bundleId}`)
  },

  // Stream recent logs (equivalent of ADB.logcat).
  // Returns last 60 seconds of unified log for the given process name.
  getLog(processName?: string): string {
    const predicate = processName ? `--predicate 'process == "${processName}"'` : ''
    return execSync(
      `xcrun simctl spawn ${DEVICE} log show --last 60s --style compact ${predicate}`,
      { encoding: 'utf-8' }
    )
  },

  // Erase the simulator's log store (equivalent of ADB.clearLogcat).
  clearLog(): void {
    simctl(`spawn ${DEVICE} log erase --all`)
  },

  // Slow network on iOS Simulator requires Network Link Conditioner
  // (Additional Tools for Xcode). There is no scriptable simctl equivalent.
  // For CI: apply an NLC profile before starting the test suite.
  // For local: enable "3G" or "Edge" preset in Network Link Conditioner.app.
  setSlowNetwork(_latencyMs = 2000): void {
    console.warn(
      'XCRun.setSlowNetwork: iOS Simulator network throttling requires ' +
      'Network Link Conditioner — configure the profile before running @chaos scenarios'
    )
  },

  clearSlowNetwork(): void {
    console.warn('XCRun.clearSlowNetwork: disable Network Link Conditioner profile manually')
  },

  // Simulate pressing the Home button by suspending the app.
  // xcrun simctl has no direct home-button command; terminate is the closest equivalent.
  pressHome(bundleId: string): void {
    simctl(`terminate ${DEVICE} ${bundleId}`)
  },

  // Set the simulator timezone (useful for locale × timezone pairwise tests).
  setTimezone(tz: string): void {
    simctl(`timezone set ${DEVICE} ${tz}`)
  },

  // Set biometric enrollment state on the simulator.
  enrollBiometric(enrolled = true): void {
    simctl(`biometric ${DEVICE} --${enrolled ? 'enrolled' : 'unenrolled'}`)
  },

  // Capture a screenshot to the given file path.
  screenshot(outputPath: string): void {
    simctl(`io ${DEVICE} screenshot ${outputPath}`)
  },

  // Install an .app bundle onto the booted simulator.
  install(appPath: string): void {
    simctl(`install ${DEVICE} ${appPath}`)
  },

  setDarkMode(): void {
    simctl(`ui ${DEVICE} appearance dark`)
  },

  setLightMode(): void {
    simctl(`ui ${DEVICE} appearance light`)
  },

  // Return the .app bundle path for an installed app.
  // Throws if the app is not installed — callers can catch to detect missing app.
  getAppBundlePath(bundleId: string): string {
    return simctl(`get_app_container ${DEVICE} ${bundleId}`)
  },

  // True if PrivacyInfo.xcprivacy exists inside the app bundle.
  hasPrivacyManifest(bundleId: string): boolean {
    const appPath = this.getAppBundlePath(bundleId)
    return existsSync(path.join(appPath, 'PrivacyInfo.xcprivacy'))
  },

  // Parse PrivacyInfo.xcprivacy from the app bundle as a JSON object.
  // Uses plutil to convert the binary/XML plist to JSON so callers don't need a plist parser.
  readPrivacyManifest(bundleId: string): Record<string, unknown> {
    const appPath = this.getAppBundlePath(bundleId)
    const manifestPath = path.join(appPath, 'PrivacyInfo.xcprivacy')
    const json = execSync(`plutil -convert json -o - "${manifestPath}"`, { encoding: 'utf-8' })
    return JSON.parse(json)
  },

  // Parse Info.plist from the app bundle as a JSON object.
  readInfoPlist(bundleId: string): Record<string, unknown> {
    const appPath = this.getAppBundlePath(bundleId)
    const plistPath = path.join(appPath, 'Info.plist')
    const json = execSync(`plutil -convert json -o - "${plistPath}"`, { encoding: 'utf-8' })
    return JSON.parse(json)
  },
}
