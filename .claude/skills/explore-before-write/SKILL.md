---
name: explore-before-write
description: Research testIDs via adb dump, BasePage methods, and ApiClient before writing new locators or steps. Use when: writing a new page object or adding a locator; writing a step for an action you haven't automated before.
triggers:
  - writing a new page object or adding a locator
  - writing a step for an action you haven't automated before
  - adding an API call to ApiClient
---

# Skill: Explore Before Write

## WHEN to load this skill

Load when the task involves:
- Writing a new page object or adding a locator
- Writing a step for an action you haven't automated before
- Adding an API call to ApiClient

---

## WHY

Assuming element IDs or API shapes without checking leads to tests that appear to work but silently miss the real element. A 5-minute exploration saves a debugging session on the emulator.

---

## HOW

### Mobile — find the real element ID before writing a locator

Use Appium Inspector or `adb` to see what's actually on screen:

```bash
# Dump current UI hierarchy
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml && cat /tmp/ui.xml | grep -o 'resource-id="[^"]*"' | sort -u

# Find elements with a specific testID prefix
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml && grep -o 'content-desc="[^"]*"' /tmp/ui.xml
```

Or use `BasePage.findByPattern()` pattern — it queries live elements on device:

```typescript
// CORRECT — verify testID exists on device first, then write the locator
const btn = await this.el('booking-submit-button')  // el() uses rid() which wraps real resource-id

// WRONG — assume testID matches source code without checking on device
```

### API — check real response shape before writing assertions

```bash
# Call the endpoint directly
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/appointments/my | node -e "const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d.join('')), null, 2)))"
```

Or add a temporary `console.log(response)` in a step, run once, then replace with proper assertions.

### Steps — grep before adding

Duplicate step definitions cause **silent pending** — the scenario shows as pending with no error:

```bash
# Always check before adding
grep -rh "^Given\|^When\|^Then" step-definitions/
```

### Page objects — check BasePage first

Before adding a helper method to a page object, check if it belongs in `BasePage`:

```bash
grep -n "findByPattern\|getIdFromElement\|waitForVisible\|tap\|typeText" pages/abstract/BasePage.ts
```

---

## WHAT — correct vs forbidden

| Situation | Correct | Forbidden |
|-----------|---------|-----------|
| New element locator | dump UI hierarchy or use Appium Inspector first | assume resource-id from source code |
| New API assertion | call endpoint, inspect shape | guess field names |
| New step definition | grep existing steps first | add duplicate (silent pending) |
| New BasePage method | check if pattern already exists | duplicate in page object |

---

## See Also

- `.claude/skills/page-object/SKILL.md` — locator conventions and BasePage patterns
- `.claude/skills/step-definitions/SKILL.md` — step reuse rules
- `.claude/skills/api-client/SKILL.md` — ApiClient conventions
