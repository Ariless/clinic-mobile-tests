export default {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/helpers/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './jest.helpers.tsconfig.json' }],
  },
}
