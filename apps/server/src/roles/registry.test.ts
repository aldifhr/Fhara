import { describe, expect, it } from "vite-plus/test";

import { findRole, getRole, isRoleId, ROLE_IDS, ROLES } from "./registry.ts";

const EXPECTED_NAMES: Record<string, string> = {
  cto: "CTO",
  designer: "UI/UX Designer",
  frontend: "Frontend",
  backend: "Backend",
  qa: "QA",
  reviewer: "Reviewer",
  devops: "DevOps",
  researcher: "Researcher",
  support: "Support",
};

describe("role registry", () => {
  it("has exactly 9 roles with unique ids matching ROLE_IDS", () => {
    expect(ROLES).toHaveLength(9);
    const ids = ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(9);
    expect(ids).toEqual([...ROLE_IDS]);
  });

  it("uses the expected display names", () => {
    for (const role of ROLES) {
      expect(role.displayName).toBe(EXPECTED_NAMES[role.id]);
    }
  });

  it("read-only roles have an empty write scope", () => {
    const readOnly = ROLES.filter((r) => r.readOnly).map((r) => r.id);
    expect(readOnly.toSorted()).toEqual(["cto", "designer", "researcher", "reviewer"]);
    for (const role of ROLES) {
      if (role.readOnly) expect(role.writeScope).toEqual([]);
      else expect(role.writeScope.length).toBeGreaterThan(0);
    }
  });

  it("every role has a description, a prompt and lowercase keywords", () => {
    for (const role of ROLES) {
      expect(role.description.length).toBeGreaterThan(10);
      expect(role.systemPrompt).toContain("# Role:");
      const lines = role.systemPrompt.split("\n").length;
      expect(lines).toBeGreaterThanOrEqual(25);
      expect(lines).toBeLessThanOrEqual(60);
      expect(role.keywords.length).toBeGreaterThan(0);
      for (const k of role.keywords) expect(k).toBe(k.toLowerCase());
    }
  });

  it("prompts do not mention retired stack names", () => {
    for (const role of ROLES) {
      expect(role.systemPrompt).not.toMatch(/convex|paradev|nuphos|deepseek|\bdsh\b/i);
    }
  });

  it("looks roles up by id", () => {
    expect(getRole("qa").displayName).toBe("QA");
    expect(findRole("devops")?.id).toBe("devops");
    expect(findRole("nope")).toBeUndefined();
    expect(isRoleId("backend")).toBe(true);
    expect(isRoleId("Backend")).toBe(false);
  });
});
