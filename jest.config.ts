export default {
  testEnvironment: 'node',
  testMatch: ['**/pact/**/*.test.ts', '**/ai-properties/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './jest.tsconfig.json' }],
  },
}
