import { describe, expect, it } from "vite-plus/test";
import { AGENT_ROLE_SUMMARIES, OrchestratorMcpDelegateTaskInput } from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { ROLES, getRole } from "../roles/registry.ts";
import { delegatedRole, roleInteractionMode, taskPrompt } from "./delegatedTaskModes.ts";

const decode = Schema.decodeUnknownSync(OrchestratorMcpDelegateTaskInput);

describe("delegate_task role", () => {
  it("accepts the nine agent roles and omitting role", () => {
    for (const role of ROLES) expect(decode({ task: "x", role: role.id }).role).toBe(role.id);
    expect(decode({ task: "x" }).role).toBeUndefined();
  });

  it("rejects an unknown role", () => {
    expect(() => decode({ task: "x", role: "janitor" })).toThrow();
  });

  it("injects the role system prompt ahead of the task", () => {
    const prompt = taskPrompt({ task: "Fix the login form.", role: "frontend" });
    expect(prompt.startsWith(getRole("frontend").systemPrompt.trim())).toBe(true);
    expect(prompt.endsWith("Fix the login form.")).toBe(true);
    expect(prompt).toContain("Only write files matching:");
  });

  it("tells read-only roles not to edit", () => {
    expect(taskPrompt({ task: "Review it.", role: "reviewer" })).toContain("read-only");
  });

  it("keeps legacy task kinds unchanged", () => {
    expect(taskPrompt({ task: "t" })).toBe("t");
    expect(taskPrompt({ task: "t", role: "general" })).toBe("t");
    expect(taskPrompt({ task: "t", role: "review" })).toBe("Act as the review sub-agent for this task.\n\nt");
    expect(delegatedRole({ role: "review" })).toBeUndefined();
  });

  it("caps read-only roles at plan mode and leaves write roles alone", () => {
    for (const role of ROLES) {
      expect(roleInteractionMode(role, "default")).toBe(role.readOnly ? "plan" : "default");
      expect(roleInteractionMode(role, undefined)).toBe(role.readOnly ? "plan" : undefined);
    }
    expect(roleInteractionMode(undefined, "default")).toBe("default");
    expect(ROLES.filter((r) => r.readOnly).map((r) => r.id)).toEqual([
      "cto",
      "designer",
      "reviewer",
      "researcher",
    ]);
  });

  it("matches the contracts role summary", () => {
    expect(
      ROLES.map(({ id, displayName, description, readOnly, writeScope }) => ({
        id,
        displayName,
        description,
        readOnly,
        writeScope: [...writeScope],
      })),
    ).toEqual(AGENT_ROLE_SUMMARIES.map((r) => ({ ...r, writeScope: [...r.writeScope] })));
  });
});
