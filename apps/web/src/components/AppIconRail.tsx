import {
  ChartNoAxesColumnIcon,
  MessageSquareIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Share2Icon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import { openCommandPalette } from "../commandPaletteBus";
import { PullRequestGlyph } from "~/components/pullRequest/pullRequestIcons";
import { SidebarUpdatePill } from "./sidebar/SidebarUpdatePill";
import { useSidebar } from "./ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { readPullRequestListPreferences } from "./pullRequest/pullRequestListPreferences";

const RAIL_BUTTON_CLASS =
  "flex size-9 items-center justify-center rounded-lg text-sidebar-muted-foreground transition-colors hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=true]:bg-foreground/10 aria-[current=true]:text-sidebar-foreground";

function RailButton(props: {
  readonly label: string;
  readonly active?: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={props.label}
            aria-current={props.active === true ? "true" : undefined}
            className={RAIL_BUTTON_CLASS}
            onClick={props.onClick}
          >
            {props.children}
          </button>
        }
      />
      <TooltipPopup side="right">{props.label}</TooltipPopup>
    </Tooltip>
  );
}

/**
 * The narrow icon rail left of the sidebar, as in the Fhara mockup: brand on top,
 * navigation icons, and utility links at the bottom. Every icon opens something real.
 */
export function AppIconRail() {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const pathname = useLocation({ select: (location) => location.pathname });
  const onUtilityPage =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/usage") ||
    pathname.startsWith("/pull-requests");
  return (
    <aside
      aria-label="App navigation"
      className="flex h-dvh w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3"
    >
      <Link
        aria-label="Fhara home"
        to="/"
        className="mb-2 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-bright text-white shadow-sm"
      >
        <Share2Icon aria-hidden className="size-4" strokeWidth={2.25} />
      </Link>
      <RailButton label="Toggle sidebar" onClick={toggleSidebar}>
        <PanelLeftIcon />
      </RailButton>
      <RailButton label="New thread" onClick={() => openCommandPalette({ open: "new-thread-in" })}>
        <PlusIcon />
      </RailButton>
      <RailButton label="Search" onClick={() => openCommandPalette()}>
        <SearchIcon />
      </RailButton>
      <RailButton label="Chat" active={!onUtilityPage} onClick={() => void navigate({ to: "/" })}>
        <MessageSquareIcon />
      </RailButton>
      <div className="mt-auto flex flex-col items-center gap-1">
        <SidebarUpdatePill />
        <RailButton
          label="Pull requests"
          onClick={() =>
            void navigate({
              to: "/pull-requests",
              search: readPullRequestListPreferences(),
            })
          }
        >
          <PullRequestGlyph.pullRequest />
        </RailButton>
        <RailButton label="Usage" onClick={() => void navigate({ to: "/usage" })}>
          <ChartNoAxesColumnIcon />
        </RailButton>
        <RailButton
          label="Settings"
          active={pathname.startsWith("/settings")}
          onClick={() => void navigate({ to: "/settings" })}
        >
          <SettingsIcon />
        </RailButton>
      </div>
    </aside>
  );
}
