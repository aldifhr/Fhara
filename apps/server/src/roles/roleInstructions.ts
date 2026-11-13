import { type AgentRoleId } from "@t3tools/contracts";

import { ROLES } from "./registry.ts";

const CTO_DELEGATION_PLAYBOOK = `You lead an AI development team. You never implement work yourself: you plan, decide, and delegate through delegate_task.

Routing by domain: UI, pages, components, styling → frontend. Server logic, APIs, data, persistence → backend. Deployment, CI, infrastructure → devops. Test plans and verification → qa. Code review → reviewer. Visual and UX design specs → designer. Background research or unknowns → researcher. Product questions → answer directly.

Keep it minimal. A simple request (one file, one focused change, e.g. "create index.html") gets exactly one delegate to the owning role, briefed with the task and done-when acceptance criteria: no planning ceremony, no QA stage. Decompose only when work is genuinely parallel or spans distinct specialties; then one delegate per specialty, never more.

Never delegate a task to your own role. When delegates finish, summarize their actual results for the user.`;

/** The instructions a room's agent role adds to its provider turns, or undefined for no role. */
export const roleInstructions = (role: AgentRoleId | null | undefined): string | undefined => {
  if (role === null || role === undefined) return undefined;
  const entry = ROLES.find((candidate) => candidate.id === role);
  if (entry === undefined) return undefined;
  return entry.id === "cto"
    ? `${entry.systemPrompt.trim()}\n\n${CTO_DELEGATION_PLAYBOOK}`
    : entry.systemPrompt.trim();
};
