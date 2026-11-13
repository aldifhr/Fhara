import { AGENT_ROLE_SUMMARIES, type AgentRoleId } from "@t3tools/contracts";
import { BotIcon } from "lucide-react";

import { roleAvatarClass } from "./chat/agentRoleTask.logic";

import { ComposerControl } from "./chat/ComposerControl";
import { useComposerMenuProps } from "./chat/composerEventScope";
import { ComposerContextLabel } from "./ComposerContextLabel";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "./ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

const ROLE_LABELS = new Map<string, string>(
  AGENT_ROLE_SUMMARIES.map((role) => [role.id, role.displayName]),
);

/** Which of the fixed agent roles this room talks to; null is the plain coding agent. */
export function ComposerContextAgent(props: {
  agentRole: AgentRoleId | null;
  onAgentRoleChange: (agentRole: AgentRoleId | null) => void;
}) {
  const composerMenuProps = useComposerMenuProps();
  const roleLabel =
    props.agentRole === null ? null : (ROLE_LABELS.get(props.agentRole) ?? props.agentRole);
  const label = roleLabel === null ? "Agent" : `To ${roleLabel}`;
  return (
    <Menu>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <ComposerControl
                  size="xs"
                  className="min-w-0 shrink-0"
                  aria-label={`Agent: ${label}`}
                  data-composer-context-control
                />
              }
            />
          }
        >
          {roleLabel === null ? (
            <BotIcon aria-hidden="true" className="size-3" />
          ) : (
            <span
              aria-hidden
              className={`flex size-3 items-center justify-center rounded-full text-3xs font-semibold ${roleAvatarClass(props.agentRole!)}`}
            >
              {roleLabel.charAt(0)}
            </span>
          )}
          <ComposerContextLabel>{label}</ComposerContextLabel>
        </TooltipTrigger>
        <TooltipPopup>Agent</TooltipPopup>
      </Tooltip>
      <MenuPopup side="top" align="end" {...composerMenuProps}>
        <div className="grid w-64 gap-0.5 px-2 py-1.5">
          <div className="font-medium text-muted-foreground text-xs">Agent</div>
          <MenuItem closeOnClick onClick={() => props.onAgentRoleChange(null)}>
            <span className="grid gap-0.5">
              <span className="font-medium text-sm">Default</span>
              <span className="text-muted-foreground text-xs leading-4">
                The plain coding agent, no team role.
              </span>
            </span>
          </MenuItem>
          {AGENT_ROLE_SUMMARIES.map((role) => (
            <MenuItem key={role.id} closeOnClick onClick={() => props.onAgentRoleChange(role.id)}>
              <span className="grid gap-0.5">
                <span className="font-medium text-sm">{role.displayName}</span>
                <span className="text-muted-foreground text-xs leading-4">{role.description}</span>
              </span>
            </MenuItem>
          ))}
        </div>
      </MenuPopup>
    </Menu>
  );
}
