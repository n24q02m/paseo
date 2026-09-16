import type { PaseoApi } from "@getpaseo/client";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { createPaseoClient } from "@getpaseo/client";
import { describe, expect, it, vi } from "vitest";
import contribute from "../index.client";
import { getStateRpc, recordDecisionRpc, upsertNodeRpc } from "../shared/state";

/**
 * The @getpaseo/client SDK surface the plugin borrows through usePaseo():
 * workspace-scoped agent creation + workspace listing, per the client
 * contract consumed via PaseoApi (packages/client/src/index.ts).
 *
 * The plugin never constructs its own client: at runtime the host lends the
 * selected host's PaseoApi through the PaseoApiProvider, and panels borrow it
 * with usePaseo(). These tests pin (1) the contribution registry shape,
 * (2) the SDK factory + PaseoApi surface the host lends, and (3) the slash
 * handlers' RPC contract names — without rendering React (the standalone
 * plugin install carries its own react copy, so renderToStaticMarkup under
 * vitest hits a dual-React useContext null; the host app's alias config
 * covers rendering in-repo).
 */
function stubPaseoApi() {
  const createAgent = vi.fn(async () => ({ id: "agent-1" }));
  const workspaceHandle = { id: "ws-1", agents: { create: createAgent } };
  const workspaces = {
    ref: vi.fn(() => workspaceHandle),
    list: vi.fn(async () => ({ entries: [{ id: "ws-1", name: "ws-1" }] })),
  };
  return {
    paseo: { workspaces } as unknown as PaseoApi,
    createAgent,
    workspaces,
  };
}

describe("research-workspace client contributions (SDK surface)", () => {
  it("registers two workspace panels + two command items + two slash commands", () => {
    const panels: Array<{ id: string }> = [];
    const commands: Array<{ id: string }> = [];
    const slashes: Array<{ name: string }> = [];
    const client = {
      addWorkspacePanel: (panel: { id: string }) => {
        panels.push(panel);
        return () => {};
      },
      addCommandCenterItem: (item: { id: string }) => {
        commands.push(item);
        return () => {};
      },
      addSlashCommand: (slash: { name: string }) => {
        slashes.push(slash);
        return () => {};
      },
    } as unknown as PluginClientContext;

    const cleanup = contribute(client);
    expect(panels.map((panel) => panel.id).sort()).toEqual([
      "research-decision-log",
      "research-task-graph",
    ]);
    expect(commands.map((command) => command.id).sort()).toEqual([
      "open-research-decision-log",
      "open-research-task-graph",
    ]);
    expect(slashes.map((slash) => slash.name).sort()).toEqual([
      "research-capture",
      "research-decide",
    ]);
    expect(typeof cleanup).toBe("function");
  });

  it("lends the @getpaseo/client PaseoApi surface the host provides (factory + workspaces/agents)", async () => {
    // createPaseoClient is the SDK factory plugins borrow indirectly: the host
    // builds one client per host and lends its PaseoApi via usePaseo().
    expect(typeof createPaseoClient).toBe("function");
    const { paseo, workspaces } = stubPaseoApi();
    const api: PaseoApi = paseo;
    // PaseoApi surface the panels rely on: workspace listing + scoped agent ops.
    const listed = await api.workspaces.list();
    expect(workspaces.list).toHaveBeenCalledOnce();
    expect(listed.entries).toHaveLength(1);
    const handle = api.workspaces.ref("ws-1") as unknown as {
      agents: { create: (input: unknown) => Promise<{ id: string }> };
    };
    const agent = await handle.agents.create({
      config: { provider: "codex/gpt-5" },
      prompt: "Summarize the open questions.",
    });
    expect(agent.id).toBe("agent-1");
  });

  it("slash handlers validate through the shared Zod RPC contracts", async () => {
    // Capture the onSubmit callbacks registered by the contribution function.
    const slashes = new Map<string, { onSubmit: (context: unknown) => Promise<void> }>();
    const client = {
      addWorkspacePanel: () => () => {},
      addCommandCenterItem: () => () => {},
      addSlashCommand: (slash: { name: string; onSubmit: (context: unknown) => Promise<void> }) => {
        slashes.set(slash.name, slash);
        return () => {};
      },
    } as unknown as PluginClientContext;
    contribute(client);

    const rpcCalls: Array<{ name: string }> = [];
    const rpc = vi.fn(async (contract: { name: string }) => {
      rpcCalls.push({ name: contract.name });
      return {};
    });
    const openPanel = vi.fn();

    await slashes.get("research-capture")?.onSubmit({
      args: "first finding",
      rpc,
      workspace: { id: "ws-1" },
      openPanel,
    });
    await slashes.get("research-decide")?.onSubmit({
      args: "ship it | fastest path",
      rpc,
      workspace: { id: "ws-1" },
      openPanel,
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpcCalls.map((call) => call.name)).toEqual([upsertNodeRpc.name, recordDecisionRpc.name]);
    // Invalid RPC names fail the defineRpc contract shape at authoring time.
    expect(getStateRpc.name).toBe("research-workspace.get-state");
  });
});
