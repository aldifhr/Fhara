import {
  AdvertisedEndpoint,
  DesktopServerExposureModeSchema,
  DesktopServerExposureStateSchema,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import * as DesktopServerExposure from "../../backend/DesktopServerExposure.ts";
import * as IpcChannels from "../channels.ts";
import * as DesktopIpc from "../DesktopIpc.ts";

// Fhara serves the local environment on loopback only. Network access and Tailscale Serve are
// refused here, and DesktopServerExposure never widens the bind even for saved settings.
export class DesktopServerExposureDisabledError extends Schema.TaggedError<DesktopServerExposureDisabledError>()(
  "DesktopServerExposureDisabledError",
  { request: Schema.Literals(["network-accessible", "tailscale-serve"]) },
) {
  override get message() {
    return this.request === "tailscale-serve"
      ? "Tailscale Serve is disabled in Fhara."
      : "Network access is disabled in Fhara; the server only listens on this machine.";
  }
}

const SetTailscaleServeEnabledInput = Schema.Struct({
  enabled: Schema.Boolean,
  port: Schema.optionalKey(Schema.Number),
});

export const getServerExposureState = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.GET_SERVER_EXPOSURE_STATE_CHANNEL,
  payload: Schema.Void,
  result: DesktopServerExposureStateSchema,
  handler: Effect.fn("desktop.ipc.serverExposure.getState")(function* () {
    const serverExposure = yield* DesktopServerExposure.DesktopServerExposure;
    return yield* serverExposure.getState;
  }),
});

export const setServerExposureMode = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.SET_SERVER_EXPOSURE_MODE_CHANNEL,
  payload: DesktopServerExposureModeSchema,
  result: DesktopServerExposureStateSchema,
  handler: Effect.fn("desktop.ipc.serverExposure.setMode")(function* (mode) {
    if (mode !== "local-only") {
      return yield* new DesktopServerExposureDisabledError({ request: "network-accessible" });
    }
    const serverExposure = yield* DesktopServerExposure.DesktopServerExposure;
    return yield* serverExposure.getState;
  }),
});

export const setTailscaleServeEnabled = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.SET_TAILSCALE_SERVE_ENABLED_CHANNEL,
  payload: SetTailscaleServeEnabledInput,
  result: DesktopServerExposureStateSchema,
  handler: Effect.fn("desktop.ipc.serverExposure.setTailscaleServeEnabled")(function* (input) {
    if (input.enabled) {
      return yield* new DesktopServerExposureDisabledError({ request: "tailscale-serve" });
    }
    const serverExposure = yield* DesktopServerExposure.DesktopServerExposure;
    return yield* serverExposure.getState;
  }),
});

export const getAdvertisedEndpoints = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.GET_ADVERTISED_ENDPOINTS_CHANNEL,
  payload: Schema.Void,
  result: Schema.Array(AdvertisedEndpoint),
  handler: Effect.fn("desktop.ipc.serverExposure.getAdvertisedEndpoints")(function* () {
    const serverExposure = yield* DesktopServerExposure.DesktopServerExposure;
    return yield* serverExposure.getAdvertisedEndpoints;
  }),
});
