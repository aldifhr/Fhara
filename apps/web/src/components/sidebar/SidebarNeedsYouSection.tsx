import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { useNavigate } from "@tanstack/react-router";

import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { buildThreadRouteParams } from "~/threadRoutes";
import { cn } from "~/lib/utils";
import { roleAvatarClass } from "../chat/agentRoleTask.logic";
import { deriveNeedsYouThreads, type TeamRoleState } from "../sidebarTeam.logic";
import { SidebarGroup } from "../ui/sidebar";

const STATE_LABEL: Record<TeamRoleState, string> = {
  "needs you": "Needs you",
  working: "Working",
  queued: "Queued",
  idle: "Idle",
};

/** Delegated role tasks waiting on this user, as cards above the projects list. */
export function SidebarNeedsYouSection({
  threads,
}: {
  threads: readonly EnvironmentThreadShell[];
}) {
  const navigate = useNavigate();
  const waiting = deriveNeedsYouThreads(threads);
  return (
    <SidebarGroup>
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="font-medium text-muted-foreground text-xs">Needs you</span>
        <span className="text-muted-foreground text-xs tabular-nums">{waiting.length}</span>
      </div>
      {waiting.length === 0 ? (
        <p className="px-2 pb-1 text-xs text-sidebar-muted-foreground">Nothing waiting on you.</p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {waiting.slice(0, 5).map((thread) => (
          <li key={thread.threadId}>
            <button
              type="button"
              aria-label={`${thread.title}, ${thread.roleDisplayName} needs you`}
              onClick={() =>
                void navigate({
                  to: "/$environmentId/$threadId",
                  params: buildThreadRouteParams(
                    scopeThreadRef(thread.environmentId as never, thread.threadId as never),
                  ),
                })
              }
              className="w-full rounded-lg border border-sidebar-border bg-sidebar/50 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-row-hover"
            >
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {thread.title}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-3xs font-semibold",
                    roleAvatarClass(thread.roleId),
                  )}
                >
                  {thread.roleDisplayName.charAt(0)}
                </span>
                <span className="truncate text-xs text-sidebar-muted-foreground">
                  {thread.roleDisplayName} · {STATE_LABEL["needs you"]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </SidebarGroup>
  );
}
