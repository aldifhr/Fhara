import { type DesktopBridge, type DesktopWslState, type EnvironmentId } from "@t3tools/contracts";

type WslEnableBridge = Pick<DesktopBridge, "setWslBackendEnabled" | "setWslDistro" | "setWslOnly">;

export function isWslSettingsRowVisible(input: {
  readonly state: DesktopWslState | null;
  readonly error: string | null;
}): boolean {
  const { state, error } = input;
  return state ? state.available || state.enabled || state.wslOnly : error !== null;
}

export async function applyWslEnableSelection(input: {
  readonly bridge: WslEnableBridge;
  readonly mode: "both" | "wsl-only";
  readonly nextDistro: string | null;
  readonly persistedDistro: string | null;
}): Promise<DesktopWslState> {
  const { bridge, mode, nextDistro, persistedDistro } = input;

  // Stage preferences before enabling; only the final call should relaunch WSL with the complete selection.
  await bridge.setWslOnly(mode === "wsl-only");
  if (persistedDistro !== nextDistro) {
    await bridge.setWslDistro(nextDistro);
  }
  return await bridge.setWslBackendEnabled(true);
}

/** An explicit choice while it is listed, else the primary, else a connected environment. */
export function resolveAccessEnvironmentId(input: {
  readonly primaryEnvironmentId: EnvironmentId | null;
  readonly environments: ReadonlyArray<{
    readonly environmentId: EnvironmentId;
    readonly connected: boolean;
  }>;
  readonly selected: EnvironmentId | null;
}): EnvironmentId | null {
  const isListed = (environmentId: EnvironmentId | null) =>
    input.environments.some((environment) => environment.environmentId === environmentId);
  if (isListed(input.selected)) return input.selected;
  if (isListed(input.primaryEnvironmentId)) return input.primaryEnvironmentId;
  return (
    (input.environments.find((environment) => environment.connected) ?? input.environments[0])
      ?.environmentId ?? null
  );
}
