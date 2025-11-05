import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, FileText, PenTool } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Link href="/chat" className="block">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-blue-600" />
                <CardTitle>Chat</CardTitle>
              </div>
              <CardDescription>
                A dynamic, private conversational AI assistant powered by client-side AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Engage in secure conversations with AI directly in your browser, ensuring your data stays private.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/summarizer" className="block">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-green-600" />
                <CardTitle>Summarizer</CardTitle>
              </div>
              <CardDescription>
                A tool for instantly generating concise summaries of text content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Transform lengthy documents into digestible summaries with AI-powered text analysis.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/writer" className="block">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PenTool className="h-6 w-6 text-purple-600" />
                <CardTitle>Writer</CardTitle>
              </div>
              <CardDescription>
                A versatile assistant designed to aid in drafting, editing, and generating text
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enhance your writing with AI assistance for creating, editing, and improving content.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">More Apps Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            We're continuously expanding our collection of useful AI-powered tools. 
            Stay tuned for exciting new applications!
          </p>
        </div>
      </div>
    </div>
  );
}
