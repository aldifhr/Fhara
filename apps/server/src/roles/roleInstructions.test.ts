import { describe, expect, it } from "vite-plus/test";

import { roleInstructions } from "./roleInstructions.ts";

describe("roleInstructions", () => {
  it("returns undefined without a role", () => {
    expect(roleInstructions(null)).toBeUndefined();
    expect(roleInstructions(undefined)).toBeUndefined();
  });

  it("returns the role's system prompt for a plain role", () => {
    const instructions = roleInstructions("frontend");
    expect(instructions).toBeDefined();
    expect(instructions).not.toContain("delegate_task");
  });

  it("extends the CTO prompt with the delegation playbook", () => {
    const instructions = roleInstructions("cto");
    expect(instructions).toContain("delegate_task");
    expect(instructions).toContain("frontend");
    expect(instructions).toContain("Never delegate a task to your own role");
  });

  it("returns undefined for an unknown role id", () => {
    expect(roleInstructions("nonexistent" as never)).toBeUndefined();
  });
});
