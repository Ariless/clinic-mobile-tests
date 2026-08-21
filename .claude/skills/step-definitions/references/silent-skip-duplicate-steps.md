# Failure mode: duplicate step definitions cause silent skip

## What happened

`ai.steps.ts` contained 4 steps already registered in `booking.steps.ts`:
- `Given('I am logged in as a patient')`
- `When('I select the first available doctor')`
- `When('I book the first available slot')`
- `When('I open My Visits')`

`chaos.steps.ts` had one more duplicate.

WDIO Cucumber showed no "Ambiguous step definition" error. All affected scenarios appeared as `-` with "N skipped" in the summary. No stack trace, no failure message.

## How to diagnose

```bash
grep -rh "^Given\|^When\|^Then" step-definitions/*.ts | sort | uniq -d
```

## Why it's silent

In this version of `@wdio/cucumber-framework`, duplicate step definitions put the scenario in pending state silently. The symptom ("all pending") does not point to the cause ("duplicate registration").

## Fix

Remove the duplicate step definitions. Each step text must appear exactly once across all step-definition files.
