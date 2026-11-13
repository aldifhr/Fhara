/**
 * Fixed agent role registry.
 *
 * Nine roles with a system prompt, a write scope (repo-relative globs, see
 * `scope.ts`), a read-only flag and routing keywords (see `router.ts`).
 */
import {
  BACKEND_PROMPT,
  CTO_PROMPT,
  DESIGNER_PROMPT,
  DEVOPS_PROMPT,
  FRONTEND_PROMPT,
  QA_PROMPT,
  RESEARCHER_PROMPT,
  REVIEWER_PROMPT,
  SUPPORT_PROMPT,
} from "./prompts.ts";

export const ROLE_IDS = [
  "cto",
  "designer",
  "frontend",
  "backend",
  "qa",
  "reviewer",
  "devops",
  "researcher",
  "support",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export interface Role {
  readonly id: RoleId;
  readonly displayName: string;
  readonly description: string;
  readonly systemPrompt: string;
  /** Repo-relative globs this role may write. `!glob` excludes. Empty when read-only. */
  readonly writeScope: ReadonlyArray<string>;
  readonly readOnly: boolean;
  /** Lowercase domain keywords used by the rule-based router. */
  readonly keywords: ReadonlyArray<string>;
}

export const ROLES: ReadonlyArray<Role> = [
  {
    id: "cto",
    displayName: "CTO",
    description: "Plans the work, makes architecture decisions and splits tasks across roles.",
    systemPrompt: CTO_PROMPT,
    writeScope: [],
    readOnly: true,
    keywords: [
      "plan",
      "architecture",
      "roadmap",
      "decompose",
      "breakdown",
      "tech stack",
      "strategy",
      "trade-off",
      "tradeoff",
      "milestone",
      "estimate",
    ],
  },
  {
    id: "designer",
    displayName: "UI/UX Designer",
    description: "Designs user flows, layouts, UI copy and accessibility.",
    systemPrompt: DESIGNER_PROMPT,
    writeScope: [],
    readOnly: true,
    keywords: [
      "design",
      "ux",
      "ui",
      "wireframe",
      "mockup",
      "user flow",
      "layout",
      "typography",
      "color",
      "colour",
      "accessibility",
      "a11y",
      "figma",
    ],
  },
  {
    id: "frontend",
    displayName: "Frontend",
    description: "Builds UI screens and components in the web app and shared UI package.",
    systemPrompt: FRONTEND_PROMPT,
    writeScope: ["apps/web/**", "packages/ui/**"],
    readOnly: false,
    keywords: [
      "frontend",
      "front-end",
      "react",
      "component",
      "css",
      "tailwind",
      "page",
      "button",
      "form",
      "modal",
      "render",
      "hook",
      "browser",
      "jsx",
      "tsx",
    ],
  },
  {
    id: "backend",
    displayName: "Backend",
    description: "Builds server logic, APIs, contracts, persistence and shared packages.",
    systemPrompt: BACKEND_PROMPT,
    writeScope: ["apps/server/**", "packages/**", "!packages/ui/**"],
    readOnly: false,
    keywords: [
      "backend",
      "back-end",
      "server",
      "api",
      "endpoint",
      "database",
      "db",
      "sql",
      "sqlite",
      "schema",
      "migration",
      "query",
      "websocket",
      "rpc",
      "auth",
      "contract",
    ],
  },
  {
    id: "qa",
    displayName: "QA",
    description: "Writes and runs tests, reproduces bugs and reports quality issues.",
    systemPrompt: QA_PROMPT,
    writeScope: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**", "e2e/**"],
    readOnly: false,
    keywords: [
      "test",
      "tests",
      "testing",
      "qa",
      "vitest",
      "e2e",
      "unit test",
      "regression",
      "coverage",
      "flaky",
      "reproduce",
      "playwright",
    ],
  },
  {
    id: "reviewer",
    displayName: "Reviewer",
    description: "Reviews diffs for correctness, scope, security and test coverage.",
    systemPrompt: REVIEWER_PROMPT,
    writeScope: [],
    readOnly: true,
    keywords: [
      "review",
      "code review",
      "diff",
      "pull request",
      "pr",
      "audit",
      "approve",
      "feedback",
      "lgtm",
    ],
  },
  {
    id: "devops",
    displayName: "DevOps",
    description: "Owns CI, build tooling, scripts, containers and deployment config.",
    systemPrompt: DEVOPS_PROMPT,
    writeScope: [
      ".github/**",
      "scripts/**",
      "Dockerfile*",
      "*.config.*",
      "turbo.json",
      "package.json",
    ],
    readOnly: false,
    keywords: [
      "devops",
      "ci",
      "cd",
      "pipeline",
      "github actions",
      "workflow",
      "docker",
      "dockerfile",
      "deploy",
      "deployment",
      "release",
      "build",
      "turbo",
      "dependency",
      "dependencies",
    ],
  },
  {
    id: "researcher",
    displayName: "Researcher",
    description: "Investigates libraries, APIs and prior art and summarizes options with sources.",
    systemPrompt: RESEARCHER_PROMPT,
    writeScope: [],
    readOnly: true,
    keywords: [
      "research",
      "investigate",
      "compare",
      "comparison",
      "evaluate",
      "alternatives",
      "library",
      "benchmark",
      "prior art",
      "survey",
      "explore",
    ],
  },
  {
    id: "support",
    displayName: "Support",
    description: "Answers questions and maintains docs; the default when no other role fits.",
    systemPrompt: SUPPORT_PROMPT,
    writeScope: ["**/*.md", "docs/**"],
    readOnly: false,
    keywords: [
      "docs",
      "documentation",
      "readme",
      "guide",
      "changelog",
      "how do i",
      "how to",
      "explain",
      "help",
      "question",
      "faq",
    ],
  },
];

const ROLES_BY_ID: ReadonlyMap<RoleId, Role> = new Map(ROLES.map((role) => [role.id, role]));

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as ReadonlyArray<string>).includes(value);
}

export function getRole(id: RoleId): Role {
  const role = ROLES_BY_ID.get(id);
  if (!role) throw new Error(`Unknown role: ${id}`);
  return role;
}

export function findRole(id: string): Role | undefined {
  return isRoleId(id) ? ROLES_BY_ID.get(id) : undefined;
}
