"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { 
  Brain, 
  Shield, 
  Zap, 
  MessageSquare, 
  FileText, 
  PenTool,
  Lock,
  ArrowRight,
  Sparkles,
  Globe,
  Server,
  CircleDollarSign
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 animate-fade-in">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
            <span className="text-xl font-bold">Buddhi AI</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-bounce-slow">
              <Sparkles className="h-4 w-4" />
              Private, Client-Side AI Intelligence
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-gradient">
              The Future of
              <br />
              <span className="text-primary animate-pulse">Private AI</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Harness the power of artificial intelligence directly within your browser. 
              Built for <span className="text-primary font-semibold">privacy</span>, 
              designed for <span className="text-primary font-semibold">efficiency</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button asChild size="lg" className="animate-bounce-subtle hover:scale-105 transition-transform">
                <Link href="/chat">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 animate-fade-in delay-300">
                <Lock className="h-4 w-4 text-green-500" />
                100% Private
              </div>
              <div className="flex items-center gap-2 animate-fade-in delay-500">
                <CircleDollarSign className="h-4 w-4 text-yellow-500" />
                Cost Efficient
              </div>
              <div className="flex items-center gap-2 animate-fade-in delay-700">
                <Globe className="h-4 w-4 text-blue-500" />
                No Server Required
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Philosophy Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 animate-fade-in-up">
            Privacy-First & Cost-Efficient AI
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-slide-in-left">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Ultimate Privacy</h3>
                  <p className="text-muted-foreground">
                    By utilizing client-side AI models, all computation happens locally on your device. 
                    Your sensitive data and prompts never leave your browser, ensuring unmatched privacy.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Operational Efficiency</h3>
                  <p className="text-muted-foreground">
                    Shifting computation from server to client dramatically reduces costs and environmental impact, 
                    making powerful AI tools accessible and sustainable.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative animate-slide-in-right">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur-3xl"></div>
              <div className="relative bg-card border rounded-2xl p-8 shadow-xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">0%</div>
                    <div className="text-sm text-muted-foreground">Data Sent to Servers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">100%</div>
                    <div className="text-sm text-muted-foreground">Client-Side Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">∞</div>
                    <div className="text-sm text-muted-foreground">Sustainability</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">$0</div>
                    <div className="text-sm text-muted-foreground">Server Costs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 animate-fade-in-up">
            Essential AI Tools
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-card border rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 animate-fade-in-up hover:scale-105">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Chat</h3>
              <p className="text-muted-foreground mb-6">
                A dynamic, private conversational AI assistant that understands context and provides intelligent responses.
              </p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                <Link href="/chat">
                  Try Chat <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <div className="group bg-card border rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 animate-fade-in-up delay-200 hover:scale-105">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Summarizer</h3>
              <p className="text-muted-foreground mb-6">
                Transform lengthy documents into concise, actionable summaries while preserving key insights and context.
              </p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                <Link href="/summarizer">
                  Try Summarizer <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <div className="group bg-card border rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 animate-fade-in-up delay-400 hover:scale-105">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <PenTool className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Writer</h3>
              <p className="text-muted-foreground mb-6">
                A versatile writing assistant for drafting, editing, and generating high-quality content with AI precision.
              </p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                <Link href="/writer">
                  Try Writer <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Vision & Alignment
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Buddhi AI is strategically aligned with the pioneering work on client-side AI models, 
              as championed by modern browser technologies. Our vision is an ever-expanding collection 
              of useful tools that continuously adopts new, powerful on-device models as they become available.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              More than just a set of tools, Buddhi AI is a platform championing the shift towards 
              a more <span className="text-primary font-semibold">distributed</span>, 
              <span className="text-primary font-semibold"> private</span>, and 
              <span className="text-primary font-semibold"> accessible</span> AI ecosystem, 
              making intelligent assistance an inherent and secure capability of the modern web experience.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Experience Private AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the future of AI-powered tools that respect your privacy and run entirely in your browser.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="animate-bounce-subtle hover:scale-105 transition-transform">
                <Link href="/chat">
                  Start Your Journey <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="hover:scale-105 transition-transform">
                <Link href="/dashboard">
                  Explore Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Buddhi AI</span>
          </div>
          <p className="text-muted-foreground">
            The future of private, client-side intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
}
