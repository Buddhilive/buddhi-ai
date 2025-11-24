"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Shield, Lock, Database, Eye, CheckCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 animate-fade-in">
            <Image src="/icons/favicon-32x32.png" alt="Buddhi AI Logo" width={32} height={32} />
            <span className="text-2xl font-extralight leading-none"><strong className="font-bold">Buddhi</strong>AI</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-8">
              <Button asChild variant="outline" size="sm" className="animate-fade-in">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Privacy-First Policy
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Effective Date: November 25, 2025
            </p>
          </div>

          {/* Core Commitment */}
          <Card className="mb-8 border-primary/20 bg-primary/5 animate-fade-in-up delay-100">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-primary">1. Our Commitment to Privacy</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Buddhi AI is built on the core principle of <strong className="text-foreground">Privacy-First, Client-Side Processing</strong>. 
                    We believe that advanced artificial intelligence should not come at the expense of your personal privacy.
                  </p>
                  <div className="bg-background border border-primary/20 rounded-lg p-4">
                    <p className="font-semibold text-foreground">
                      This policy reflects our primary commitment: <span className="text-primary">We do not collect, transmit, store, or process any of your personal data, AI prompts, images, or outputs on our servers.</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core Principle */}
          <div className="mb-8 animate-fade-in-up delay-200">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              2. The Core Principle: No Sensitive Data is Collected on Our Servers
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The fundamental operation of Buddhi AI is entirely <strong className="text-primary">client-side</strong>. 
              This means all processing, inference, and generation occur directly on your device (in your browser) using 
              the local power of the Google MediaPipe Library and the Gemma 3n E2B instruction model.
            </p>

            {/* Data Handling Table */}
            <div className="overflow-x-auto">
              <div className="grid gap-4 min-w-[600px]">
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg font-semibold">
                  <div>Category</div>
                  <div>Description</div>
                  <div>Data Handling</div>
                </div>
                
                <Card>
                  <CardContent className="grid grid-cols-3 gap-4 p-4">
                    <div className="font-medium">User Input (Prompts)</div>
                    <div className="text-sm text-muted-foreground">All text queries you enter into the Chat Interface.</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Processed On-Device Only
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="grid grid-cols-3 gap-4 p-4">
                    <div className="font-medium">Image Input</div>
                    <div className="text-sm text-muted-foreground">Any images you upload for the Image-to-Text multimodal feature.</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Processed On-Device Only
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="grid grid-cols-3 gap-4 p-4">
                    <div className="font-medium">AI Output</div>
                    <div className="text-sm text-muted-foreground">The generated text from conversations.</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Created and Stored On-Device Only
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="grid grid-cols-3 gap-4 p-4">
                    <div className="font-medium">Chat History</div>
                    <div className="text-sm text-muted-foreground">The record of your conversation sessions.</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Stored Locally (IndexedDB)
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Usage Data Collection */}
          <div className="mb-8 animate-fade-in-up delay-300">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              3. Usage Data Collection (Google Analytics)
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              While your AI interactions are completely private, we do utilize a third-party service to gather 
              non-personal data regarding the application's overall usage and performance.
            </p>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">A. Google Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    We use <strong>Google Analytics</strong> to understand how the application is used, such as page load times, 
                    general traffic patterns, and the type of device/browser accessing the tool. This helps us monitor stability, 
                    performance, and plan future feature improvements.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">What Google Analytics Tracks:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Non-Personal Technical Data: Your IP address (anonymized), browser type, device type, language preference</li>
                        <li>• Pages/screens of the application you visit</li>
                        <li>• General Usage Metrics: Session frequency and duration</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">What Google Analytics DOES NOT Track:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Content of your prompts</li>
                        <li>• Your uploaded images</li>
                        <li>• AI-generated responses</li>
                      </ul>
                      <p className="text-sm font-medium text-foreground mt-2">
                        This sensitive interaction data remains entirely on your device.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">B. Data Minimization and Storage</h3>
                  <p className="text-muted-foreground">
                    Your conversation history is stored within your browser's local storage (IndexedDB). You maintain full control 
                    over this data and can clear this history at any time through the application interface or your browser settings.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* No Third-Party Sharing */}
          <Card className="mb-8 animate-fade-in-up delay-400">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">4. No Third-Party Sharing or Model Training</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is not used for training or fine-tuning our AI models. Because all input remains on your device 
                and is never uploaded to our infrastructure, it is impossible for us to access or utilize your private 
                interactions for model development or any other commercial purpose beyond the limited, anonymized usage 
                data collected via Google Analytics as described above.
              </p>
            </CardContent>
          </Card>

          {/* Updates and Contact */}
          <Card className="animate-fade-in-up delay-500">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">5. Updates and Contact Information</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. When we make updates, the "Effective Date" at the top will be revised.
              </p>
            </CardContent>
          </Card>

          {/* Privacy Guarantees */}
          <div className="mt-12 text-center animate-fade-in-up delay-600">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-4">Your Privacy is Guaranteed</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                With Buddhi AI, you can be confident that your conversations, data, and AI interactions remain completely private 
                and secure on your device. We've built privacy into the core architecture, not as an afterthought.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Zero Data Collection</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Client-Side Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-muted-foreground">Full User Control</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/icons/favicon-32x32.png" alt="Buddhi AI Logo" width={32} height={32} />
            <span className="text-2xl font-extralight leading-none"><strong className="font-bold">Buddhi</strong>AI</span>
          </div>
          <p className="text-muted-foreground mb-4">
            Copyright &copy; {new Date().getFullYear()} Buddhilive Academy | The future of private, client-side intelligence.
          </p>
          <div className="flex justify-center gap-6">
            <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms and Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}