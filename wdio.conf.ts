import * as dotenv from 'dotenv'

dotenv.config()

const PLATFORM = (process.env.PLATFORM ?? 'android') as 'android' | 'ios'
const TAGS = process.env.TAGS ?? ''

const androidCapabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:app': process.env.ANDROID_APK_PATH,
  'appium:appPackage': process.env.ANDROID_APP_PACKAGE ?? 'com.clinicmobile',
  'appium:appActivity': process.env.ANDROID_APP_ACTIVITY ?? '.MainActivity',
  'appium:noReset': process.env.NO_RESET === 'true',
  'appium:newCommandTimeout': 120,
  'appium:autoGrantPermissions': true,
  // Required for TalkBack tests: keeps Appium tracking the app window
  // when the TalkBack overlay is active.
  'appium:enableMultiWindows': true,
}

const iosCapabilities = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:app': process.env.IOS_APP_PATH,
  'appium:bundleId': process.env.IOS_BUNDLE_ID ?? 'com.clinicmobile',
  'appium:noReset': process.env.NO_RESET === 'true',
  'appium:newCommandTimeout': 120,
  'appium:autoAcceptAlerts': true,
  // Without this, getContexts() may be called before WKWebView registers with
  // the XCUITest driver — returns only NATIVE_APP and the test fails immediately.
  'appium:webviewConnectTimeout': 5000,
}

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./features/**/*.feature', '../qa-portfolio-lab-course2/features/**/*.feature'],
  maxInstances: 1,

  hostname: 'localhost',
  port: 4723,
  path: '/',

  capabilities: [PLATFORM === 'ios' ? iosCapabilities : androidCapabilities],

  waitforTimeout: 30000,

  logLevel: 'warn',

  framework: 'cucumber',
  cucumberOpts: {
    require: [
      './step-definitions/**/*.ts',
      '../qa-portfolio-lab-course2/step-definitions/**/*.ts',
    ],
    tagExpression: TAGS,
    timeout: 180000,
  },

  reporters: [
    'spec',
    ['allure', {
      outputDir: 'allure-results',
      disableWebdriverStepsReporting: true,
    }],
  ],

  before() {
    // Page object factory picks platform-specific implementation
    process.env.PLATFORM = PLATFORM
  },
}
