import { AGENT_ROLE_SUMMARIES, type EnvironmentId, type ThreadId } from "@t3tools/contracts";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { useNavigate } from "@tanstack/react-router";

import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { cn } from "~/lib/utils";
import { buildThreadRouteParams } from "~/threadRoutes";
import { roleAvatarClass } from "../chat/agentRoleTask.logic";
import { deriveTeamRoles, type TeamRoleState } from "../sidebarTeam.logic";
import { SidebarGroup } from "../ui/sidebar";

const STATE_CLASS: Record<TeamRoleState, string> = {
  "needs you": "text-warning",
  working: "text-foreground",
  queued: "text-muted-foreground",
  idle: "text-muted-foreground/60",
};

/** The nine agent roles with their live state from this project's delegated tasks. */
export function TeamSidebarSection({ threads }: { threads: readonly EnvironmentThreadShell[] }) {
  const navigate = useNavigate();
  const roles = deriveTeamRoles(threads);
  return (
    <SidebarGroup>
      <div className="px-2 pb-1 font-medium text-muted-foreground text-xs">Team</div>
      <ul className="flex flex-col gap-px">
        {roles.map((role) => {
          const summary = AGENT_ROLE_SUMMARIES.find((candidate) => candidate.id === role.roleId);
          return (
            <li key={role.roleId}>
              <button
                type="button"
                disabled={role.threadId === null}
                aria-label={`${role.displayName}: ${role.state}`}
                onClick={() => {
                  if (role.threadId === null || role.environmentId === null) return;
                  void navigate({
                    to: "/$environmentId/$threadId",
                    params: buildThreadRouteParams(
                      scopeThreadRef(
                        role.environmentId as EnvironmentId,
                        role.threadId as ThreadId,
                      ),
                    ),
                  });
                }}
                className="flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sidebar-muted-foreground transition-colors hover:bg-sidebar-row-hover hover:text-sidebar-foreground disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-3xs font-semibold",
                    roleAvatarClass(role.roleId),
                  )}
                >
                  {role.displayName.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">
                  {summary?.displayName ?? role.roleId}
                </span>
                <span className={cn("shrink-0 text-xs tabular-nums", STATE_CLASS[role.state])}>
                  {role.state}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </SidebarGroup>
  );
}
