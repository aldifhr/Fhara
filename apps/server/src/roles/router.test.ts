import { describe, expect, it } from "vite-plus/test";

import { routeRole } from "./router.ts";

describe("routeRole", () => {
  it("routes @mentions of ids", () => {
    expect(routeRole("@qa please look at this")).toEqual({
      roleId: "qa",
      via: "mention",
      matched: ["@qa"],
    });
    expect(routeRole("hey @DevOps fix the react component").roleId).toBe("devops");
  });

  it("routes @mentions of display names", () => {
    expect(routeRole("@CTO what next?").roleId).toBe("cto");
    expect(routeRole("ask @UI/UX Designer about the server api").roleId).toBe("designer");
    expect(routeRole("ask @uiuxdesigner").roleId).toBe("designer");
  });

  it("mention beats keywords and the first mention wins", () => {
    expect(routeRole("@reviewer the database schema migration api endpoint").roleId).toBe(
      "reviewer",
    );
    expect(routeRole("@frontend then @backend").roleId).toBe("frontend");
  });

  it("ignores email addresses and unknown mentions", () => {
    expect(routeRole("mail qa@example.com about docs").roleId).toBe("support");
    expect(routeRole("@nobody add a database migration").roleId).toBe("backend");
  });

  it("routes by keywords", () => {
    expect(routeRole("Add a database migration for the sessions table").roleId).toBe("backend");
    expect(routeRole("Build a React component for the settings modal").roleId).toBe("frontend");
    expect(routeRole("Write vitest unit tests and check coverage")).toMatchObject({
      roleId: "qa",
      via: "keyword",
    });
    expect(routeRole("Fix the GitHub Actions pipeline and the Dockerfile").roleId).toBe("devops");
    expect(routeRole("Review this diff before merging").roleId).toBe("reviewer");
    expect(routeRole("Research and compare alternatives for glob matching").roleId).toBe(
      "researcher",
    );
    expect(routeRole("Draft a wireframe and user flow for onboarding").roleId).toBe("designer");
    expect(routeRole("Plan the architecture and roadmap").roleId).toBe("cto");
    expect(routeRole("Update the README and changelog").roleId).toBe("support");
  });

  it("matches keywords on word boundaries", () => {
    // "api" inside "capital" and "ci" inside "decide" must not count.
    expect(routeRole("capital decide").via).toBe("fallback");
  });

  it("falls back to support", () => {
    expect(routeRole("hello there")).toEqual({ roleId: "support", via: "fallback", matched: [] });
    expect(routeRole("").roleId).toBe("support");
  });
});
