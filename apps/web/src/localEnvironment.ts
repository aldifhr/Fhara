/**
 * Fhara always runs its local environment: the toggle that turned it off lived in the removed
 * Environments settings, so a stale "off" from before must not leave the app with no server.
 */
export function isLocalEnvironmentDisabled(): boolean {
  return false;
}
