import {
  agentModelOverrideFor,
  resolveProjectProviderInstanceEnabled,
  ServerSettingsError,
  textGeneratorForSelection,
  type AgentRoleId,
  type ModelSelection,
  type ProjectId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as ProjectService from "../project/ProjectService.ts";
import * as ServerSettings from "../serverSettings.ts";

/** Where a resolved agent model came from. */
export type AgentModelSource = "override" | "project-default" | "environment-default";

export interface ResolvedAgentModel {
  readonly modelSelection: ModelSelection;
  readonly source: AgentModelSource;
}

/**
 * Resolves the effective model for an agent role before it runs: the role's override, else the
 * project default, else the environment default. Reads settings on every call, so a changed
 * global default reaches inheriting agents on their next execution without cache invalidation.
 */
export class AgentModelResolver extends Context.Service<
  AgentModelResolver,
  {
    /** Null means inherit whatever the caller's existing fallback provides. */
    readonly resolve: (
      roleId: AgentRoleId,
      projectId: ProjectId | null | undefined,
    ) => Effect.Effect<ResolvedAgentModel | null, ServerSettingsError>;
  }
>()("t3/roles/AgentModelResolver") {}

/** @public */
export const make = Effect.gen(function* () {
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const projects = yield* ProjectService.ProjectService;

  const resolve = Effect.fn("AgentModelResolver.resolve")(function* (
    roleId: AgentRoleId,
    projectId: ProjectId | null | undefined,
  ) {
    const settings = yield* serverSettings.getSettings;
    const override = agentModelOverrideFor(settings, roleId);
    // A text generator cannot run an agent, and a disabled instance is not a real choice.
    if (
      override !== null &&
      textGeneratorForSelection(settings, override.instanceId) === undefined &&
      resolveProjectProviderInstanceEnabled(settings, projectId ?? null, override.instanceId)
    ) {
      return { modelSelection: override, source: "override" as const };
    }
    // A project default is only added specificity; failing to read it must not fail a delegation
    // that previously inherited successfully.
    const project = projectId
      ? Option.getOrNull(
          yield* projects.getById(projectId).pipe(Effect.catchCause(() => Effect.succeedNone)),
        )
      : null;
    const projectDefault = project?.defaultModelSelection ?? null;
    if (projectDefault !== null) {
      return { modelSelection: projectDefault, source: "project-default" as const };
    }
    if (settings.defaultModelSelection !== null) {
      return {
        modelSelection: settings.defaultModelSelection,
        source: "environment-default" as const,
      };
    }
    return null;
  });

  return AgentModelResolver.of({ resolve });
});

export const layer = Layer.effect(AgentModelResolver, make);
