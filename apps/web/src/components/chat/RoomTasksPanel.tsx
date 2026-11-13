import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { useNavigate } from "@tanstack/react-router";

import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { useQuietThreadShells } from "../../state/entities";
import { buildThreadRouteParams } from "~/threadRoutes";
import { cn } from "~/lib/utils";
import {
  agentRoleSummary,
  roleAvatarClass,
  roleTaskStatusLabel,
  type AgentRoleTaskStatus,
} from "./agentRoleTask.logic";

const SETTLED_RUN_STATUSES = new Set(["completed", "failed", "cancelled", "interrupted"]);

function useProjectTaskShells(projectId: ProjectId): ReadonlyArray<EnvironmentThreadShell> {
  const shells = useQuietThreadShells();
  return shells
    .filter(
      (shell) =>
        shell.projectId === projectId && shell.delegatedFrom !== null && shell.agentRole != null,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * The room's Tasks tab: every delegated role task in this project as a card,
 * newest first. Click opens the task's child thread.
 */
export function RoomTasksPanel({
  projectId,
}: {
  projectId: ProjectId;
  /** Reserved for opening task threads in linked environments. */
  environmentId: EnvironmentId | null;
}) {
  const navigate = useNavigate();
  const shells = useProjectTaskShells(projectId);
  if (shells.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No tasks yet. Delegate work to an agent role and it shows up here.
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-gutter-both">
      <ul className="mx-auto flex max-w-2xl flex-col gap-2">
        {shells.map((shell) => {
          const summary = agentRoleSummary(shell.agentRole);
          const runStatus = shell.latestRun?.status;
          const status: AgentRoleTaskStatus =
            shell.hasPendingApprovals || shell.pendingSubagentRequest != null
              ? "waiting"
              : runStatus !== undefined && !SETTLED_RUN_STATUSES.has(runStatus)
                ? runStatus === "starting" || runStatus === "preparing"
                  ? "pending"
                  : "running"
                : ((runStatus as AgentRoleTaskStatus) ?? "completed");
          return (
            <li key={shell.id}>
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/$environmentId/$threadId",
                    params: buildThreadRouteParams(scopeThreadRef(shell.environmentId, shell.id)),
                  })
                }
                className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left shadow-xs transition-colors hover:bg-accent"
              >
                {summary !== null ? (
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                      roleAvatarClass(summary.id),
                    )}
                  >
                    {summary.displayName.charAt(0)}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {summary !== null ? `${summary.displayName}: ` : ""}
                    {shell.title}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(shell.updatedAt).toLocaleString()}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium",
                    status === "waiting"
                      ? "bg-warning/15 text-warning-foreground"
                      : status === "completed"
                        ? "bg-success/15 text-success-foreground"
                        : status === "failed"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground",
                  )}
                >
                  {roleTaskStatusLabel(status)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
