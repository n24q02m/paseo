---
name: research-decide
description: Record a decision with rationale and rejected alternatives into the research decision log. Use when the user says "decide", "record this decision", or wants to close an open question.
user-invocable: true
---

# Research Decide Skill

Close an open question by recording a decision in the `research-decision-log` panel. The log is append-only; corrections are new entries, never edits.

**User's arguments:** $ARGUMENTS

## Prerequisites

Read the `research-decision-log` panel for the current workspace first so the new entry references (not repeats) prior decisions.

## Parsing arguments

1. **Decision** — text before the first `|` (or the whole argument).
2. **Rationale** — text after the first `|`; why this option won.
3. **Alternatives** — text after the second `|`, separated by `;`; options considered and rejected.

## Record

Call the plugin RPC `research-workspace.record-decision` with `{ workspaceId, decision: { title, rationale, alternatives } }`. Link the decision back to the graph when it resolves a node: `research-workspace.add-edge` with kind `answers` from the decision's evidence node to the question node.

Do not wait or poll after recording; return the decision title and timestamp to the user.
