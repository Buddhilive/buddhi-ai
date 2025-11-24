"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { NavActions } from "@/components/nav-actions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useNavigation } from "@/hooks/use-navigation";
import { WebLLMLoading } from "@/components/webllm-loading";
import { useWebLLMStore } from "@/stores/mediaPipeStore";
import { useEffect } from "react";
import { useMediapipe } from "@/hooks/use-mediapipe";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { breadcrumbTitle } = useNavigation();
  const { mediaPipeState, retryInitialization } = useMediapipe();
  const { setWebLLMInstance } = useWebLLMStore();

  useEffect(() => {
    if (mediaPipeState.engine) setWebLLMInstance(mediaPipeState.engine);
  }, [mediaPipeState.engine, setWebLLMInstance]);

  return (
    <>
      {mediaPipeState.isInitialized ? (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2">
              <div className="flex flex-1 items-center gap-2 px-3">
                <SidebarTrigger />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
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
              <div className="ml-auto px-3">
                <NavActions />
              </div>
            </header>
            {children}
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <WebLLMLoading {...mediaPipeState} onRetry={retryInitialization} />
      )}
    </>
  );
}
