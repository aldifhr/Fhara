import { AGENT_ROLE_SUMMARIES, type ModelSelection, type ProjectId } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { useNavigate } from "@tanstack/react-router";

import { getCustomModelOptionsByInstance } from "../../modelSelection";
import { providerInstanceEntriesFor } from "../../providerInstances";
import { useEnvironmentProviders, useEnvironments } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS } from "../../state/server";
import { ProviderModelPicker } from "../chat/ProviderModelPicker";
import { toastManager } from "../ui/toast";
import {
  SETTINGS_PICKER_TRIGGER_CLASSNAME,
  SettingResetButton,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";
import { useSettingsScope } from "./SettingsScopeContext";
import { useScopedModelDisabledReason } from "./useScopedModelAvailability";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";

/** The fixed agent roles delegated tasks can run as, each with its model override. */
export function AgentRolesSection() {
  const { target } = useSettingsScope();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const navigate = useNavigate();
  const { environments } = useEnvironments();
  const providersByEnvironment = useEnvironmentProviders();
  const representative = target
    ? environments.find((environment) => environment.environmentId === target.environmentId)
    : undefined;
  const providers =
    (representative?.serverConfig
      ? providersByEnvironment.get(representative.environmentId)
      : undefined) ?? EMPTY_SERVER_PROVIDERS;
  const projectId: ProjectId | null = target?.projectId ?? null;
  const entries = providerInstanceEntriesFor(providers, settings, projectId);
  const modelDisabledReason = useScopedModelDisabledReason(settings, entries);

  const setOverride = (roleId: string, value: ModelSelection | null) => {
    const reason = value ? modelDisabledReason(value.instanceId, value.model) : null;
    if (reason) {
      toastManager.add({ type: "error", title: "Agent model not saved", description: reason });
      return;
    }
    updateSettings({ agentModelOverrides: { [roleId]: value } });
  };

  return (
    <SettingsSection id="agent-roles" title="Roles">
      {AGENT_ROLE_SUMMARIES.map((role) => {
        const override = settings.agentModelOverrides[role.id] ?? null;
        // The picker needs an anchor to render its menu; "Inherit" labels the trigger instead.
        const anchorInstance =
          override?.instanceId ??
          settings.defaultModelSelection?.instanceId ??
          entries[0]?.instanceId;
        const anchorModel =
          override?.model ?? settings.defaultModelSelection?.model ?? entries[0]?.models[0]?.slug;
        const modelOptions = getCustomModelOptionsByInstance(
          settings,
          providers,
          anchorInstance,
          anchorModel,
        );
        return (
          <SettingsRow
            key={role.id}
            serverScoped
            settingKeys={["agentModelOverrides"]}
            id={`agent-role-${role.id}`}
            title={role.displayName}
            description={
              role.readOnly
                ? `${role.description} Read-only.`
                : `${role.description} Writes: ${role.writeScope.join(", ")}.`
            }
            resetAction={
              override !== null ? (
                <SettingResetButton
                  label={`${role.displayName} model`}
                  tooltip="Inherit the default model"
                  onClick={() => setOverride(role.id, null)}
                />
              ) : null
            }
            control={
              anchorInstance !== undefined && anchorModel ? (
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                  <ProviderModelPicker
                    environmentId={representative?.environmentId ?? null}
                    activeInstanceId={anchorInstance}
                    model={anchorModel}
                    lockedProvider={null}
                    instanceEntries={entries}
                    modelOptionsByInstance={modelOptions}
                    triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                    triggerAriaLabel={`${role.displayName} model`}
                    {...(override === null ? { triggerLabel: "Inherit" } : {})}
                    getModelDisabledReason={modelDisabledReason}
                    onOpenProviderSetup={(instanceId) => {
                      if (representative)
                        void navigate({
                          to: "/settings/providers",
                          search: { environmentId: representative.environmentId, instanceId },
                        });
                    }}
                    onInstanceModelChange={(instanceId, model) =>
                      setOverride(role.id, createModelSelection(instanceId, model))
                    }
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">No providers available</span>
              )
            }
          />
        );
      })}
    </SettingsSection>
  );
}
