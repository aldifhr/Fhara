# Fhara V1 — Architecture

Fhara keeps T3Code's architecture and extends it at defined seams. Canonical deep-dives live in `docs/internals/overview.md` and `docs/internals/glossary.md`; this page records how V1 features map onto that foundation and the constraints they must respect.

## Foundation (unchanged)

Clients send typed WebSocket requests (contracts in `packages/contracts`) → the server turns them into **commands** → the **Orchestrator** (`apps/server/src/orchestration-v2/Orchestrator.ts`) serializes commands and decides **events** with no I/O → the event sink commits events, projections, command receipts, and outbox effects in one transaction → the **effect worker** runs effects (provider turns, checkpoints) and feeds results back as commands. Provider CLIs (Codex, Claude, Cursor, Grok, OpenCode, Antigravity, Kiro, …) run as subprocesses behind per-provider **adapters** (`apps/server/src/provider/`, `packages/provider-*`). Every turn ends with a checkpoint git ref.

Server features are Effect services; transports (`ws.ts`, HTTP routes, MCP tools) decode input, call one service method, and map errors.

## V1 extension seams

### 1. Agent roles (`apps/server/src/roles/`)

Fixed registry (`registry.ts`) — nine roles with system prompts, repo-glob write scopes (`scope.ts`), read-only flags, and routing keywords (`router.ts`). Roles are _not_ processes: a role is applied to a delegated task (`mcp/delegatedTaskModes.ts` injects the prompt, caps read-only roles at plan mode, and `delegatedScope.ts`/`scopeCheck.ts` verify the finished child stayed in scope). Any new agent capability must ship as a service method, so scheduled tasks and MCP reach the same path.

### 2. Agent Model Resolver (`apps/server/src/roles/AgentModelResolver.ts`)

Resolves the effective model for a role before every delegation: role override (`ServerSettings.agentModelOverrides`) → project default → environment default. It reads settings on every call (no caches), never touches credentials, and ignores overrides pointing at text generators or disabled instances. `resolveTarget` in `mcp/OrchestratorMcpService.ts` consults it only when the caller picked no explicit provider/model and the delegation is not a receipt replay — so deterministic replay always reproduces the original decision.

### 3. Global LLM configuration (existing infrastructure)

`ServerSettings.textGenerators` holds provider configs (`kind: openaiCompatible | anthropic`, base URL, label, enabled) with API keys as `SettingsSecretValue` — a literal held in secret storage or a `SecretReference` into a secret provider (1Password, …). Drivers in `apps/server/src/textGeneration/textGeneratorDrivers.ts` do prompt→text calls and model listing with timeouts and user-worded errors. Clients only ever see `SECRET_REDACTED`; the server resolves secrets at call time via `requireSettingsSecret`. Environment and project defaults are `defaultModelSelection` (`ModelSelection = {instanceId, model, options}`), and `fallbackModelSelection` covers usage-window exhaustion.

**Constraint:** raw API models never run agent turns. Text generators are deliberately prompt→text only (`withoutInvestigation`); agents run on provider CLI adapters, so tool calling, streaming, approval, and checkpointing are inherited, not reimplemented.

### 4. Orchestration (planned layers on existing primitives)

The V1 planner, decision engine, scheduler, and result aggregator are services that compose the existing delegated-task commands (`delegated_task.request`, wake policies, completion delivery) through the same command path as every other client. The Orchestrator stays pure and deterministic; LLM-driven planning proposes _commands_, it never writes state directly. Task state is the event-sourced subagent/delegated-task records — no second task database.

## Persistence

Single SQLite store under Fhara home (`userdata/statev2.sqlite`), event-sourced with projections. Settings (including per-role overrides) are one document with additive schema evolution (`withDecodingDefault`); secrets never enter it in plaintext.

## Surfaces

Web (`apps/web`) and desktop (`apps/desktop`, Electron wrapper) are the only clients; mobile and marketing were removed from this fork. Shared client logic lives in `packages/client-runtime`; anything crossing the wire is typed in `packages/contracts`. A V1 feature is only done when it works in both surfaces and its settings survive remote connections (relay/tunnel).

## Security invariants

- API keys stay server-side: never in frontend state, events, logs, prompts, or between agents.
- Role write scopes and read-only plan-mode caps are enforced server-side after the child finishes, not just in prompts.
- Grants are checked at execution against the destination environment; the server stays authoritative.
- New protected RPC methods go through `createEnvironmentRpcCommand` + `CLIENT_GUARDED_RPC_SCOPES` with permission behavior tests.
