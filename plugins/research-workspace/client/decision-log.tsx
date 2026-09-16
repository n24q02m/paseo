import { type PluginWorkspacePanelProps, useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { getStateRpc } from "../shared/state";

export function DecisionLogPanel({ theme, layout, workspaceId }: PluginWorkspacePanelProps) {
  const workspace = useWorkspace(workspaceId, ({ name }) => ({ name }));
  const fetchState = useRpc(getStateRpc);
  const query = useQuery({
    queryKey: ["research-workspace", "decisions", workspaceId],
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
      entry: {
        marginTop: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        backgroundColor: theme.colors.surface1,
      },
      title: { color: theme.colors.foreground, fontSize: 14 },
      body: { color: theme.colors.foregroundMuted, fontSize: 12, marginTop: 4 },
    }),
    [theme, layout.compact],
  );

  const decisions = query.data?.decisions ?? [];

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Research decision log</Text>
      <Text style={styles.muted}>
        {workspace?.name ?? workspaceId} · {decisions.length} decisions
      </Text>
      {query.isPending ? <Text style={styles.muted}>Loading decisions…</Text> : null}
      {query.isError ? (
        <Text style={styles.muted}>Decision log unavailable for this host.</Text>
      ) : null}
      {decisions.map((decision) => (
        <View key={decision.id} style={styles.entry}>
          <Text style={styles.title}>{decision.title}</Text>
          {decision.rationale ? <Text style={styles.body}>{decision.rationale}</Text> : null}
          {decision.alternatives.length > 0 ? (
            <Text style={styles.body}>Alternatives: {decision.alternatives.join("; ")}</Text>
          ) : null}
          <Text style={styles.body}>{decision.createdAt}</Text>
        </View>
      ))}
      {decisions.length === 0 && !query.isPending ? (
        <Text style={styles.muted}>
          No decisions yet. Use /research-decide to record the first one.
        </Text>
      ) : null}
    </View>
  );
}
