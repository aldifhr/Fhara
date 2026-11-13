# Fhara V1 — Scope

Fhara is a local-first, single-user AI Development Team workspace, forked from T3 Code. V1 turns the existing T3Code foundation into a personal multi-agent coding workspace with a deterministic orchestration layer, without rebuilding what already works.

## What V1 is

- A personal workspace on the user's machine, reachable locally, over Tailscale, or via T3 Connect.
- Nine specialized agent roles (CTO, Designer, Frontend, Backend, QA, Reviewer, DevOps, Researcher, Support) that a Task Planner routes work to as delegated tasks.
- Two conversation contexts: **Project Rooms** (existing project threads, full context and tools) and **Personal Rooms** (project-less conversations with one agent).
- Centralized LLM configuration: global provider, API key, base URL, model list, default model, and per-agent overrides — keys stay server-side.
- Persistent, observable task execution: every delegation is an event-sourced child thread with status, result, and evidence.

## What V1 is not

- Not multi-user, not an organization tool, not a marketplace, not cloud-hosted orchestration.
- Not a mobile product — `apps/mobile` is already removed from this fork and stays out of scope.
- Not a rewrite of T3Code's provider adapters, orchestration, terminal, git, or check-pointing.

## Conversation contexts

|                    | Personal Room                        | Project Room                          |
| ------------------ | ------------------------------------ | ------------------------------------- |
| Requires a project | No                                   | Yes                                   |
| History            | Own thread history                   | Project thread history                |
| Agent identity     | Selected role's prompt               | Selected role's prompt + routing      |
| Tools              | Chat + agent tools                   | Project tools, terminal, git, browser |
| Orchestration      | Never auto-triggers                  | Can plan and delegate                 |
| Isolation          | None (no file access unless granted) | Worktree-isolated delegated children  |

Personal Room and Project Room state must not mix: a Personal Room thread never gains project context, and Project Room delegation always carries the role scope checks that exist today.

## Agents in V1

Agents are the nine fixed roles in `apps/server/src/roles/registry.ts`, executed on demand via `delegate_task` — never long-running daemons. Each role has: id, display name, description, system prompt, write scope (repo globs), read-only flag, and routing keywords. V1 adds per-role model configuration (override / inherit global), and keeps execution status bound to real delegated-task state (pending, running, waiting, completed, failed, cancelled) — never invented by the UI.

## LLM configuration in V1

- Global: provider kind (`openaiCompatible` | `anthropic`), base URL, API key (secret-backed), model list, default model — already present as text generators plus `defaultModelSelection`.
- Per-agent: model override per role; unset roles inherit project, then environment default (the Agent Model Resolver).
- Agents always execute through existing provider CLI adapters; raw API models do not run agent turns in V1 (no second agent runtime).

## Orchestration in V1

The pipeline User Request → Planner → Decision → Dispatch → Execution → Verification → Aggregation is built on the existing delegated-task machinery: the rule-based role router picks a role, the parent thread delegates a child thread (optionally worktree-isolated), the child runs on a provider CLI, and results flow back through completion delivery. A model-driven planner/decision engine is layered on top of these primitives in later phases — it never replaces the deterministic Orchestrator, which stays the sole authority for commands and events.

## Explicit V1 exclusions

Multi-user collaboration, organizations, agent marketplace, cloud orchestration, public deployment, mobile, billing/subscriptions, enterprise analytics, distributed execution across machines.
