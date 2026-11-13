import { AGENT_ROLE_SUMMARIES, type AgentRoleId } from "@t3tools/contracts";

export type AgentRoleTaskStatus =
  | "pending"
  | "running"
  | "waiting"
  | "idle"
  | "completed"
  | "failed"
  | "cancelled"
  | "interrupted";

export interface AgentRoleSummary {
  readonly id: AgentRoleId;
  readonly displayName: string;
}

/** The role summary for a task's role, or null when the task runs without one. */
export const agentRoleSummary = (role: AgentRoleId | null | undefined): AgentRoleSummary | null => {
  if (role === null || role === undefined) return null;
  const summary = AGENT_ROLE_SUMMARIES.find((candidate) => candidate.id === role);
  return summary === undefined ? null : { id: summary.id, displayName: summary.displayName };
};

/** How a role's task card names its state. */
export const roleTaskStatusLabel = (status: AgentRoleTaskStatus): string => {
  switch (status) {
    case "pending":
      return "Queued";
    case "running":
      return "In progress";
    case "waiting":
      return "Needs you";
    case "idle":
      return "Idle";
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
    case "cancelled":
    case "interrupted":
      return "Stopped";
  }
};

const ROLE_AVATAR_CLASSES: Record<AgentRoleId, string> = {
  cto: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  designer: "bg-pink-500/15 text-pink-600 dark:text-pink-300",
  frontend: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  backend: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  qa: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  reviewer: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
  devops: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
  researcher: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  support: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

export const roleAvatarClass = (role: AgentRoleId): string => ROLE_AVATAR_CLASSES[role];
