import { describe, expect, it } from "vite-plus/test";

import { agentRoleSummary, roleAvatarClass, roleTaskStatusLabel } from "./agentRoleTask.logic";

describe("agentRoleSummary", () => {
  it("finds the role summary", () => {
    expect(agentRoleSummary("frontend")).toEqual({ id: "frontend", displayName: "Frontend" });
  });

  it("returns null without a role", () => {
    expect(agentRoleSummary(null)).toBeNull();
    expect(agentRoleSummary(undefined)).toBeNull();
  });
});

describe("roleTaskStatusLabel", () => {
  it("names the states a user acts on", () => {
    expect(roleTaskStatusLabel("pending")).toBe("Queued");
    expect(roleTaskStatusLabel("running")).toBe("In progress");
    expect(roleTaskStatusLabel("waiting")).toBe("Needs you");
    expect(roleTaskStatusLabel("completed")).toBe("Done");
    expect(roleTaskStatusLabel("cancelled")).toBe("Stopped");
  });
});

describe("roleAvatarClass", () => {
  it("gives each role a stable tint", () => {
    expect(roleAvatarClass("cto")).toMatch(/violet/);
    expect(roleAvatarClass("frontend")).toMatch(/sky/);
    expect(roleAvatarClass("cto")).toBe(roleAvatarClass("cto"));
  });
});
