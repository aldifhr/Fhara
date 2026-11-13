/**
 * Post-subtask write-scope check for delegated children that ran with a role.
 *
 * Call `checkRoleScope` when a role-bearing delegated child reaches a terminal
 * state, with the child's checkout (worktree path, or the shared repo root) and
 * the commit it started from (`workspaceStrategy.baseRef` for worktree children).
 * Append `warning` to the result delivered to the parent. Nothing is reverted.
 */
// @effect-diagnostics-next-line nodeBuiltinImport:off -- git runs as a plain promise; callers wrap it in Effect.promise.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { findRole, type Role } from "./registry.ts";
import { pathsOutOfScope } from "./scope.ts";

export type RunGit = (args: ReadonlyArray<string>, cwd: string) => Promise<string>;

export interface RoleScopeCheck {
  readonly roleId: Role["id"];
  readonly changedPaths: ReadonlyArray<string>;
  readonly outOfScope: ReadonlyArray<string>;
  /** Text for the parent, or null when every changed path is in scope. */
  readonly warning: string | null;
}

const defaultRunGit: RunGit = async (args, cwd) =>
  (await promisify(execFile)("git", [...args], { cwd, maxBuffer: 8 * 1024 * 1024 })).stdout;

export function scopeWarning(role: Role, outOfScope: ReadonlyArray<string>): string | null {
  if (outOfScope.length === 0) return null;
  const allowed = role.readOnly ? "it is read-only" : `its scope is ${role.writeScope.join(", ")}`;
  return `Warning: the ${role.displayName} role changed files outside its write scope (${allowed}):\n${outOfScope
    .map((path) => `- ${path}`)
    .join("\n")}`;
}

export function scopeCheckFromPaths(
  role: Role,
  changedPaths: ReadonlyArray<string>,
): RoleScopeCheck {
  const unique = [...new Set(changedPaths.map((p) => p.trim()).filter((p) => p.length > 0))].sort();
  const outOfScope = pathsOutOfScope(role, unique);
  return {
    roleId: role.id,
    changedPaths: unique,
    outOfScope,
    warning: scopeWarning(role, outOfScope),
  };
}

/** Changed (committed, uncommitted and untracked) paths since `baseRef`, checked against the role. */
export async function checkRoleScope(options: {
  readonly roleId: string | undefined;
  readonly cwd: string;
  readonly baseRef: string;
  readonly runGit?: RunGit;
}): Promise<RoleScopeCheck | null> {
  const role = options.roleId === undefined ? undefined : findRole(options.roleId);
  if (role === undefined) return null;
  const git = options.runGit ?? defaultRunGit;
  const [diff, untracked] = await Promise.all([
    git(["diff", "--name-only", options.baseRef], options.cwd),
    git(["ls-files", "--others", "--exclude-standard"], options.cwd),
  ]);
  return scopeCheckFromPaths(role, [...diff.split("\n"), ...untracked.split("\n")]);
}
