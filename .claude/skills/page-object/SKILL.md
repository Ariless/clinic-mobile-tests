---
name: page-object
description: Creating and editing mobile page objects for Android and iOS via BasePage. Use when: creating a new page object; adding selectors or actions to an existing page object.
triggers:
  - creating a new page object
  - adding selectors or actions to an existing page object
  - any task touching pages/android/, pages/ios/, or pages/abstract/BasePage.ts
---

# Skill: Page Objects (mobile)

## WHEN to load this skill

Load when the task involves:
- Creating a new page object
- Adding selectors or actions to an existing page object
- Any task touching `pages/android/`, `pages/ios/`, or `pages/abstract/BasePage.ts`

---

## WHY

Page objects in this project are platform-aware. The same logical page (LoginPage, BookingPage) has an Android and an iOS implementation. Step-definitions must never know which platform is running — that decision is made once in `factory.ts`.

Repeated element-querying patterns (find elements by content-desc prefix, extract ID from element) belong in `BasePage`, not duplicated in each page object. Duplication means the same fix in 3 files when Appium changes.

---

## HOW

### Phase 1 — Import from factory, never directly

```typescript
// CORRECT
import { LoginPage, BookingPage, AppointmentsPage } from '../pages/factory'

// WRONG — never import platform-specific directly in step-definitions
import { LoginPage } from '../pages/android/LoginPage' // ← forbidden in steps
```

### Phase 2 — Use BasePage methods, never raw selectors in page objects

```typescript
// CORRECT — use BasePage helpers
async tapConfirmButton(): Promise<void> {
    await this.tap('confirm-button')  // this.tap() from BasePage
}

async getAppointmentIds(): Promise<number[]> {
    const items = await this.findByPattern('appointment-item-.*')
    const ids: number[] = []
    for (let i = 0; i < await items.length; i++) {  // await items.length !
        const id = await this.getIdFromElement(await items[i], 'appointment-item-')
        ids.push(Number(id))
    }
    return ids
}

// WRONG — raw UiSelector in page object, duplicated across pages
const items = await $$('android=new UiSelector().descriptionMatches("appointment-item-.*")')
```

### Phase 3 — BasePage methods available

| Method | Use for |
|--------|---------|
| `this.el(testID)` | Get element by testID (returns ChainablePromiseElement) |
| `this.tap(testID)` | Wait for displayed + click |
| `this.typeText(testID, text)` | Clear + type text |
| `this.rid(testID)` | XPath by resource-id string |
| `this.waitForVisible()` | Wait for page root element |
| `this.findByPattern(pattern)` | Find elements by content-desc regex — returns ChainablePromiseArray |
| `this.getIdFromElement(el, prefix)` | Extract numeric ID from content-desc |

### Phase 4 — WDIO type rules

```typescript
// CORRECT — always await .length
const count = await items.length  // items is ChainablePromiseArray

// WRONG — never use .length without await
if (items.length === 0) { ... }  // silently wrong — Promise !== 0

// CORRECT — structural typing for element parameters
async getIdFromElement(
    el: { getAttribute(attr: string): Promise<string | null> },
    prefix: string
): Promise<string>

// WRONG — WebdriverIO.Element is too narrow
async getIdFromElement(el: WebdriverIO.Element, prefix: string)  // ← TS error
```

---

## WHAT — correct vs forbidden

| Situation | Correct | Forbidden |
|-----------|---------|-----------|
| Import page object in steps | `from '../pages/factory'` | `from '../pages/android/LoginPage'` |
| Find list of elements | `this.findByPattern('item-.*')` | Raw `$$('android=new UiSelector()...')` in page object |
| Check list length | `await items.length === 0` | `items.length === 0` |
| Extract ID from element | `this.getIdFromElement(el, 'prefix-')` | Manual getAttribute + replace in page object |
| Wait for element | `this.tap(testID)` or `waitForDisplayed()` | `waitForTimeout(2000)` |

---

## See Also

- `pages/abstract/BasePage.ts` — all base methods
- `pages/factory.ts` — platform-aware factory
- `.claude/skills/step-definitions/SKILL.md` — how steps use page objects
