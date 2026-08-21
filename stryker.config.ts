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
  htmlReporter: { filePath: 'stryker-report/index.html' },
  jsonReporter: { filePath: 'stryker-report/result.json' },
  coverageAnalysis: 'perTest',
  ignoreStatic: true,
}
