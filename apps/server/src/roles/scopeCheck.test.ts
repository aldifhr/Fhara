import { describe, expect, it } from "vite-plus/test";

import { getRole } from "./registry.ts";
import { checkRoleScope, scopeCheckFromPaths } from "./scopeCheck.ts";

describe("role scope check", () => {
  it("flags writes outside a write role's scope", () => {
    const role = getRole("frontend");
    const inScope = role.writeScope.find((g) => !g.startsWith("!"))!.replace(/\*\*.*$/, "x.ts");
    const result = scopeCheckFromPaths(role, [inScope, "apps/server/src/main.ts", ""]);
    expect(result.outOfScope).toEqual(["apps/server/src/main.ts"]);
    expect(result.warning).toContain("apps/server/src/main.ts");
  });

  it("flags any write by a read-only role", () => {
    const result = scopeCheckFromPaths(getRole("reviewer"), ["README.md"]);
    expect(result.outOfScope).toEqual(["README.md"]);
    expect(result.warning).toContain("read-only");
  });

  it("returns no warning when nothing changed", () => {
    expect(scopeCheckFromPaths(getRole("backend"), []).warning).toBeNull();
  });

  it("diffs against the base and includes untracked files", async () => {
    const calls: string[][] = [];
    const result = await checkRoleScope({
      roleId: "researcher",
      cwd: "/repo",
      baseRef: "abc123",
      runGit: async (args) => {
        calls.push([...args]);
        return args[0] === "diff" ? "a.ts\n" : "b.ts\n";
      },
    });
    expect(calls).toContainEqual(["diff", "--name-only", "abc123"]);
    expect(result?.outOfScope).toEqual(["a.ts", "b.ts"]);
  });

  it("skips children without a fixed role", async () => {
    expect(await checkRoleScope({ roleId: "general", cwd: "/", baseRef: "x", runGit: async () => "" })).toBeNull();
  });
});
