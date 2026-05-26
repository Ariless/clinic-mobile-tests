import { execSync } from 'child_process'

function adb(command: string): string {
  return execSync(`adb shell ${command}`, { encoding: 'utf-8' }).trim()
}

export const ADB = {
  disableWifi(): void {
    adb('svc wifi disable')
  },

  enableWifi(): void {
    adb('svc wifi enable')
  },

  pressHome(): void {
    adb('input keyevent KEYCODE_HOME')
  },

  openApp(packageName: string): void {
    adb(`monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`)
  },

  forceStop(packageName: string): void {
    adb(`am force-stop ${packageName}`)
  },

  clearAppData(packageName: string): void {
    execSync(`adb shell pm clear ${packageName}`, { stdio: 'ignore' })
  },

  logcat(filter?: string): string {
    const cmd = filter ? `logcat -d ${filter}` : 'logcat -d'
    return execSync(`adb ${cmd}`, { encoding: 'utf-8' })
  },

  clearLogcat(): void {
    execSync('adb logcat -c')
  },

  gfxinfo(packageName: string): string {
    return adb(`dumpsys gfxinfo ${packageName}`)
  },

  resetGfxinfo(packageName: string): void {
    adb(`dumpsys gfxinfo ${packageName} reset`)
  },

  // Parses Total frames rendered and Janky frames from dumpsys gfxinfo output.
  // Returns jankRate as a fraction (0.05 = 5%).
  parseJankRate(packageName: string): { totalFrames: number; jankyFrames: number; jankRate: number } {
    const output = adb(`dumpsys gfxinfo ${packageName}`)
    const totalMatch = output.match(/Total frames rendered:\s*(\d+)/)
    const jankyMatch = output.match(/Janky frames:\s*(\d+)/)
    if (!totalMatch || !jankyMatch) {
      throw new Error(`Could not parse gfxinfo output (app may not have rendered any frames yet):\n${output.slice(0, 500)}`)
    }
    const totalFrames = parseInt(totalMatch[1], 10)
    const jankyFrames = parseInt(jankyMatch[1], 10)
    const jankRate = totalFrames > 0 ? jankyFrames / totalFrames : 0
    return { totalFrames, jankyFrames, jankRate }
  },

  meminfo(packageName: string): string {
    return adb(`dumpsys meminfo ${packageName}`)
  },

  // Returns total PSS (Proportional Set Size) in KB for the running app process.
  // Parses the "TOTAL:" aggregate line from dumpsys meminfo output.
  parseTotalPss(packageName: string): number {
    const output = adb(`dumpsys meminfo ${packageName}`)
    const match = output.match(/\bTOTAL:\s+(\d+)/)
    if (!match) throw new Error(`Could not parse PSS from meminfo (is the app running?):\n${output.slice(0, 500)}`)
    return parseInt(match[1], 10)
  },

  // Force-stops the app, then cold-launches it via am start -W.
  // Returns TotalTime in milliseconds as reported by Android activity manager.
  coldStart(packageName: string, activity = '.MainActivity'): number {
    adb(`am force-stop ${packageName}`)
    const output = adb(`am start -W -n ${packageName}/${activity}`)
    const match = output.match(/TotalTime:\s*(\d+)/)
    if (!match) throw new Error(`Could not parse TotalTime from am start output:\n${output}`)
    return parseInt(match[1], 10)
  },

  isInstalled(packageName: string): boolean {
    try {
      const out = execSync(`adb shell pm path ${packageName}`, { encoding: 'utf-8' }).trim()
      return out.startsWith('package:')
    } catch {
      return false
    }
  },

  // Pulls the installed APK from the device and returns decoded AndroidManifest.xml as text.
  // Requires aapt2 — resolved from $ANDROID_HOME/build-tools or PATH.
  pullApkManifestXml(packageName: string): string {
    const pmOut = execSync(`adb shell pm path ${packageName}`, { encoding: 'utf-8' }).trim()
    const apkPath = pmOut.replace('package:', '').trim()
    const localApk = `/tmp/${packageName}.apk`
    execSync(`adb pull "${apkPath}" "${localApk}"`)
    const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? ''
    let aapt2 = 'aapt2'
    if (androidHome) {
      try {
        const found = execSync(
          `find "${androidHome}/build-tools" -name "aapt2" -type f 2>/dev/null | sort -rV | head -1`,
          { encoding: 'utf-8' },
        ).trim()
        if (found) aapt2 = found
      } catch { /* stay with aapt2 from PATH */ }
    }
    return execSync(`"${aapt2}" dump xmltree "${localApk}" --file AndroidManifest.xml`, { encoding: 'utf-8' })
  },

  // Decompiles the installed APK with apktool and greps smali + assets + res for
  // secret-shaped strings. Returns one line per match (file:line:match).
  // Cleans up the decompiled directory before returning.
  // Requires: apktool in PATH (brew install apktool).
  scanApkForSecrets(packageName: string): string[] {
    const pmOut = execSync(`adb shell pm path ${packageName}`, { encoding: 'utf-8' }).trim()
    const apkPath = pmOut.replace('package:', '').trim()
    const localApk = `/tmp/${packageName}.apk`
    const decompileDir = `/tmp/${packageName}-decompiled`

    execSync(`adb pull "${apkPath}" "${localApk}"`)
    execSync(`apktool d "${localApk}" -o "${decompileDir}" --force -q`)

    // Patterns that indicate real secrets — not generic words like "password" in UI strings
    const secretPatterns = [
      'sk-ant-',                  // Anthropic API key
      'sk_live',                  // Stripe live key
      'AIzaSy',                   // Google API key
      'Bearer ey',                // hardcoded JWT bearer token
      'ANTHROPIC_API_KEY=',       // env var name with value inline
      'api_key=',                 // key=value pair (lowercase)
      'API_KEY=',                 // key=value pair (uppercase)
    ]

    const grepFlags = secretPatterns.map(p => `-e "${p}"`).join(' ')
    const dirsToScan = [
      `"${decompileDir}/smali"`,
      `"${decompileDir}/assets"`,
      `"${decompileDir}/res"`,
    ].filter(d => {
      try { execSync(`test -d ${d}`); return true } catch { return false }
    })

    let matches: string[] = []
    if (dirsToScan.length > 0) {
      try {
        const result = execSync(
          `grep -rn ${grepFlags} ${dirsToScan.join(' ')} 2>/dev/null`,
          { encoding: 'utf-8' },
        ).trim()
        if (result) matches = result.split('\n').filter(Boolean)
      } catch {
        // grep exits 1 when no matches — that's the success case
      }
    }

    execSync(`rm -rf "${decompileDir}"`, { stdio: 'ignore' })
    return matches
  },

  // Returns the Android UID (e.g. 10123) for the given package name.
  getAppUid(packageName: string): number {
    const output = execSync(`adb shell dumpsys package ${packageName}`, { encoding: 'utf-8' })
    const match = output.match(/userId=(\d+)/)
    if (!match) throw new Error(`Could not find userId for ${packageName}`)
    return parseInt(match[1], 10)
  },

  // Returns the number of PARTIAL_WAKE_LOCK entries currently held by the app.
  // Uses dumpsys power which shows live wake lock state — no reset needed.
  getHeldWakeLockCount(packageName: string): number {
    const uid = this.getAppUid(packageName)
    const output = adb('dumpsys power')
    const lines = output.split('\n')
    return lines.filter(l => l.includes('PARTIAL_WAKE_LOCK') && l.includes(`HELD_BY_UID=${uid}`)).length
  },

  setSlowNetwork(latencyMs = 2000): void {
    adb(`tc qdisc add dev wlan0 root netem delay ${latencyMs}ms`)
  },

  clearSlowNetwork(): void {
    adb('tc qdisc del dev wlan0 root')
  },

  // Enables TalkBack screen reader via accessibility settings.
  // After enabling, allow 2 s for TalkBack to initialise before interacting.
  // Call disableTalkBack() in After() to ensure cleanup even on test failure.
  enableTalkBack(): void {
    adb('settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.accessibility.talkback.TalkBackService')
    adb('settings put secure accessibility_enabled 1')
    execSync('sleep 2')
  },

  disableTalkBack(): void {
    try {
      adb('settings put secure accessibility_enabled 0')
      adb('settings put secure enabled_accessibility_services :')
    } catch { /* emulator may not be running */ }
  },

  // Forces the device into Doze mode immediately via deviceidle.
  // On a real device, Doze requires the screen to be off and no motion detected;
  // force-idle bypasses that check so tests can reproduce Doze behaviour reliably.
  // Fires an Android VIEW intent for the given URL, routing it to the clinic app.
  // Use for testing deep links: clinic://appointment/123
  openDeepLink(url: string): void {
    execSync(
      `adb shell am start -a android.intent.action.VIEW -d "${url}" com.anonymous.clinicmobile`,
      { stdio: 'ignore' },
    )
  },

  enterDozeMode(): void {
    adb('dumpsys deviceidle force-idle')
  },

  // Returns the device to normal operation after a Doze test.
  // Always call this in After() as a safety net — repeated calls are safe.
  exitDozeMode(): void {
    try {
      adb('dumpsys deviceidle force-active')
    } catch { /* device may have already exited Doze */ }
  },

  // Returns the current Doze state string (e.g. "IDLE", "ACTIVE", "IDLE_PENDING").
  // Useful for attaching diagnostic info on failure.
  getDozeState(): string {
    try {
      return adb('dumpsys deviceidle | grep mState')
    } catch {
      return 'unknown'
    }
  },

  setDarkMode(): void {
    adb('cmd uimode night yes')
  },

  setLightMode(): void {
    adb('cmd uimode night no')
  },

  // Returns the physical display density in dpi.
  // Used to convert px → dp: dp = px * 160 / density.
  // Falls back to 160 (mdpi baseline) if the command fails.
  getDisplayDensity(): number {
    try {
      const output = adb('wm density')
      const match = output.match(/\d+/)
      return match ? parseInt(match[0], 10) : 160
    } catch {
      return 160
    }
  },

  // Sets the display size to simulate a foldable or large-screen form factor.
  // Use resetDisplaySize() in After() to restore the emulator to its default resolution.
  setDisplaySize(width: number, height: number): void {
    adb(`wm size ${width}x${height}`)
  },

  // Resets the display size to the emulator's physical resolution.
  resetDisplaySize(): void {
    adb('wm size reset')
  },
}
