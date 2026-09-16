# research-workspace plugin (skeleton)

Fork-internal workspace plugin for research sessions. Contributes two workspace panels (task graph + decision log), two Command Center items, and two slash commands (`/research-capture`, `/research-decide`).

- Entries stay thin: `index.client.tsx` / `index.server.ts` wire contributions only.
- `shared/state.ts` owns Zod RPC contracts (imports `@getpaseo/plugin` + `zod` only).
- `server/store.ts` owns per-workspace in-memory state behind the RPC handlers.
- `client/task-graph.tsx` + `client/decision-log.tsx` render panels; they borrow the daemon connection through `usePaseo()` (`@getpaseo/client` `PaseoApi`: `workspaces` / `agents`) and mutate only via typed plugin RPC (`useRpc`).
- `skills/` holds clean-room original skill briefs in Paseo `SKILL.md` format.

## Verify (plugin scope)

```bash
npm run typecheck --prefix plugins/research-workspace
npx vitest run plugins/research-workspace --project node
```
