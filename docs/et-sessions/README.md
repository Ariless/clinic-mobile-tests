# Exploratory Testing Sessions (SBTM)

Session-Based Test Management format. Each session = one charter, one timebox, one findings log.

## Charter template

```
Charter:    [Investigate / Explore / Verify] [target area] to [goal]
Tester:     [name]
Date:       [YYYY-MM-DD]
Timebox:    [60 | 90 | 120] min
Duration:   [actual time spent]

Setup:
  - SUT version / branch
  - Device / emulator
  - Environment

Coverage notes:
  - [what was covered]
  - [what was NOT covered and why]

Findings:
  BUG: [id] — [brief description] — Severity [1–4]
  OBS: [observation that is not a bug but worth noting]
  IDEA: [test idea to follow up]

Debrief (1–2 sentences):
  [What the session revealed about system quality or risk]
```

## Severity scale

| Level | Meaning |
|-------|---------|
| 1 | Blocker — cannot complete primary user task |
| 2 | High — significant degradation, workaround exists |
| 3 | Medium — minor degradation or edge case |
| 4 | Low — cosmetic / nice-to-have |
