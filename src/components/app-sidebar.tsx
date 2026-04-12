"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main";
/* import { NavProjects } from "@/components/nav-projects"; */
/* import { NavUser } from "@/components/nav-user"; */
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
