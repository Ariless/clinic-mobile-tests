# clinic-mobile-tests — agent conventions

## What this is

WDIO + Cucumber BDD test suite for the clinic mobile app (React Native). Tests run against a real Android/iOS device or emulator via Appium.

## Running tests

```bash
# All tests
npm test

# By tag
TAGS="@booking" npm test
TAGS="@smoke" npm test
TAGS="@security" npm test

# Single feature
npx wdio wdio.conf.ts --spec features/booking.feature

# Platform
PLATFORM=ios npm test
PLATFORM=android npm test   # default
```

SUT must be running: `cd ../sut && npm run dev` (port 3000).
Appium server must be running: `appium` (port 4723).

## File layout

```
features/           Gherkin .feature files — one per domain
step-definitions/   Step implementations — one file per feature domain
pages/
  abstract/         BasePage.ts — shared selectors, tap, typeText, waitForVisible
  android/          Android-specific page objects
  ios/              iOS-specific page objects
  factory.ts        Platform-aware page object factory — import from here only
support/
  apiClient.ts      ApiClient — all HTTP calls go here
  adb.ts            ADB helpers
  loki.ts           Loki log queries for observability tests
```

## SUT surface map

`docs/SURFACEMAP.md` — compact index of all screens, testIDs, selector formats, dynamic patterns, seed accounts, and env flags. Read it before writing page objects or step-definitions.

---

## Agent rules — MUST / SHOULD / WON'T

### MUST
- Load the matching skill from `.claude/skills/` before starting any task — see Skills index below; load every skill that applies, not just one
- Import page objects from `pages/factory.ts` only — never directly from `pages/android/` or `pages/ios/`
- `await items.length` not `items.length` — `$$()` returns `ChainablePromiseArray`, `.length` is a Promise
- All HTTP through `support/apiClient.ts` — never raw `fetch()` in step-definitions
- Instantiate page objects in `Before()` hook — never in step body
- Check for existing steps before adding new ones: `grep -rh "^Given\|^When\|^Then" step-definitions/`
- After any TS change: `npx tsc --noEmit` — zero errors before reporting done

### SHOULD
- Use module-level variables for state shared across steps (token, appointmentId) — reset in `Before()`
- Reuse existing step definitions across feature files — don't duplicate steps that already exist
- Structural typing `{ getAttribute(): Promise<string|null> }` for element parameters — not `WebdriverIO.Element`

### WON'T
- `waitForTimeout` — use `waitForDisplayed`, `waitForExist`, or `BasePage.waitForVisible()`
- Direct imports from `pages/android/` or `pages/ios/` — use `factory.ts`
- `items.length` without `await`
- Commit — show commands, user runs them

---

## Task rhythm

For every non-trivial task, follow these phases in order:

1. **Read** — read all relevant files before writing anything
2. **Scope** — list exactly which files will change and why; wait for confirmation if scope is unclear
3. **Skills** — load the matching skill from `.claude/skills/`
4. **Write** — implement the change
5. **Verify** — `npx tsc --noEmit`; zero errors
6. **Report** — show git commands; state what changed and what's next

---

## Audit-then-edit

When a task touches multiple files or has unclear scope:
1. Read all affected files first
2. Propose the full list of changes (file → what changes, why)
3. Wait for confirmation before editing
4. Apply all changes
5. Report: what changed, what was skipped, what's next

---

## Key conventions

**Page objects** — always import from `pages/factory.ts`, never directly from `pages/android/` or `pages/ios/`. Instantiate in `Before()` hook, not in step body.

**BasePage** — all page objects extend `BasePage`. Use `this.el()`, `this.tap()`, `this.typeText()`, `this.rid()` from BasePage. Repeated element-querying patterns (find by content-desc prefix, extract ID from element) belong in BasePage — not duplicated in each page object.

**ApiClient** — all HTTP calls go through `support/apiClient.ts`. Never use raw `fetch()` in step-definitions.

**Shared state** — use module-level variables in step-definition files for state shared across steps in a scenario (token, appointmentId, selected names). Reset in `Before()`.

**Step definitions** — steps are global across all files. Check for existing steps with `grep -rh "^Given\|^When\|^Then" step-definitions/` before adding new ones. Duplicate step definitions cause silent skip — tests show as pending with no error.

**No `waitForTimeout`** — use `waitForDisplayed`, `waitForExist`, or `waitForVisible()` from BasePage.

## WDIO type gotchas

**`await items.length`, never `items.length`** — `$$()` returns `ChainablePromiseArray`. Its `.length` is `Promise<number>`, not `number`. `if (items.length === 0)` silently never throws.

**Structural typing for element parameters** — `await items[0]` returns `ChainablePromiseElement`, not `WebdriverIO.Element`. Use `{ getAttribute(attr: string): Promise<string | null> }` as the parameter type instead of `WebdriverIO.Element`.

## React Native New Architecture gotchas

**Stale element in `typeText`** — `BasePage.typeText` re-queries the element with a fresh `this.el(testID)` call before `setValue`. Never cache `const el = this.el(testID)` and reuse it across multiple operations: in New Architecture, `onChangeText` on a TextInput causes a re-render that recreates the native view and invalidates the cached element ID.

**Untagged `Before()` is global** — a `Before(async function() {...})` without a tag filter runs for **every scenario** in every feature file loaded by WDIO. If a step-definition file has an untagged Before that restarts the app, it runs even for `@maps`, `@offline`, etc. scenarios. Only add app-restart logic to untagged Before if you intend it to be global; otherwise use `Before({ tags: '@mytag' }, ...)`.

**App-side re-renders during login** — avoid `useEffect` calls that trigger `setState` (e.g. health checks, feature flag fetches) on the login screen. React Native New Architecture commits re-renders synchronously; if a re-render fires between Appium's `waitForDisplayed` and `setValue`, the element is stale. Move such effects to after login.

## Skills index

Load the relevant skill file before starting a task. Do not load all skills at once.

| Skill | Load when |
|-------|-----------|
| `.claude/skills/page-object/SKILL.md` | creating or editing page objects; adding new selectors or actions |
| `.claude/skills/step-definitions/SKILL.md` | writing new step definitions; adding steps to existing files |
| `.claude/skills/api-client/SKILL.md` | adding API calls in step definitions or support files |
| `.claude/skills/explore-before-write/SKILL.md` | before writing any new locator, step, or API call — verify real app/existing code first |
| `.claude/skills/subagent-workflow/SKILL.md` | task requires reading many files before writing; parallel Android + iOS work; coverage gap analysis |

## What NOT to do

- Don't import page objects directly from `pages/android/` or `pages/ios/` — use `factory.ts`
- Don't instantiate page objects in step body — use `Before()` hook
- Don't use raw `fetch()` in step-definitions — use `ApiClient`
- Don't use `items.length` without `await`
- Don't add a step that already exists in another step-definition file
- Don't commit — show the commands, user runs them
