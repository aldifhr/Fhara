import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_SERVER_SETTINGS, type EnvironmentId, type ProjectId } from "@t3tools/contracts";
import { useEffect, useRef, useState } from "react";

import ChatView from "../components/ChatView";
import { SidebarInset } from "../components/ui/sidebar";
import { newThreadId } from "~/lib/utils";
import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { useEnvironmentSettings } from "../hooks/useSettings";
import { useProjects, useQuietThreadShells } from "../state/entities";
import { threadEnvironment } from "../state/threads";
import { useAtomCommand } from "../state/use-atom-command";

export const Route = createFileRoute("/project/$projectKey")({
  component: ProjectRoomEntry,
});

/**
 * The Project Chat Room: a project always has exactly one room conversation with its agents.
 * Opening a project opens the room, creating it on first visit — the user never meets "threads".
 */
function ProjectRoomEntry() {
  const { projectKey } = Route.useParams();
  const groups = useSidebarProjectGroups();
  const threads = useQuietThreadShells();
  const projects = useProjects();
  const createThread = useAtomCommand(threadEnvironment.create, { reportFailure: false });
  const setAgentRole = useAtomCommand(threadEnvironment.setAgentRole, { reportFailure: false });
  const creatingForKeyRef = useRef<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Project keys can carry slashes ("github.com/owner/repo"), so the param may arrive encoded.
  let decodedKey = projectKey;
  try {
    decodedKey = decodeURIComponent(projectKey);
  } catch {
    // Malformed escape: match on the raw value.
  }
  const group = groups.find(
    (candidate) => candidate.projectKey === projectKey || candidate.projectKey === decodedKey,
  );
  const environmentId =
    group?.memberProjects[0]?.environmentId ??
    (group as { environmentId?: EnvironmentId } | undefined)?.environmentId ??
    // Fallback: the local server environment hosts every local project.
    ("local" as EnvironmentId);
  const projectId: ProjectId | null =
    group?.memberProjects[0]?.id ?? (group as { id?: ProjectId } | undefined)?.id ?? null;
  const settings = useEnvironmentSettings(environmentId ?? ("unused" as EnvironmentId), (s) => s);
  const project = projects.find(
    (candidate) => candidate.id === projectId && candidate.environmentId === environmentId,
  );
  const modelSelection =
    project?.defaultModelSelection ??
    settings.defaultModelSelection ??
    settings.textGenerationModelSelection;

  const projectKeys =
    group === undefined
      ? null
      : new Set<string>([
          ...group.memberProjectRefs.map((ref) => `${ref.environmentId}:${ref.projectId}` as const),
          ...(group.environmentId ? [`${group.environmentId}:${group.id}`] : []),
        ]);
  // The room is only the project's dedicated CTO conversation — never the user's private threads.
  const room =
    projectKeys === null
      ? undefined
      : threads
          .filter(
            (thread) =>
              thread.delegatedFrom === null &&
              thread.agentRole === "cto" &&
              projectKeys.has(`${thread.environmentId}:${thread.projectId}`),
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  // No room yet: create it once, led by the CTO role; the shell update then renders it inline.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- creates the room thread in the environment store when the route mounts without one
  useEffect(() => {
    if (group === undefined || room !== undefined || projectId === null || environmentId === null) {
      return;
    }
    if (creatingForKeyRef.current === group.projectKey) return;
    creatingForKeyRef.current = group.projectKey;
    void (async () => {
      const threadId = newThreadId();
      const createdAt = new Date().toISOString();
      const result = await createThread({
        environmentId,
        input: {
          threadId,
          projectId,
          title: group.displayName,
          modelSelection,
          runtimeMode: settings.defaultRuntimeMode ?? DEFAULT_SERVER_SETTINGS.defaultRuntimeMode,
          interactionMode: "default",
          branch: null,
          worktreePath: null,
          createdAt,
        },
      });
      if (result._tag === "Failure") {
        creatingForKeyRef.current = null;
        setCreateError(
          "Could not create the project room. Check that the environment is connected.",
        );
        return;
      }
      await setAgentRole({
        environmentId,
        input: { threadId, agentRole: "cto", createdAt },
      });
    })();
  }, [createThread, group, room, environmentId, modelSelection, projectId, setAgentRole, settings]);

  if (group === undefined) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    );
  }
  if (room !== undefined) {
    return (
      <SidebarInset className="h-svh min-h-0 overflow-hidden overscroll-y-none md:h-dvh">
        <ChatView environmentId={room.environmentId} threadId={room.id} routeKind="server" />
      </SidebarInset>
    );
  }
  return (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Opening {group.displayName}…
        {createError === null ? null : (
          <span className="block text-destructive">{createError}</span>
        )}
      </p>
    </div>
  );
}
