---
name: research-capture
description: Capture a research finding into the workspace task graph as a node with evidence. Use when the user says "capture", "note this finding", or wants to record research progress.
user-invocable: true
---

# Research Capture Skill

Record a research finding as a node in the `research-workspace` task graph panel. The receiving surface starts with **zero context**, so every capture carries its own briefing.

**User's arguments:** $ARGUMENTS

## Prerequisites

Read the panel state first: open the `research-task-graph` panel for the current workspace and note existing node titles so the new node links instead of duplicating.

## Parsing arguments

1. **Finding title** — the imperative summary (anything before `|` or the whole argument when no separator).
2. **Evidence** — text after the first `|`; file paths, URLs, or quoted output.
3. **Kind** — default `evidence`; use `question` when the finding is an open question, `blocker` when it stops other work, `task` when it needs follow-up action.

## Capture

Call the plugin RPC `research-workspace.upsert-node` with `{ workspaceId, node: { id, kind, title, detail, status: "open" } }`, where `detail` holds the evidence text. When the finding answers or unblocks an existing node, follow up with `research-workspace.add-edge` (`answers` / `supports` / `depends_on`).

Do not edit repository files to record a finding; the graph is the record.
