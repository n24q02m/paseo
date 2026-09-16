import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

// Shared value types only: no React, no Node, no runtime-owned imports.
// NOTE: zod v4 splits input vs output optionality for .default() fields.
// All RPC inputs below use explicit input-side schemas (required fields with
// plain z-types) so handler input types stay non-optional; outputs keep the
// storage schemas with defaults. This avoids the TS2345/TS2532/TS18048 class
// of errors where parsed output optionality leaks into handler signatures.

export const nodeKindSchema = z.enum(["task", "question", "evidence", "blocker"]);
export type ResearchNodeKind = z.infer<typeof nodeKindSchema>;

export const nodeStatusSchema = z.enum(["open", "in_progress", "done", "dropped"]);
export type ResearchNodeStatus = z.infer<typeof nodeStatusSchema>;

export const researchNodeSchema = z.object({
  id: z.string().min(1),
  kind: nodeKindSchema,
  title: z.string().min(1),
  detail: z.string(),
  status: nodeStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ResearchNode = z.infer<typeof researchNodeSchema>;

const researchNodeInputSchema = z.object({
  id: z.string().min(1),
  kind: nodeKindSchema,
  title: z.string().min(1),
  detail: z.string(),
  status: nodeStatusSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const edgeKindSchema = z.enum(["depends_on", "answers", "blocked_by", "supports"]);
export type ResearchEdgeKind = z.infer<typeof edgeKindSchema>;

export const researchEdgeSchema = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  kind: edgeKindSchema,
});
export type ResearchEdge = z.infer<typeof researchEdgeSchema>;

const researchEdgeInputSchema = z.object({
  id: z.string().min(1).optional(),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  kind: edgeKindSchema,
});

export const decisionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rationale: z.string(),
  alternatives: z.array(z.string()),
  agentId: z.string().nullable(),
  createdAt: z.string(),
});
export type ResearchDecision = z.infer<typeof decisionSchema>;

const decisionInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  rationale: z.string(),
  alternatives: z.array(z.string()),
  agentId: z.string().nullable(),
  createdAt: z.string().optional(),
});

export const workspaceStateSchema = z.object({
  nodes: z.array(researchNodeSchema),
  edges: z.array(researchEdgeSchema),
  decisions: z.array(decisionSchema),
});
export type ResearchWorkspaceState = z.infer<typeof workspaceStateSchema>;

const workspaceStateInputSchema = z.object({
  nodes: z.array(researchNodeSchema).optional(),
  edges: z.array(researchEdgeSchema).optional(),
  decisions: z.array(decisionSchema).optional(),
});

export const workspaceIdInput = z.object({ workspaceId: z.string().min(1) });

export const getStateRpc = defineRpc({
  name: "research-workspace.get-state",
  input: workspaceIdInput,
  output: workspaceStateSchema,
});

export const upsertNodeRpc = defineRpc({
  name: "research-workspace.upsert-node",
  input: z.object({
    workspaceId: z.string().min(1),
    node: researchNodeInputSchema,
  }),
  output: researchNodeSchema,
});

export const removeNodeRpc = defineRpc({
  name: "research-workspace.remove-node",
  input: z.object({ workspaceId: z.string().min(1), nodeId: z.string().min(1) }),
  output: z.object({ removedNodeId: z.string(), removedEdges: z.number() }),
});

export const addEdgeRpc = defineRpc({
  name: "research-workspace.add-edge",
  input: z.object({
    workspaceId: z.string().min(1),
    edge: researchEdgeInputSchema,
  }),
  output: researchEdgeSchema,
});

export const removeEdgeRpc = defineRpc({
  name: "research-workspace.remove-edge",
  input: z.object({ workspaceId: z.string().min(1), edgeId: z.string().min(1) }),
  output: z.object({ removedEdgeId: z.string() }),
});

export const recordDecisionRpc = defineRpc({
  name: "research-workspace.record-decision",
  input: z.object({
    workspaceId: z.string().min(1),
    decision: decisionInputSchema,
  }),
  output: decisionSchema,
});

export { workspaceStateInputSchema };
