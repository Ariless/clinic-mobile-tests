// Stubs for WebdriverIO globals so BasePage.ts compiles under the helpers tsconfig.
// At runtime these are replaced by jest.fn() mocks in beforeAll().
declare function $(selector: string): any
declare function $$(selector: string): any
// `browser` joined the list on 2026-08-21: selfHealingTap() takes a screenshot and synthesises a
// touch through it, and without the stub the whole helpers suite failed to compile rather than
// failing an assertion — silently, because the CI step swallowed the exit code.
declare const browser: any
