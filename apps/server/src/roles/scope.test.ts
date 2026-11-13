import { describe, expect, it } from "vite-plus/test";

import { getRole, ROLES } from "./registry.ts";
import { globToRegExp, isPathInScope, normalizeRepoPath, pathsOutOfScope } from "./scope.ts";

describe("globToRegExp", () => {
  it("handles *, ? and **", () => {
    expect(globToRegExp("*.md").test("README.md")).toBe(true);
    expect(globToRegExp("*.md").test("docs/README.md")).toBe(false);
    expect(globToRegExp("**/*.md").test("README.md")).toBe(true);
    expect(globToRegExp("**/*.md").test("a/b/c.md")).toBe(true);
    expect(globToRegExp("a/**").test("a/b/c.ts")).toBe(true);
    expect(globToRegExp("a/**").test("ab/c.ts")).toBe(false);
    expect(globToRegExp("file?.ts").test("file1.ts")).toBe(true);
    expect(globToRegExp("file?.ts").test("file12.ts")).toBe(false);
    expect(globToRegExp("a.b").test("axb")).toBe(false);
  });
});

describe("normalizeRepoPath", () => {
  it("cleans relative paths and rejects escapes", () => {
    expect(normalizeRepoPath("./apps//web/x.ts")).toBe("apps/web/x.ts");
    expect(normalizeRepoPath("apps\\web\\x.ts")).toBe("apps/web/x.ts");
    expect(normalizeRepoPath("apps/server/../web/x.ts")).toBe("apps/web/x.ts");
    expect(normalizeRepoPath("../outside.ts")).toBeNull();
    expect(normalizeRepoPath("/etc/passwd")).toBeNull();
    expect(normalizeRepoPath("C:/x.ts")).toBeNull();
    expect(normalizeRepoPath("")).toBeNull();
  });
});

describe("isPathInScope", () => {
  it("read-only roles can write nothing", () => {
    for (const role of ROLES.filter((r) => r.readOnly)) {
      expect(isPathInScope(role, "README.md")).toBe(false);
      expect(isPathInScope(role, "apps/server/src/index.ts")).toBe(false);
    }
  });

  it("frontend", () => {
    const fe = getRole("frontend");
    expect(isPathInScope(fe, "apps/web/src/App.tsx")).toBe(true);
    expect(isPathInScope(fe, "packages/ui/src/Button.tsx")).toBe(true);
    expect(isPathInScope(fe, "apps/server/src/http.ts")).toBe(false);
    expect(isPathInScope(fe, "apps/webby/x.ts")).toBe(false);
  });

  it("backend excludes packages/ui", () => {
    const be = getRole("backend");
    expect(isPathInScope(be, "apps/server/src/http.ts")).toBe(true);
    expect(isPathInScope(be, "packages/contracts/src/orchestratorMcp.ts")).toBe(true);
    expect(isPathInScope(be, "packages/ui/src/Button.tsx")).toBe(false);
    expect(isPathInScope(be, "packages/uikit/src/x.ts")).toBe(true);
    expect(isPathInScope(be, "apps/web/src/App.tsx")).toBe(false);
  });

  it("qa", () => {
    const qa = getRole("qa");
    expect(isPathInScope(qa, "apps/server/src/roles/scope.test.ts")).toBe(true);
    expect(isPathInScope(qa, "x.spec.tsx")).toBe(true);
    expect(isPathInScope(qa, "apps/web/src/__tests__/helper.ts")).toBe(true);
    expect(isPathInScope(qa, "e2e/login.ts")).toBe(true);
    expect(isPathInScope(qa, "apps/server/src/roles/scope.ts")).toBe(false);
  });

  it("devops", () => {
    const ops = getRole("devops");
    expect(isPathInScope(ops, ".github/workflows/ci.yml")).toBe(true);
    expect(isPathInScope(ops, "scripts/release.ts")).toBe(true);
    expect(isPathInScope(ops, "Dockerfile")).toBe(true);
    expect(isPathInScope(ops, "Dockerfile.server")).toBe(true);
    expect(isPathInScope(ops, "vite.config.ts")).toBe(true);
    expect(isPathInScope(ops, "turbo.json")).toBe(true);
    expect(isPathInScope(ops, "package.json")).toBe(true);
    expect(isPathInScope(ops, "apps/server/package.json")).toBe(false);
    expect(isPathInScope(ops, "apps/server/src/http.ts")).toBe(false);
  });

  it("support", () => {
    const sup = getRole("support");
    expect(isPathInScope(sup, "README.md")).toBe(true);
    expect(isPathInScope(sup, "apps/server/README.md")).toBe(true);
    expect(isPathInScope(sup, "docs/guide/setup.txt")).toBe(true);
    expect(isPathInScope(sup, "apps/server/src/http.ts")).toBe(false);
  });

  it("rejects paths escaping the repo", () => {
    expect(isPathInScope(getRole("backend"), "../apps/server/x.ts")).toBe(false);
    expect(isPathInScope(getRole("backend"), "/apps/server/x.ts")).toBe(false);
  });

  it("pathsOutOfScope lists violations", () => {
    expect(
      pathsOutOfScope(getRole("frontend"), ["apps/web/a.tsx", "apps/server/b.ts", "README.md"]),
    ).toEqual(["apps/server/b.ts", "README.md"]);
  });
});
