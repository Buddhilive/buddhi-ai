"use client"

import * as React from "react";
import { NavChatHistory } from "@/components/nav-chat-history";
import { NavMain } from "@/components/nav-main";
/* import { NavSecondary } from "@/components/nav-secondary"; */
/* import { NavWorkspaces } from "@/components/nav-workspaces" */
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SIDEBAR_DATA } from "@/const/sidebar-data";
import { useNavigation } from "@/hooks/use-navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = SIDEBAR_DATA;
  const { navItems } = useNavigation();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
        <NavMain items={navItems} />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
        <NavChatHistory />
        {/* <NavWorkspaces workspaces={data.workspaces} /> */}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
