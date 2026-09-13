# OMP provider RPC coverage

Audit of the OMP provider (`packages/server/src/server/agent/providers/omp/`)
against the OMP RPC contract, verified at fork base `18aaec27`.
Tracks which OMP RPCs and capabilities Paseo implements and names the
remaining deltas. Re-verify against the base SHA if it moves.

Upstream already landed several of the fixes in this area — notably
protocol-v2 negotiation (upstream fix for #2966/#2548, PR #3184) and
null-`contextWindow` tolerance. Follow-up changes reuse that code
instead of rebuilding it.

## Covered upstream

- `negotiate_protocol{protocolVersion:2}` after the `ready` frame
  (`protocol-session.ts` `establishOmpProtocol`); `rpc_chunk`
  reassembly for oversized frames.
- `set_subagent_subscription` (`level:events` on startup).
- `set_host_tools` registration (`cli-runtime.ts` `setHostTools`).
- `set_thinking_level`; thinking tiers mapped from the model's real
  `thinking.efforts` (`map-omp-model.ts`).
- Model/thinking/context surfaced from `get_state`
  (`usage-poller.ts`, thinking-option plumbing).
- Nullable `contextWindow` in model discovery and session state
  (`rpc-types.ts`).
- Builtin MCP commands (`source:"builtin"`) accepted.
- `turn_failed` emission on the error path; `process_exit` surfaced.
- Import preserves model/thinking via head+tail session scan
  (`session-descriptor.ts`); `nativeHandle` persists the session file.
- Mid-turn `steer` / `follow-up` via slash commands.

## Remaining deltas

- Paged history: `getMessages()` still uses monolithic `get_messages`;
  no `get_messages_page` hydration, refresh, or post-`/compact` paging;
  no `session_busy` / `stale_cursor` handling (helps #2610).
- Completion gate: confirm the `agent_end` + idle-`get_state` policy
  carries a deadline with a terminal error instead of retrying while
  the provider never reports idle (#3654-class spinners); classify
  `custom`-role notices so they never end a turn early.
- Process death: verify handle invalidation plus lazy re-spawn/resume
  so a chat survives an unexpected `omp` exit (#3838); keep the
  transport reusable after exit.
- Cancellation: escalate RPC interrupt to SIGTERM/SIGKILL on timeout
  so a wedged turn leaves `running` (#3540).
- Subagents: query `get_subagents`; keep the parent active while OMP
  task children run (#2232, #3160).
- Fast mode: wire `set_fast_mode` with enabled/active rendering and
  the unavailable-for-model path (#4437).
- Fallback sync: reflect OMP-side model fallback in the selector
  (#4073).
- Steering: declare `steerActiveTurn` for the OMP provider and steer
  mid-turn input instead of the replace-turn path (#4000, #3999).
- Import: verify leading-`title` records parse and discovery covers
  the full session scope (#2006, #2796).
- Framing: keep plugin tool output off the RPC JSONL channel on the
  Paseo side (#2473); wire voice-`speak` availability (#1892).

## Upstream references (read-only)

- Closed/reused: #2966, #2548, #3184, #2006, #2796, #2060, #2080,
  #2405, #2644, #1888.
- Open/tracked: #2610, #2857, #3998, #3252, #2232, #3160, #3838,
  #3540, #3749, #2727, #2574, #4437, #4073, #4000, #3999, #263,
  #2473, #1892.
