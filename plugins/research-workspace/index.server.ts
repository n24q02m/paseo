import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  addEdge,
  getState,
  recordDecision,
  removeEdge,
  removeNode,
  upsertNode,
} from "./server/store";
import {
  addEdgeRpc,
  getStateRpc,
  recordDecisionRpc,
  removeEdgeRpc,
  removeNodeRpc,
  upsertNodeRpc,
} from "./shared/state";

// NOTE: server.handle() types its handler input as ZodOutput (unknown under
// zod v4's split input/output optionality); each handler input is narrowed to
// the store function's parameter type at the call boundary.
export default function contribute(server: PluginServerContext) {
  server.handle(getStateRpc, (input) => getState(input as Parameters<typeof getState>[0]));
  server.handle(upsertNodeRpc, (input) => upsertNode(input as Parameters<typeof upsertNode>[0]));
  server.handle(removeNodeRpc, (input) => removeNode(input as Parameters<typeof removeNode>[0]));
  server.handle(addEdgeRpc, (input) => addEdge(input as Parameters<typeof addEdge>[0]));
  server.handle(removeEdgeRpc, (input) => removeEdge(input as Parameters<typeof removeEdge>[0]));
  server.handle(recordDecisionRpc, (input) =>
    recordDecision(input as Parameters<typeof recordDecision>[0]),
  );
  return () => {};
}
