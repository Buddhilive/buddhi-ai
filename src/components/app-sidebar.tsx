"use client"

import * as React from "react"
import { NavFavorites } from "@/components/nav-favorites"
import { NavMain } from "@/components/nav-main"
/* import { NavSecondary } from "@/components/nav-secondary"
import { NavWorkspaces } from "@/components/nav-workspaces" */
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SIDEBAR_DATA } from "@/const/sidebar-data"
import { useNavigation } from "@/hooks/use-navigation"

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
        <NavFavorites />
        {/* <NavWorkspaces workspaces={data.workspaces} />
        <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
