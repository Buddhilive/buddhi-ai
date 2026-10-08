"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useNavigation } from "@/hooks/use-navigation";
import { useModelEngine } from "@/hooks/use-ai-model";
import { usePipelineGuard } from "@/hooks/use-pipeline-guard";
import "@/lib/litert-log-filter";
import { ModeToggle } from "@/components/custom/toggle-mode";
import { HardwareStatusBadge } from "@/components/research/hardware-status-badge";
import { StorageQuotaIndicator } from "@/components/research/storage-quota-indicator";

import { cn } from "@/lib/utils";

export default function BuddhiAILayout({ children }: { children: React.ReactNode }) {

  const { breadcrumbTitle, currentPage } = useNavigation();
  useModelEngine();
  usePipelineGuard();

  const isFixedLayout =
    currentPage === "/humanizer" ||
    currentPage.startsWith("/chat") ||
    currentPage.startsWith("/reader") ||
    currentPage.startsWith("/shilpa");

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className={cn("min-w-0", isFixedLayout && "h-svh max-h-svh overflow-hidden flex flex-col")}>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b justify-between">
          <div className="flex items-center gap-2 px-4 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    {breadcrumbTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3 px-4">
            <HardwareStatusBadge />
            <StorageQuotaIndicator />
            <ModeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
