# Fhara V1 — Feature Matrix

Classifications are based on reading the actual source of this fork (upstream docs are not evidence). "Partial" exists but needs extension; "Removed" was dropped in this fork's commits; "Missing" must be built.

| Area          | Capability                                                                       | Status               | Where / Notes                                                            |
| ------------- | -------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| Workspace     | Project create/delete/edit, repo & local selection                               | **Existing**         | `apps/server/src/project/ProjectService.ts`, add-project flows           |
| Workspace     | Multiple threads per project, persistent history                                 | **Existing**         | Event-sourced threads, `ThreadManagementService`                         |
| Workspace     | Thread rename/archive/delete/search/tags                                         | **Existing**         | `packages/contracts/src/threadSearch.ts`, `threadTags.ts`                |
| Workspace     | Project settings + per-project overrides                                         | **Existing**         | `ProjectSettingsOverrides`, `scopedSettings.ts`                          |
| Workspace     | Worktrees, auto-pull, project scripts                                            | **Existing**         | `worktreesDirectory.ts`, `ThreadLaunchService`                           |
| Workspace     | **Personal Room** (project-less agent chat)                                      | **Missing**          | Core Phase 1 work; threads are project-rooted today                      |
| Workspace     | Personal/Project room separation                                                 | **Missing**          | Depends on Personal Room                                                 |
| Agents        | Fixed role registry (9 roles), prompts, scopes                                   | **Existing**         | `apps/server/src/roles/registry.ts`, `scope.ts`                          |
| Agents        | Role router (@mention / keyword / fallback)                                      | **Existing**         | `roles/router.ts`                                                        |
| Agents        | Role-scoped delegation (plan-mode cap, scope check)                              | **Existing**         | `mcp/delegatedTaskModes.ts`, `delegatedScope.ts`                         |
| Agents        | Per-agent model override + global inheritance                                    | **Existing** (fresh) | `agentModelOverrides` setting, `AgentModelResolver`, Settings → Roles UI |
| Agents        | Per-agent tool / MCP / skill configuration                                       | **Missing**          | Roles have write scope only; no tool grants per role                     |
| Agents        | First-class agent entities (editable configs, activity)                          | **Missing**          | Roles are fixed constants today                                          |
| Agents        | Execution status bound to real task state                                        | **Existing**         | Delegated-task statuses; UI must not invent states                       |
| Orchestration | Deterministic command/event Orchestrator                                         | **Existing**         | `orchestration-v2/Orchestrator.ts`                                       |
| Orchestration | Delegated tasks: dispatch/wait/cancel/status, wake policies, completion delivery | **Existing**         | `delegated_task.*` commands, `delegatedTaskModes.ts`                     |
| Orchestration | Worktree isolation per delegated child                                           | **Existing**         | `isolation: "worktree"` in delegate input                                |
| Orchestration | LLM Task Planner / Decision Engine                                               | **Missing**          | Router is keyword-based; Phase 4                                         |
| Orchestration | Scheduler (dependencies, concurrency, retries)                                   | **Missing**          | Phase 5; retries do not exist                                            |
| Orchestration | Result Aggregator / final-response layer                                         | **Missing**          | Completion delivery returns child output; no aggregation                 |
| Tasks         | Persistent task records, statuses, result evidence                               | **Existing**         | Subagent/delegated-task records                                          |
| Tasks         | Dependencies, priorities, reassignment, retry                                    | **Missing**          | Phase 5                                                                  |
| Tasks         | Human approval gates                                                             | **Existing**         | Runtime requests, permission modes, managed policy                       |
| Coding        | Terminal, file explorer, editor, diff viewer                                     | **Existing**         | `apps/server/src/terminal`, editor contracts, web components             |
| Coding        | Git integration, branches, commits, checkpoints                                  | **Existing**         | `git/`, `checkpointing/`                                                 |
| Coding        | Pull requests, review bots, review guides                                        | **Existing**         | `pullRequest/`, `review/`; some forges trimmed in this fork              |
| Coding        | Browser preview / automation                                                     | **Existing**         | `preview/`, browser import                                               |
| QA            | QA agent, acceptance-criteria verification loop                                  | **Missing**          | Phase 7; role exists, pipeline does not                                  |
| LLM           | Provider config (kind, base URL, key, models)                                    | **Existing**         | `textGenerators` settings, `textGeneratorDrivers.ts`                     |
| LLM           | Global default model + fallback                                                  | **Existing**         | `defaultModelSelection`, `fallbackModelSelection`                        |
| LLM           | Secure server-side key storage (secret providers)                                | **Existing**         | `secrets/`, `SecretResolver`, `SECRET_REDACTED` to clients               |
| LLM           | Usage tracking, token accounting                                                 | **Existing**         | `usage/`, `providerUsageLimits`                                          |
| LLM           | Streaming/tool-calling for internal LLM calls                                    | **Not Needed**       | Internal calls are prompt→text by design                                 |
| Tools         | MCP servers, tool discovery/approval, skills                                     | **Existing**         | `mcp/`, `mcpApps`, skills                                                |
| Tools         | Per-agent tool permission boundaries                                             | **Partial**          | Managed policy + roles' write scope; no per-role tool grants             |
| UI            | Chat, sidebar, terminal, diff, settings, command palette                         | **Existing**         | `apps/web/src/components`                                                |
| UI            | Agent activity log                                                               | **Existing**         | Activity log feature                                                     |
| UI            | Roles settings section + model picker                                            | **Existing** (fresh) | `AgentRolesSettings.tsx`                                                 |
| UI            | Task/orchestration execution view                                                | **Partial**          | Subagents render in chat; no plan/task board                             |
| Platform      | Web + desktop surfaces                                                           | **Existing**         | `apps/web`, `apps/desktop`                                               |
| Platform      | Mobile app                                                                       | **Removed**          | Excluded from V1; do not extend                                          |
| Platform      | Pairing / connections / access settings, SSH environments                        | **Removed**          | Dropped in fork commits (`98eae85bf`, `c5c3abc7a`)                       |
| Platform      | Scheduled tasks                                                                  | **Existing**         | `scheduledTasks/` — must reuse the same service paths                    |
