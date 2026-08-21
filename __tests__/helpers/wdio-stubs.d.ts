// Stubs for WebdriverIO globals so BasePage.ts compiles under the helpers tsconfig.
// At runtime these are replaced by jest.fn() mocks in beforeAll().
declare function $(selector: string): any
declare function $$(selector: string): any
