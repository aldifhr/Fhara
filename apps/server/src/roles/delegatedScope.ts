/**
 * Write-scope check for a delegated child's terminal result, run before the
 * result is delivered to the parent.
 *
 * The role is not stored on the task, so it is recovered from the prompt the
 * child received: `taskPrompt` starts it with the role's system prompt. Only
 * worktree children are checked: they carry `workspacePreparation.baseRef`.
 * Shared children have no recorded start commit, and storing one would need a
 * schema change, so they are skipped. Nothing is ever reverted.
 */
import type { OrchestrationV2Run } from "@t3tools/contracts";

import { ROLES, type Role } from "./registry.ts";
import { checkRoleScope, type RunGit } from "./scopeCheck.ts";

/** The registry role whose system prompt opens a delegated task prompt, if any. */
export function roleForDelegatedPrompt(prompt: string): Role | undefined {
  return ROLES.find((role) => prompt.startsWith(`${role.systemPrompt.trim()}\n\n`));
}

/** The commit a worktree child started from, from any of its runs. */
export function delegatedWorktreeBaseRef(
  runs: ReadonlyArray<Pick<OrchestrationV2Run, "workspacePreparation">>,
): string | undefined {
  for (const run of runs) {
    if (run.workspacePreparation?.type === "worktree") return run.workspacePreparation.baseRef;
  }
  return undefined;
}

/** Warning text for the parent, or null when there is nothing to warn about or the check cannot run. */
export async function delegatedScopeWarning(options: {
  readonly prompt: string;
  readonly worktreePath: string | null;
  readonly runs: ReadonlyArray<Pick<OrchestrationV2Run, "workspacePreparation">>;
  readonly runGit?: RunGit;
}): Promise<string | null> {
  const role = roleForDelegatedPrompt(options.prompt);
  if (role === undefined || options.worktreePath === null) return null;
  const baseRef = delegatedWorktreeBaseRef(options.runs);
  if (baseRef === undefined) return null;
  try {
    const check = await checkRoleScope({
      roleId: role.id,
      cwd: options.worktreePath,
      baseRef,
      ...(options.runGit === undefined ? {} : { runGit: options.runGit }),
    });
    return check?.warning ?? null;
  } catch {
    return null;
  }
}

export function appendScopeWarning<T extends string | null>(
  text: T,
  warning: string | null,
): T | string {
  if (warning === null) return text;
  return text === null || text.length === 0 ? warning : `${text}\n\n${warning}`;
}
