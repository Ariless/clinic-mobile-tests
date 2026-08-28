export default {
  testEnvironment: 'node',
  // `differential/` was missing here while `npm run test:differential` existed and passed:
  // --passWithNoTests turned "this pattern matches nothing" into a green run, so the parity check
  // between the app's KEYWORD_MAP and the SUT's knowledge base had never executed. Same shape as
  // TST-03 in the API suite — a script that is listed, counted, and unable to run.
  testMatch: [
    '**/pact/**/*.test.ts',
    '**/ai-properties/**/*.test.ts',
    '**/differential/**/*.test.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './jest.tsconfig.json' }],
  },
}
