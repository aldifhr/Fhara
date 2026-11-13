import { AGENT_ROLE_SUMMARIES } from "@t3tools/contracts";

import { SettingsRow, SettingsSection } from "./settingsLayout";

/** Read-only list of the fixed agent roles delegated tasks can run as. */
export function AgentRolesSection() {
  return (
    <SettingsSection id="agent-roles" title="Roles">
      {AGENT_ROLE_SUMMARIES.map((role) => (
        <SettingsRow
          key={role.id}
          title={role.displayName}
          description={role.description}
          control={
            <span className="text-xs text-muted-foreground">
              {role.readOnly ? "Read-only" : role.writeScope.join(", ")}
            </span>
          }
        />
      ))}
    </SettingsSection>
  );
}
