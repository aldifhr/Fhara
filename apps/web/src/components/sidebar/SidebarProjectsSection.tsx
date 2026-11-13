import { useNavigate } from "@tanstack/react-router";

import { cn } from "~/lib/utils";
import { SidebarGroup } from "../ui/sidebar";

export interface SidebarProjectEntry {
  readonly key: string;
  readonly displayName: string;
  readonly activeThreadCount: number;
  readonly selected: boolean;
}

/** The projects list, above the team — mockup order. A row opens the project's room. */
export function SidebarProjectsSection({
  projects,
}: {
  projects: ReadonlyArray<SidebarProjectEntry>;
}) {
  const navigate = useNavigate();
  if (projects.length === 0) return null;
  return (
    <SidebarGroup>
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="font-medium text-muted-foreground text-xs">Projects</span>
        <span className="text-muted-foreground text-xs tabular-nums">{projects.length}</span>
      </div>
      <ul className="flex flex-col gap-px">
        {projects.map((project) => (
          <li key={project.key}>
            <button
              type="button"
              aria-label={`Project ${project.displayName}`}
              aria-current={project.selected ? "true" : undefined}
              onClick={() =>
                void navigate({ to: "/project/$projectKey", params: { projectKey: project.key } })
              }
              className={cn(
                "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-row-hover",
                project.selected && "bg-sidebar-row-hover",
              )}
            >
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-3xs font-semibold text-primary"
              >
                {project.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">
                {project.displayName}
              </span>
              {project.activeThreadCount > 0 ? (
                <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 text-3xs text-sidebar-muted-foreground tabular-nums">
                  {project.activeThreadCount}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </SidebarGroup>
  );
}
