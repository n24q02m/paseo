import { describe, expect, it } from "vitest";
import { workspaceStateSchema } from "../shared/state";
import {
  __resetForTests,
  addEdge,
  getState,
  recordDecision,
  removeEdge,
  removeNode,
  upsertNode,
} from "./store";

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
