import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { workspaceStateSchema } from "../shared/state";
import {
  __resetForTests,
  addEdge,
  getState,
  recordDecision,
  removeEdge,
  removeNode,
  stateFilePathFor,
  upsertNode,
} from "./store";

// File-level isolation: every suite (including the in-memory ones, which now
// write through to disk) runs against a throwaway data dir - never the real
// ~/.paseo tree.
let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "research-workspace-store-"));
  process.env.RESEARCH_WORKSPACE_DATA_DIR = dataDir;
  __resetForTests();
});

afterEach(() => {
  delete process.env.RESEARCH_WORKSPACE_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

describe("research-workspace server store", () => {
  it("starts empty per workspace and validates the shared schema", () => {
    __resetForTests();
    const state = getState({ workspaceId: "ws-a" });
    expect(state).toEqual({ nodes: [], edges: [], decisions: [] });
    expect(() => workspaceStateSchema.parse(state)).not.toThrow();
    // Isolation: a second workspace is unaffected.
    expect(getState({ workspaceId: "ws-b" })).toEqual({ nodes: [], edges: [], decisions: [] });
  });

  it("upserts nodes and removes a node with its incident edges", () => {
    __resetForTests();
    const first = upsertNode({
      workspaceId: "ws-a",
      node: { id: "n1", kind: "task", title: "Map the area", detail: "", status: "open" },
    });
    expect(first.id).toBe("n1");
    const updated = upsertNode({
      workspaceId: "ws-a",
      node: {
        id: "n1",
        kind: "task",
        title: "Map the area v2",
        detail: "scoped",
        status: "in_progress",
      },
    });
    expect(updated.title).toBe("Map the area v2");
    expect(updated.status).toBe("in_progress");

    upsertNode({
      workspaceId: "ws-a",
      node: { id: "n2", kind: "evidence", title: "Upstream README", detail: "", status: "open" },
    });
    const edge = addEdge({
      workspaceId: "ws-a",
      edge: { fromId: "n2", toId: "n1", kind: "supports" },
    });
    expect(edge.fromId).toBe("n2");

    const removed = removeNode({ workspaceId: "ws-a", nodeId: "n1" });
    expect(removed.removedEdges).toBe(1);
    expect(getState({ workspaceId: "ws-a" }).nodes.map((node) => node.id)).toEqual(["n2"]);
  });

  it("rejects edges with missing endpoints or self-links", () => {
    __resetForTests();
    upsertNode({
      workspaceId: "ws-a",
      node: { id: "n1", kind: "question", title: "Open question", detail: "", status: "open" },
    });
    expect(() =>
      addEdge({ workspaceId: "ws-a", edge: { fromId: "n1", toId: "ghost", kind: "answers" } }),
    ).toThrow();
    expect(() =>
      addEdge({ workspaceId: "ws-a", edge: { fromId: "n1", toId: "n1", kind: "answers" } }),
    ).toThrow();
  });

  it("dedupes identical edges and supports edge removal", () => {
    __resetForTests();
    for (const id of ["n1", "n2"]) {
      upsertNode({
        workspaceId: "ws-a",
        node: { id, kind: "task", title: id, detail: "", status: "open" },
      });
    }
    const first = addEdge({
      workspaceId: "ws-a",
      edge: { fromId: "n1", toId: "n2", kind: "depends_on" },
    });
    const second = addEdge({
      workspaceId: "ws-a",
      edge: { fromId: "n1", toId: "n2", kind: "depends_on" },
    });
    expect(second.id).toBe(first.id);
    expect(getState({ workspaceId: "ws-a" }).edges).toHaveLength(1);
    expect(removeEdge({ workspaceId: "ws-a", edgeId: first.id }).removedEdgeId).toBe(first.id);
    expect(getState({ workspaceId: "ws-a" }).edges).toHaveLength(0);
  });

  it("records decisions newest-first", () => {
    __resetForTests();
    recordDecision({
      workspaceId: "ws-a",
      decision: {
        title: "Older",
        rationale: "first",
        alternatives: ["a"],
        agentId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    recordDecision({
      workspaceId: "ws-a",
      decision: {
        title: "Newer",
        rationale: "second",
        alternatives: [],
        agentId: null,
        createdAt: "2026-02-01T00:00:00.000Z",
      },
    });
    const titles = getState({ workspaceId: "ws-a" }).decisions.map((decision) => decision.title);
    expect(titles).toEqual(["Newer", "Older"]);
  });
});

describe("research-workspace persistence", () => {
  it("persists mutations and cold-loads them after a cache reset", () => {
    upsertNode({
      workspaceId: "ws-p",
      node: { id: "n1", kind: "question", title: "Q", detail: "", status: "open" },
    });
    recordDecision({
      workspaceId: "ws-p",
      decision: { title: "D", rationale: "R", alternatives: [], agentId: null },
    });

    // Wipes the in-memory cache only - state must come back from disk.
    __resetForTests();
    const reloaded = getState({ workspaceId: "ws-p" });
    expect(reloaded.nodes.map((node) => node.id)).toEqual(["n1"]);
    expect(reloaded.decisions).toHaveLength(1);
    // Other workspaces keep their own files.
    expect(getState({ workspaceId: "ws-other" })).toEqual({ nodes: [], edges: [], decisions: [] });
  });

  it("degrades to a blank state on a corrupt file and recovers on the next write", () => {
    upsertNode({
      workspaceId: "ws-c",
      node: { id: "n1", kind: "task", title: "T", detail: "", status: "open" },
    });
    writeFileSync(stateFilePathFor("ws-c"), "{not json", "utf8");

    __resetForTests();
    expect(getState({ workspaceId: "ws-c" })).toEqual({ nodes: [], edges: [], decisions: [] });

    // The next mutation writes a valid file again.
    recordDecision({
      workspaceId: "ws-c",
      decision: { title: "D", rationale: "", alternatives: [], agentId: null },
    });
    __resetForTests();
    expect(getState({ workspaceId: "ws-c" }).decisions).toHaveLength(1);
  });

  it("round-trips node removal and edge cleanup across reloads", () => {
    upsertNode({
      workspaceId: "ws-r",
      node: { id: "a", kind: "task", title: "A", detail: "", status: "open" },
    });
    upsertNode({
      workspaceId: "ws-r",
      node: { id: "b", kind: "task", title: "B", detail: "", status: "open" },
    });
    addEdge({ workspaceId: "ws-r", edge: { fromId: "a", toId: "b", kind: "depends_on" } });
    removeNode({ workspaceId: "ws-r", nodeId: "a" });

    __resetForTests();
    const state = getState({ workspaceId: "ws-r" });
    expect(state.nodes.map((node) => node.id)).toEqual(["b"]);
    expect(state.edges).toEqual([]);
  });
});
