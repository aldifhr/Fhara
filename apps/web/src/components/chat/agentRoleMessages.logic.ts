import type { OrchestrationV2Subagent } from "@t3tools/contracts";

import { agentRoleSummary, type AgentRoleSummary } from "./agentRoleTask.logic";

/** A completion wake message attributed to the role that ran the task. */
export interface DelegatedRoleSender {
  readonly summary: AgentRoleSummary;
  /** The child thread the role ran in, for click-through. */
  readonly childThreadId: string | null;
}

const subagentById = (
  subagents: ReadonlyArray<OrchestrationV2Subagent>,
  taskId: string,
): OrchestrationV2Subagent | null => subagents.find((agent) => agent.id === taskId) ?? null;

/**
 * The role behind a delegated completion wake message, resolved from the task ids it names.
 * A cohort mixing roled and roleless tasks, or one the projection no longer knows, shows plain.
 */
export const delegatedRoleSender = (input: {
  readonly taskIds: ReadonlyArray<string>;
  readonly subagents: ReadonlyArray<OrchestrationV2Subagent>;
}): DelegatedRoleSender | null => {
  if (input.taskIds.length === 0) return null;
  const roled = input.taskIds
    .map((taskId) => subagentById(input.subagents, taskId))
    .filter((agent) => agent !== null && agent.role !== undefined);
  if (roled.length === 0 || roled.length !== input.taskIds.length) return null;
  const first = roled[0];
  const summary = agentRoleSummary(first?.role);
  if (summary === null) return null;
  const sameRole = roled.every((agent) => agent?.role === first?.role);
  if (!sameRole) return null;
  const childThreadId = roled.every((agent) => agent?.childThreadId === first?.childThreadId)
    ? (first?.childThreadId ?? null)
    : null;
  return { summary, childThreadId };
};

const WAKE_PREFIX = /^Delegated task \S+ \([^)]*\) \[[^\]]*\]:\n?/;

/**
 * The wake text the room shows: just the role's report. The full text still goes
 * to the parent agent unchanged; this trims only what renders in the timeline.
 */
export const completionDisplayText = (text: string): string => text.replace(WAKE_PREFIX, "");
