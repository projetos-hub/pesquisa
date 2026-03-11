# ag-36 — Testar Manual via Playwright CLI

## Overview

This skill enables exploratory QA testing through Playwright CLI, allowing testers to interact with applications like real users. The agent navigates via browser commands rather than code inspection, capturing screenshots, console errors, and accessibility issues.

## Key Capabilities

The tool uses commands like `playwright-cli open [url]` and `playwright-cli snapshot` to navigate and retrieve element references. It supports interactive testing through actions such as clicks, text input, and selections on identified elements.

Distinguishing itself from ag-22, which writes Playwright scripts, this skill performs manual navigation and generates structured reports rather than automated test creation.

## Testing Approach

The workflow follows: "open → snapshot → interagir → screenshot → reportar"

Three modes are available:
- **Free exploration** without predefined scenarios
- **Directed testing** against specific workflow lists
- **Gap analysis** comparing visible features against existing E2E coverage

## Deliverable

Testing produces `manual-test-[date].md` reports documenting tested flows, discovered issues with evidence, accessibility concerns, UX suggestions, and E2E coverage gaps.

## Constraints

The skill uses Read, Glob, Grep, and Bash tools exclusively. It cannot write files directly or execute as an agent, with a 40-turn conversation limit using Claude Sonnet.
