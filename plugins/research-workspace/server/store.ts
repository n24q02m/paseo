import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import {
  addEdgeRpc,
  getStateRpc,
  recordDecisionRpc,
  removeEdgeRpc,
  removeNodeRpc,
  upsertNodeRpc,
  workspaceStateInputSchema,
  type ResearchEdge,
  type ResearchWorkspaceState,
} from "../shared/state";

type GetStateInput = RpcInput<typeof getStateRpc>;
type UpsertNodeInput = RpcInput<typeof upsertNodeRpc>;
type AddEdgeInput = RpcInput<typeof addEdgeRpc>;
type RecordDecisionInput = RpcInput<typeof recordDecisionRpc>;

const states = new Map<string, ResearchWorkspaceState>();

function blankState(input?: unknown): ResearchWorkspaceState {
  const parsed = workspaceStateInputSchema.parse(input ?? {});
  return {
    nodes: parsed.nodes ?? [],
    edges: parsed.edges ?? [],
    decisions: parsed.decisions ?? [],
  };
}

export function getState(input: GetStateInput): RpcOutput<typeof getStateRpc> {
  const existing = states.get(input.workspaceId);
  if (existing) return existing;
  const fresh = blankState();
  states.set(input.workspaceId, fresh);
  return fresh;
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function upsertNode(input: UpsertNodeInput) {
  const state = getState({ workspaceId: input.workspaceId });
  const now = new Date().toISOString();
  const found = state.nodes.find((node) => node.id === input.node.id);
  if (found) {
    found.kind = input.node.kind;
    found.title = input.node.title;
    found.detail = input.node.detail;
    found.status = input.node.status;
    found.updatedAt = now;
    return found;
  }
  const created = {
    id: input.node.id,
    kind: input.node.kind,
    title: input.node.title,
    detail: input.node.detail,
    status: input.node.status,
    createdAt: input.node.createdAt ?? now,
    updatedAt: input.node.updatedAt ?? now,
  };
  state.nodes.push(created);
  return created;
}

export function removeNode(input: RpcInput<typeof removeNodeRpc>) {
  const state = getState({ workspaceId: input.workspaceId });
  const before = state.edges.length;
  state.nodes = state.nodes.filter((node) => node.id !== input.nodeId);
  state.edges = state.edges.filter(
    (edge) => edge.fromId !== input.nodeId && edge.toId !== input.nodeId,
  );
  return { removedNodeId: input.nodeId, removedEdges: before - state.edges.length };
}

function edgeExists(state: ResearchWorkspaceState, fromId: string, toId: string): boolean {
  return state.edges.some((edge) => edge.fromId === fromId && edge.toId === toId);
}

export function addEdge(input: AddEdgeInput): ResearchEdge {
  const state = getState({ workspaceId: input.workspaceId });
  const from = state.nodes.find((node) => node.id === input.edge.fromId);
  const to = state.nodes.find((node) => node.id === input.edge.toId);
  if (!from || !to) throw new Error("Both edge endpoints must exist in this workspace.");
  if (input.edge.fromId === input.edge.toId)
    throw new Error("An edge cannot link a node to itself.");
  const existing = state.edges.find(
    (edge) => edge.fromId === input.edge.fromId && edge.toId === input.edge.toId,
  );
  if (existing) return existing;
  if (!edgeExists(state, input.edge.fromId, input.edge.toId)) {
    const created: ResearchEdge = {
      id: input.edge.id ?? nextId("edge"),
      fromId: input.edge.fromId,
      toId: input.edge.toId,
      kind: input.edge.kind,
    };
    state.edges.push(created);
    return created;
  }
  const fallback = state.edges.find(
    (edge) => edge.fromId === input.edge.fromId && edge.toId === input.edge.toId,
  );
  if (!fallback) throw new Error("Edge index inconsistent.");
  return fallback;
}

export function removeEdge(input: RpcInput<typeof removeEdgeRpc>) {
  const state = getState({ workspaceId: input.workspaceId });
  state.edges = state.edges.filter((edge) => edge.id !== input.edgeId);
  return { removedEdgeId: input.edgeId };
}

export function recordDecision(input: RecordDecisionInput) {
  const state = getState({ workspaceId: input.workspaceId });
  const now = new Date().toISOString();
  const created = {
    id: input.decision.id ?? nextId("decision"),
    title: input.decision.title,
    rationale: input.decision.rationale,
    alternatives: input.decision.alternatives,
    agentId: input.decision.agentId,
    createdAt: input.decision.createdAt ?? now,
  };
  state.decisions.push(created);
  // Newest-first for the log panel.
  state.decisions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return created;
}

/** Test-only reset hook: clears in-memory state between suites. */
export function __resetForTests(): void {
  states.clear();
  counter = 0;
}
