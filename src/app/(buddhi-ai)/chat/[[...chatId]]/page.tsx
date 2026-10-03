import { Suspense } from "react";
import { ChatInterface } from "@/components/custom/chat/chat-interface";
import { Spinner } from "@/components/ui/spinner";

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col gap-3 h-[calc(100vh-80px)] items-center justify-center">
                <Spinner className="size-8" />
            </div>
        }>
            <ChatInterface />
        </Suspense>
    );
}
