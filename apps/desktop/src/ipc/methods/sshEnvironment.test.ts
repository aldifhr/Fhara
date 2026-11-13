import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import type * as Schema from "effect/Schema";

import {
  DesktopSshEnvironmentDisabledError,
  discoverSshHosts,
  ensureSshEnvironment,
  fetchSshEnvironmentDescriptor,
} from "./sshEnvironment.ts";

const expectDisabled = (
  effect: Effect.Effect<unknown, DesktopSshEnvironmentDisabledError | Schema.SchemaError>,
) =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(effect);
    assert(Exit.isFailure(exit));
    const failure = Cause.findErrorOption(exit.cause);
    assert(Option.isSome(failure));
    assert.instanceOf(failure.value, DesktopSshEnvironmentDisabledError);
    assert.equal(failure.value.message, "SSH environments are disabled in Fhara.");
  });

describe("SSH environment IPC", () => {
  it.effect("refuses SSH host discovery", () =>
    expectDisabled(discoverSshHosts.handler(undefined)),
  );

  it.effect("refuses to open an SSH environment", () =>
    expectDisabled(
      ensureSshEnvironment.handler({
        target: { alias: "devbox", hostname: "devbox", username: null, port: null },
      }),
    ),
  );

  it.effect("refuses remote API requests, even on loopback", () =>
    expectDisabled(
      fetchSshEnvironmentDescriptor.handler({ httpBaseUrl: "http://127.0.0.1:41773/" }),
    ),
  );
});
