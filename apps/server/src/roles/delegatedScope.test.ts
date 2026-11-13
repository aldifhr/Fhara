import { describe, expect, it } from "vite-plus/test";

import { taskPrompt } from "../mcp/delegatedTaskModes.ts";
import {
  appendScopeWarning,
  delegatedScopeWarning,
  delegatedWorktreeBaseRef,
  roleForDelegatedPrompt,
} from "./delegatedScope.ts";
import type { RunGit } from "./scopeCheck.ts";

const worktreeRuns = [
  { workspacePreparation: undefined },
  {
    workspacePreparation: { type: "worktree" as const, baseRef: "abc123", startFromOrigin: false },
  },
];

function fakeGit(
  diff: string,
  untracked = "",
): { runGit: RunGit; calls: Array<ReadonlyArray<string>> } {
  const calls: Array<ReadonlyArray<string>> = [];
  return {
    calls,
    runGit: async (args) => {
      calls.push(args);
      return args[0] === "diff" ? diff : untracked;
    },
  };
}

describe("delegated child scope warning", () => {
  it("recovers the role from the delegated task prompt", () => {
    expect(
      roleForDelegatedPrompt(taskPrompt({ task: "Fix the button", role: "frontend" } as never))?.id,
    ).toBe("frontend");
    expect(
      roleForDelegatedPrompt(taskPrompt({ task: "Review it", role: "reviewer" } as never))?.id,
    ).toBe("reviewer");
    expect(
      roleForDelegatedPrompt(taskPrompt({ task: "x", role: "implementation" } as never)),
    ).toBeUndefined();
    expect(roleForDelegatedPrompt("plain task")).toBeUndefined();
  });

  it("reads the worktree base ref from the child's runs", () => {
    expect(delegatedWorktreeBaseRef(worktreeRuns)).toBe("abc123");
    expect(delegatedWorktreeBaseRef([{ workspacePreparation: { type: "root" } }])).toBeUndefined();
  });

  it("warns about a write role's out-of-scope paths in its worktree", async () => {
    const git = fakeGit("apps/web/src/App.tsx\napps/server/src/main.ts\n", "notes.txt\n");
    const warning = await delegatedScopeWarning({
      prompt: taskPrompt({ task: "Fix the button", role: "frontend" } as never),
      worktreePath: "/tmp/child",
      runs: worktreeRuns,
      runGit: git.runGit,
    });
    expect(git.calls[0]).toEqual(["diff", "--name-only", "abc123"]);
    expect(warning).toContain("apps/server/src/main.ts");
    expect(warning).toContain("notes.txt");
    expect(warning).not.toContain("App.tsx");
  });

  it("warns when a read-only role changed anything", async () => {
    const warning = await delegatedScopeWarning({
      prompt: taskPrompt({ task: "Review it", role: "reviewer" } as never),
      worktreePath: "/tmp/child",
      runs: worktreeRuns,
      runGit: fakeGit("README.md\n").runGit,
    });
    expect(warning).toContain("read-only");
    expect(warning).toContain("README.md");
  });

  it("stays quiet in scope, for shared children, roleless tasks and git failures", async () => {
    const inScope = fakeGit("apps/web/src/App.tsx\n");
    const prompt = taskPrompt({ task: "Fix", role: "frontend" } as never);
    expect(
      await delegatedScopeWarning({
        prompt,
        worktreePath: "/tmp/c",
        runs: worktreeRuns,
        runGit: inScope.runGit,
      }),
    ).toBeNull();
    const untouched = fakeGit("apps/server/x.ts\n");
    expect(
      await delegatedScopeWarning({
        prompt,
        worktreePath: "/tmp/c",
        runs: [{ workspacePreparation: undefined }],
        runGit: untouched.runGit,
      }),
    ).toBeNull();
    expect(
      await delegatedScopeWarning({
        prompt: "plain",
        worktreePath: "/tmp/c",
        runs: worktreeRuns,
        runGit: untouched.runGit,
      }),
    ).toBeNull();
    expect(untouched.calls).toEqual([]);
    expect(
      await delegatedScopeWarning({
        prompt,
        worktreePath: "/tmp/c",
        runs: worktreeRuns,
        runGit: async () => {
          throw new Error("not a repo");
        },
      }),
    ).toBeNull();
  });

  it("appends the warning to the delivered result", () => {
    expect(appendScopeWarning("Done.", "Warning: x")).toBe("Done.\n\nWarning: x");
    expect(appendScopeWarning(null, "Warning: x")).toBe("Warning: x");
    expect(appendScopeWarning("Done.", null)).toBe("Done.");
  });
});
