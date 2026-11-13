import { it } from "@effect/vitest";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  ProjectId,
  type AgentRoleId,
  type ModelSelection,
} from "@t3tools/contracts";
import * as Option from "effect/Option";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { expect } from "vite-plus/test";

import * as ProjectService from "../project/ProjectService.ts";
import * as ServerSettings from "../serverSettings.ts";
import { AgentModelResolver, layer as resolverLayer } from "./AgentModelResolver.ts";

const CODEX = ProviderInstanceId.make("codex");
const RELAY = ProviderInstanceId.make("relay");
const CUSTOM = ProviderInstanceId.make("custom");
const selection = (model: string, instanceId: ProviderInstanceId = CODEX): ModelSelection => ({
  instanceId,
  model,
});
const PROJECT = ProjectId.make("role-project");

const projectById = (projectDefault: ModelSelection | null) =>
  Layer.mock(ProjectService.ProjectService)({
    getById: (() =>
      Effect.succeed(
        projectDefault === null
          ? Option.none()
          : Option.some({ defaultModelSelection: projectDefault }),
      )) as unknown as ProjectService.ProjectService["Service"]["getById"],
  });

const layer = (
  settingsOverrides: Parameters<typeof ServerSettings.layerTest>[0],
  projectDefault: ModelSelection | null = null,
) =>
  resolverLayer.pipe(
    Layer.provideMerge(ServerSettings.layerTest(settingsOverrides)),
    Layer.provide(projectById(projectDefault)),
  );

const resolve = (roleId: AgentRoleId, projectId: ProjectId | null = null) =>
  Effect.flatMap(AgentModelResolver, (resolver) => resolver.resolve(roleId, projectId));

it.effect("an override beats the project and environment defaults", () =>
  resolve("frontend", PROJECT).pipe(
    Effect.provide(
      layer(
        {
          agentModelOverrides: { frontend: selection("override-model") },
          defaultModelSelection: selection("env-model"),
        },
        selection("project-model"),
      ),
    ),
    Effect.map((resolved) =>
      expect(resolved).toEqual({
        modelSelection: selection("override-model"),
        source: "override",
      }),
    ),
  ),
);

it.effect("an unset override inherits the project default", () =>
  resolve("frontend", PROJECT).pipe(
    Effect.provide(
      layer({ defaultModelSelection: selection("env-model") }, selection("project-model")),
    ),
    Effect.map((resolved) =>
      expect(resolved).toEqual({
        modelSelection: selection("project-model"),
        source: "project-default",
      }),
    ),
  ),
);

it.effect("without a project default, the environment default inherits", () =>
  resolve("frontend", PROJECT).pipe(
    Effect.provide(layer({ defaultModelSelection: selection("env-model") })),
    Effect.map((resolved) =>
      expect(resolved).toEqual({
        modelSelection: selection("env-model"),
        source: "environment-default",
      }),
    ),
  ),
);

it.effect("with no override and no defaults, resolution is null and the caller inherits", () =>
  resolve("frontend", PROJECT).pipe(
    Effect.provide(layer({})),
    Effect.map((resolved) => expect(resolved).toBeNull()),
  ),
);

it.effect("an override naming a text generator is ignored", () =>
  resolve("frontend", PROJECT).pipe(
    Effect.provide(
      layer(
        {
          textGenerators: {
            [RELAY]: { kind: "openaiCompatible", baseUrl: "https://api.test/v1" },
          },
          agentModelOverrides: {
            frontend: selection("override-model", RELAY),
          },
          defaultModelSelection: selection("env-model"),
        },
        selection("project-model"),
      ),
    ),
    Effect.map((resolved) =>
      expect(resolved).toEqual({
        modelSelection: selection("project-model"),
        source: "project-default",
      }),
    ),
  ),
);

it.effect("an override at a disabled provider instance is ignored", () =>
  resolve("frontend", PROJECT).pipe(
    Effect.provide(
      layer(
        {
          providerInstances: {
            [CUSTOM]: { driver: ProviderDriverKind.make("codex"), enabled: false },
          },
          agentModelOverrides: {
            frontend: selection("override-model", CUSTOM),
          },
          defaultModelSelection: selection("env-model"),
        },
        selection("project-model"),
      ),
    ),
    Effect.map((resolved) =>
      expect(resolved).toEqual({
        modelSelection: selection("project-model"),
        source: "project-default",
      }),
    ),
  ),
);

it.effect("changing the environment default updates inheriting roles", () =>
  Effect.gen(function* () {
    const settings = yield* ServerSettings.ServerSettingsService;
    const resolver = yield* AgentModelResolver;
    expect(yield* resolver.resolve("frontend", PROJECT)).toEqual({
      modelSelection: selection("env-model"),
      source: "environment-default",
    });
    yield* settings.updateSettings({ defaultModelSelection: selection("new-env-model") });
    expect(yield* resolver.resolve("frontend", PROJECT)).toEqual({
      modelSelection: selection("new-env-model"),
      source: "environment-default",
    });
  }).pipe(Effect.provide(layer({ defaultModelSelection: selection("env-model") }))),
);
