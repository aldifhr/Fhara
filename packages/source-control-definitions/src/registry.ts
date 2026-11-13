import { makeSourceControlDefinitionRegistry } from "@t3tools/source-control-core/shared/definition";
import * as GitHub from "@t3tools/source-control-github/shared/definition";

/**
 * Fhara keeps GitHub as its only built-in forge. The other upstream forges (GitLab, GitCafe,
 * Forgejo, Bitbucket, Azure DevOps, Cursor Origin) were removed in the P0 strip.
 */
export const builtInSourceControlDefinitions = makeSourceControlDefinitionRegistry([
  GitHub.definition,
]);

/** GitCafe was removed, so pull request URLs pass through unchanged. Kept for callers. */
export function canonicalizeGitCafePullRequestUrl(value: string): string {
  return value;
}
