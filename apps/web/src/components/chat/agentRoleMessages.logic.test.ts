import type { OrchestrationV2Subagent } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { completionDisplayText, delegatedRoleSender } from "./agentRoleMessages.logic";

const subagent = (overrides: Partial<OrchestrationV2Subagent>): OrchestrationV2Subagent =>
  ({
    id: "task-1",
    threadId: "parent",
    runId: null,
    parentNodeId: "node",
    origin: "app_owned",
    createdBy: "agent",
    driver: "codex",
    providerInstanceId: "codex",
    providerThreadId: null,
    childThreadId: "child-1",
    nativeTaskRef: null,
    prompt: "Build it",
    title: "Build pricing A",
    model: null,
    status: "completed",
    result: null,
    startedAt: null,
    completedAt: null,
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }) as OrchestrationV2Subagent;

describe("delegatedRoleSender", () => {
  it("attributes a completion to the task's role", () => {
    const sender = delegatedRoleSender({
      taskIds: ["task-1"],
      subagents: [subagent({ role: "frontend" })],
    });
    expect(sender).toEqual({
      summary: { id: "frontend", displayName: "Frontend" },
      childThreadId: "child-1",
    });
  });

  it("returns null when no task carries a role", () => {
    expect(delegatedRoleSender({ taskIds: ["task-1"], subagents: [subagent({})] })).toBeNull();
  });

  it("returns null for unknown task ids", () => {
    expect(delegatedRoleSender({ taskIds: ["task-x"], subagents: [] })).toBeNull();
  });

  it("returns null when a cohort mixes roled and roleless tasks", () => {
    expect(
      delegatedRoleSender({
        taskIds: ["task-1", "task-2"],
        subagents: [subagent({ role: "frontend" }), subagent({ id: "task-2" as never })],
      }),
    ).toBeNull();
  });

  it("returns null when tasks name different roles", () => {
    expect(
      delegatedRoleSender({
        taskIds: ["task-1", "task-2"],
        subagents: [
          subagent({ role: "frontend" }),
          subagent({ id: "task-2" as never, role: "backend" }),
        ],
      }),
    ).toBeNull();
  });
});

describe("completionDisplayText", () => {
  it("strips the wake boilerplate and keeps the report", () => {
    expect(
      completionDisplayText(
        "Delegated task node:task (Build pricing A) [completed]:\nPricing A is built and CTO approved the diff.",
      ),
    ).toBe("Pricing A is built and CTO approved the diff.");
  });

  it("keeps text that does not carry the prefix", () => {
    expect(completionDisplayText("Pricing A is built.")).toBe("Pricing A is built.");
  });
});
