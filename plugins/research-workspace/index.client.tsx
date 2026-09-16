import type { PluginClientContext } from "@getpaseo/plugin/client";
import { DecisionLogPanel } from "./client/decision-log";
import { TaskGraphPanel } from "./client/task-graph";
import { recordDecisionRpc, upsertNodeRpc } from "./shared/state";

export default function contribute(client: PluginClientContext) {
  client.addWorkspacePanel({
    id: "research-task-graph",
    title: "Research task graph",
    icon: "Network",
    context: "workspace",
    locations: ["workspace", "explorer"],
    Component: TaskGraphPanel,
  });
  client.addWorkspacePanel({
    id: "research-decision-log",
    title: "Research decision log",
    icon: "ListChecks",
    context: "workspace",
    Component: DecisionLogPanel,
  });
  client.addCommandCenterItem({
    id: "open-research-task-graph",
    title: "Open research task graph",
    icon: "Network",
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("research-task-graph");
    },
  });
  client.addCommandCenterItem({
    id: "open-research-decision-log",
    title: "Open research decision log",
    icon: "ListChecks",
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("research-decision-log");
    },
  });
  client.addSlashCommand({
    name: "research-capture",
    description: "Capture a research finding as a graph node with evidence.",
    argumentHint: "<finding>",
    context: "workspace",
    async onSubmit({ args, rpc, workspace, openPanel }) {
      const title = args.trim() || "Untitled finding";
      await rpc(upsertNodeRpc, {
        workspaceId: workspace.id,
        node: {
          id: `node-${Date.now().toString(36)}`,
          kind: "evidence",
          title,
          detail: "",
          status: "open",
        },
      });
      openPanel("research-task-graph");
    },
  });
  client.addSlashCommand({
    name: "research-decide",
    description: "Record a decision with rationale into the decision log.",
    argumentHint: "<decision> | <rationale>",
    context: "workspace",
    async onSubmit({ args, rpc, workspace, openPanel }) {
      const [titlePart, ...rest] = args.split("|");
      const title = (titlePart ?? "").trim() || "Untitled decision";
      const rationale = rest.join("|").trim();
      await rpc(recordDecisionRpc, {
        workspaceId: workspace.id,
        decision: { title, rationale, alternatives: [], agentId: null },
      });
      openPanel("research-decision-log");
    },
  });
  return () => {};
}
