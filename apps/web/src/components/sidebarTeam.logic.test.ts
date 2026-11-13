import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { describe, expect, it } from "vite-plus/test";

import { deriveTeamRoles } from "./sidebarTeam.logic";

const shell = (overrides: Partial<EnvironmentThreadShell>): EnvironmentThreadShell =>
  ({
    environmentId: "env" as never,
    id: "thread-1" as never,
    projectId: "project" as never,
    title: "Task",
    providerInstanceId: "codex" as never,
    modelSelection: {} as never,
    runtimeMode: "full-access" as never,
    interactionMode: "default" as never,
    branch: null,
    worktreePath: null,
    lineage: { relationshipToParent: "top_level" } as never,
    forkedFrom: null,
    linkOrigin: null,
    delegatedFrom: null,
    activeProviderThreadId: null,
    latestRun: null,
    runtime: null,
    latestUserMessageAt: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    hasActionableProposedPlan: false,
    pendingBackgroundTasks: [],
    providerInstanceHistory: [],
    goal: null,
    itemCount: 0,
    visibleItemCount: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    archivedAt: null,
    settledOverride: null,
    settledAt: null,
    unsettledAt: null,
    snoozedUntil: null,
    snoozedAt: null,
    pinnedAt: null,
    pinOrderKey: null,
    activeOrderKey: null,
    pullRequests: [],
    ...overrides,
  }) as EnvironmentThreadShell;

const delegated = (overrides: Partial<EnvironmentThreadShell>) =>
  shell({
    delegatedFrom: { threadId: "parent" as never } as never,
    agentRole: "frontend",
    ...overrides,
  });

describe("deriveTeamRoles", () => {
  it("reports every role idle when no delegated task runs", () => {
    const roles = deriveTeamRoles([shell({})]);
    expect(roles).toHaveLength(9);
    expect(roles.every((role) => role.state === "idle")).toBe(true);
  });

  it("marks a running delegated role as working and keeps others idle", () => {
    const roles = deriveTeamRoles([
      delegated({ id: "thread-f" as never, latestRun: { status: "running" } as never }),
    ]);
    const frontend = roles.find((role) => role.roleId === "frontend");
    expect(frontend?.state).toBe("working");
    expect(frontend?.threadId).toBe("thread-f");
    expect(roles.find((role) => role.roleId === "backend")?.state).toBe("idle");
  });

  it("prefers needs-you over working and the most recent task per role", () => {
    const roles = deriveTeamRoles([
      delegated({
        id: "thread-old" as never,
        updatedAt: "2026-01-01T00:00:00Z",
        latestRun: { status: "running" } as never,
      }),
      delegated({
        id: "thread-new" as never,
        updatedAt: "2026-01-02T00:00:00Z",
        hasPendingApprovals: true,
      }),
      shell({
        delegatedFrom: { threadId: "parent" } as never,
        agentRole: "frontend",
        id: "thread-local" as never,
      }),
    ]);
    const frontend = roles.find((role) => role.roleId === "frontend");
    expect(frontend?.state).toBe("needs you");
    expect(frontend?.threadId).toBe("thread-new");
  });

  it("ignores plain threads that carry an agent role without delegation", () => {
    const roles = deriveTeamRoles([
      shell({ agentRole: "cto", latestRun: { status: "running" } as never }),
    ]);
    expect(roles.find((role) => role.roleId === "cto")?.state).toBe("idle");
  });
});
