# Fhara V1 — Roadmap

Incremental phases; each ends with a working, tested state and updates to the feature matrix. Phases 0–3 status reflects what is already in this fork (several P0/P1 rounds have landed: rebrand, role registry + delegation, per-role model configuration).

## Phase 0 — Repository stabilization ✅

Rebrand, removal of orphaned surfaces (mobile, pairing/connections UI, SSH environments), role registry + scoped delegation, global LLM configuration with per-role model resolution, and the four V1 documents (`SCOPE`, `ARCHITECTURE`, `ROADMAP`, `FEATURE-MATRIX`).

## Phase 1 — Workspace foundation

Goal: a functional workspace that supports individual agent conversations.

- **Personal Room**: project-less threads that talk to one agent role — thread kind/purpose on the existing thread model, no project resolution, no auto-orchestration.
- Room separation in the UI (Personal vs Project entry points) across web and desktop.
- Agent selector in the composer (which role the room talks to); keyword router never fires in Personal Rooms.
- Verify thread rename/archive/search and settings paths work for project-less threads.

Deliverable: personal conversations with any of the nine agents, independent of projects.

## Phase 2 — Agent system

Goal: independently configurable agents.

- Persist agent configuration per role (editable system instructions layered over the fixed prompt, enabled/disabled).
- Per-agent tool/MCP permission boundaries (reuse managed-policy and permission-mode machinery; roles' write scopes stay authoritative for files).
- Agent activity surfaced from real delegated-task state (no invented statuses).
- Per-agent model override verification pass in a real client (settings → delegation → correct model).

Deliverable: nine agents a user can configure without code.

## Phase 3 — LLM & tool management ✅ (largely)

Global provider config, default model + fallback, per-role overrides with inheritance, secret-backed keys — shipped. Remaining: eval coverage for role-facing text, UI polish, mobile n/a.

## Phase 4 — Orchestration core

Goal: a working planning pipeline.

- **Task Planner** service: decompose complex Project Room requests into subtasks with role, acceptance criteria, and dependencies; simple requests skip decomposition.
- **Decision Engine**: approve / clarify / dispatch / retry / escalate-to-human, emitting existing commands only.
- Task records gain dependencies, priority, acceptance criteria (additive schema).
- Planner output visible in the room (plan preview before dispatch).

Deliverable: one request can become a plan of delegated tasks.

## Phase 5 — Scheduler & execution

- Dependency resolution, concurrency limits, parallel dispatch of independent tasks, retry with cap, cancellation propagation (already partially native), recovery after server restart.
- Duplicate-execution prevention via command receipts (extend what exists).
- Execution view: plan, active tasks, assigned agents, results.

Deliverable: reliable multi-agent execution of a plan.

## Phase 6 — Development workflow

- Worktree-per-task already works; add ownership reporting and safe integration (merge/rebase of completed children with scope-check evidence attached).
- File-change tracking per task; review handoff.

Deliverable: agents collaborate on real code without clobbering each other.

## Phase 7 — QA & verification

- Verification pipeline driven by task risk: implementation → code review (Reviewer role) → QA verification (QA role) → fix delegation → re-test → completion.
- QA runs the real app (browser preview automation exists) and files evidence.
- Simple tasks (e.g. one-file changes) bypass heavy verification.

Deliverable: end-to-end develop → review → verify loop.

## Phase 8 — UI integration

- Orchestration execution view, approval interface, review interface, task progress — as compositions of existing chat/settings components, not new dashboards.

## Phase 9 — Reliability & V1 release

Security audit (credential isolation review), regression pass, error handling, recovery testing, performance checks against `docs/internals/performance-regressions.md`, docs sync, install verification.

## Standing rules

- Every phase keeps `vp run check:changed` green and adds focused tests for backend behavior.
- Planner/decision layers propose commands; the Orchestrator remains the sole authority.
- No phase breaks web or desktop, remote/relay/tunnel connections, or existing threads.
