import { type PluginWorkspacePanelProps, useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { getStateRpc } from "../shared/state";

const KIND_LABEL: Record<string, string> = {
  task: "Task",
  question: "Question",
  evidence: "Evidence",
  blocker: "Blocker",
};

export function TaskGraphPanel({ theme, layout, workspaceId }: PluginWorkspacePanelProps) {
  const workspace = useWorkspace(workspaceId, ({ name, status }) => ({ name, status }));
  const fetchState = useRpc(getStateRpc);
  const query = useQuery({
    queryKey: ["research-workspace", "state", workspaceId],
    queryFn: () => fetchState({ workspaceId }),
  });
  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        backgroundColor: theme.colors.surface0,
      },
      heading: { color: theme.colors.foreground, fontSize: 16, fontWeight: "600" as const },
      muted: { color: theme.colors.foregroundMuted, fontSize: 13 },
      node: {
        marginTop: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        backgroundColor: theme.colors.surface1,
      },
      nodeTitle: { color: theme.colors.foreground, fontSize: 14 },
      edge: { color: theme.colors.foregroundMuted, fontSize: 12, marginTop: 4 },
    }),
    [theme, layout.compact],
  );

  const nodes = query.data?.nodes ?? [];
  const edges = query.data?.edges ?? [];

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Research task graph</Text>
      <Text style={styles.muted}>
        {workspace?.name ?? workspaceId} · {nodes.length} nodes · {edges.length} edges
      </Text>
      {query.isPending ? <Text style={styles.muted}>Loading graph…</Text> : null}
      {query.isError ? <Text style={styles.muted}>Graph unavailable for this host.</Text> : null}
      {nodes.map((node) => (
        <View key={node.id} style={styles.node}>
          <Text style={styles.nodeTitle}>
            [{KIND_LABEL[node.kind] ?? node.kind}] {node.title} · {node.status}
          </Text>
          {node.detail ? <Text style={styles.edge}>{node.detail}</Text> : null}
        </View>
      ))}
      {edges.map((edge) => (
        <Text key={edge.id} style={styles.edge}>
          {edge.fromId} —{edge.kind}→ {edge.toId}
        </Text>
      ))}
      {nodes.length === 0 && !query.isPending ? (
        <Text style={styles.muted}>
          No nodes yet. Use /research-capture to add the first finding.
        </Text>
      ) : null}
    </View>
  );
}
