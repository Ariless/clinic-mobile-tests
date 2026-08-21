---
name: subagent-workflow
description: Delegating research and writing to subagents for large multi-file WDIO/Cucumber tasks. Use when: analysing multiple feature files or step-definitions before writing new ones; finding coverage gaps across the full test suite.
triggers:
  - analysing multiple feature files or step-definitions before writing new ones
  - finding coverage gaps across the full test suite
  - tasks with independent parallel parts (e.g. Android page objects + iOS page objects)
---

# Skill: Subagent Workflow

## WHEN to load this skill

Load when the task involves:
- Analysing multiple feature files or step-definitions before writing new ones
- Finding coverage gaps across the full test suite
- Tasks with independent parallel parts (e.g. Android page objects + iOS page objects)

---

## WHY

A single agent reading many feature files, step-definitions, and page objects pollutes its context window. Subagents start clean — they don't inherit the conversation history, so they stay focused. The main agent delegates research, gets a summary, then acts.

**Rule of thumb:** if a task requires reading more than ~5 files before writing a single line — delegate the reading to a subagent.

---

## HOW

### Three roles

| Role | Does | Gets |
|------|------|------|
| **Explorer** | reads files, finds patterns, locates existing steps | read-only tools |
| **Writer** | implements the change (page object, steps, support file) | edit + write tools |
| **Reviewer** | checks output against conventions from CLAUDE.md / SKILL.md | read-only tools |

### Workflow pattern

```
Main agent
  │
  ├── Explorer subagent ──► "Find all steps that use ApiClient.bookSlot — list file + line"
  │         └── returns: bullet list of locations
  │
  ├── [Main reads summary, decides what to write]
  │
  ├── Writer subagent ──► "Add getAppointmentStatus() to AppointmentsPage.ts"
  │         └── returns: file changed + tsc result
  │
  └── [Main reports to user]
```

### Prompt structure for a subagent

A subagent has no conversation context. Write the prompt as if briefing a colleague who just walked in:

```
Task: [what to do]
Project: clinic-mobile-tests at /Users/.../clinic-mobile-tests
Stack: WDIO 9 + Cucumber + TypeScript + Appium 3
Conventions: [paste relevant MUST rules or point to SKILL.md]
Input: [exactly which files or dirs to look at]
Output: [exactly what format you expect back — bullets, table, code block]
```

**Bad prompt:** "Check the booking steps and see if they cover error states."  
**Good prompt:** "Read step-definitions/booking.steps.ts. List every When/Then step title. Report as a bullet list. Do not edit any files."

### Parallel subagents

Use parallel subagents when tasks are fully independent:

```
[Android page objects]      [iOS page objects]      [Step-definition audit]
        │                          │                          │
        └───────────── merge → single report to user ────────┘
```

### When NOT to use a subagent

- Target file is already known → use Read directly
- Change is < 3 files → do it inline
- Task is sequential (step 1 output feeds step 2) → single agent, sequential calls

---

## WHAT — correct vs forbidden

| Situation | Correct | Forbidden |
|-----------|---------|-----------|
| Find all steps mentioning a testID | Explorer subagent | single agent reads 10 files |
| Android + iOS page objects independently | parallel subagents | sequential single agent |
| Known page object, add one method | inline Edit | unnecessary subagent |
| Subagent prompt | self-contained with context | assumes conversation history |
| Subagent output | structured (bullets, table, code) | free-form prose |

---

## See Also

- `.claude/skills/explore-before-write/SKILL.md` — single-agent version of pre-task exploration
- `CLAUDE.md` — audit-then-edit contract (propose scope before applying)
