// Renamed from stryker.config.ts on 2026-08-22. Stryker's config auto-discovery covers
// stryker.config.{json,js,mjs,cjs} — not .ts. With the .ts file it found no config at all,
// silently fell back to its defaults, and ran the *command* test runner, whose default
// command is `npm test` — in this repository that is `wdio run wdio.conf.ts`, an Appium
// suite needing a device. It hung until the dry-run timeout and reported "Something went
// wrong in the initial test run", which reads like a broken test rather than a config
// that was never read. `npx stryker run stryker.config.ts` worked, which is why the
// failure looked intermittent. Same behaviour on Stryker 8.7.1 and 9.6.1, so this predates
// the version bump; the mutation job is workflow_dispatch-only, so nothing reported it.

export default {
  mutate: [
    'pages/abstract/BasePage.ts',
    'support/adb.ts',
    'support/claude.ts',
  ],
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    config: {
      testEnvironment: 'node',
      testMatch: ['**/__tests__/helpers/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: './jest.helpers.tsconfig.json' }],
      },
    },
  },
  checkers: ['typescript'],
  tsconfigFile: './jest.helpers.tsconfig.json',
  thresholds: {
    high: 75,
    low: 55,
    break: 50,
  },
  reporters: ['html', 'json', 'progress'],
  // `fileName`, not `filePath` — the latter is rejected by the options validator
  // ("must NOT have additional properties"). Nobody saw that error while the config
  // itself was going unread.
  htmlReporter: { fileName: 'stryker-report/index.html' },
  jsonReporter: { fileName: 'stryker-report/result.json' },
  coverageAnalysis: 'perTest',
  ignoreStatic: true,
  // The sandbox is a copy of the project; there is no reason to copy 12MB of Allure
  // results or a previous mutation report into it.
  ignorePatterns: [
    'allure-results',
    'allure-report',
    'stryker-report',
    '.stryker-tmp',
    'maestro',
    'fastlane',
  ],
  dryRunTimeoutMinutes: 5,
}
