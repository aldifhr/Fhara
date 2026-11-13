import type { AgentRoleId } from "@t3tools/contracts";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { AGENT_ROLE_SUMMARIES } from "@t3tools/contracts";

export type TeamRoleState = "needs you" | "working" | "queued" | "idle";

export interface TeamRoleEntry {
  readonly roleId: AgentRoleId;
  readonly displayName: string;
  readonly state: TeamRoleState;
  /** The latest task thread for the role, when it has one. */
  readonly threadId: string | null;
  /** The environment that thread runs in, for opening it. */
  readonly environmentId: string | null;
}

const SETTLED_RUN_STATUSES = new Set(["completed", "failed", "cancelled", "interrupted"]);

/** The role a delegated child thread runs as, or null for plain threads. */
const delegatedRoleOf = (thread: EnvironmentThreadShell): AgentRoleId | null =>
  thread.delegatedFrom !== null && thread.agentRole != null ? thread.agentRole : null;

const roleStateOf = (thread: EnvironmentThreadShell): TeamRoleState => {
  if (thread.hasPendingApprovals || (thread.pendingSubagentRequest ?? null) !== null) {
    return "needs you";
  }
  const runStatus = thread.latestRun?.status;
  if (runStatus !== undefined && !SETTLED_RUN_STATUSES.has(runStatus)) {
    return runStatus === "starting" || runStatus === "preparing" ? "queued" : "working";
  }
  return "idle";
};

/**
 * Live per-role team status for the sidebar, from the delegated child threads the
 * client already has. Roles without a task are idle. Purely derived — no new state.
 */
export function deriveTeamRoles(
  threads: readonly EnvironmentThreadShell[],
): ReadonlyArray<TeamRoleEntry> {
  const latest = new Map<AgentRoleId, EnvironmentThreadShell>();
  for (const thread of threads) {
    const role = delegatedRoleOf(thread);
    if (role === null) continue;
    const current = latest.get(role);
    if (current === undefined || thread.updatedAt > current.updatedAt) latest.set(role, thread);
  }
  return AGENT_ROLE_SUMMARIES.map((role) => {
    const thread = latest.get(role.id);
    return {
      roleId: role.id,
      displayName: role.displayName,
      state: thread === undefined ? ("idle" as const) : roleStateOf(thread),
      threadId: thread?.id ?? null,
      environmentId: thread?.environmentId ?? null,
    };
  });
}

export interface NeedsYouThread {
  readonly roleId: AgentRoleId;
  readonly roleDisplayName: string;
  readonly threadId: string;
  readonly environmentId: string;
  readonly title: string;
  readonly updatedAt: string;
}

/** Delegated role tasks that wait on this user, newest first. */
export function deriveNeedsYouThreads(
  threads: readonly EnvironmentThreadShell[],
): ReadonlyArray<NeedsYouThread> {
  const displayNameByRole = new Map(
    AGENT_ROLE_SUMMARIES.map((role) => [role.id, role.displayName] as const),
  );
  return threads
    .filter(
      (thread) =>
        thread.delegatedFrom !== null &&
        thread.agentRole != null &&
        roleStateOf(thread) === "needs you",
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((thread) => ({
      roleId: thread.agentRole!,
      roleDisplayName: displayNameByRole.get(thread.agentRole!) ?? thread.agentRole!,
      threadId: thread.id,
      environmentId: thread.environmentId,
      title: thread.title,
      updatedAt: thread.updatedAt,
    }));
}
