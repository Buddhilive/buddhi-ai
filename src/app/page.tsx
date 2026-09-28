"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  BrainCircuit,
  Search,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  Database,
  ExternalLink,
  Code2,
} from "lucide-react";
import { ParticleLogo } from "@/components/ui/particle-logo";
import { ModeToggle } from "@/components/custom/toggle-mode";

const GITHUB_REPO_URL = "https://github.com/Buddhilive/buddhi-ai";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden font-sans selection:bg-[#e05d38] selection:text-white">
      {/* Background Glows & Grid */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Top ambient radial gradient */}
        <div
          className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[1200px] h-[750px] opacity-25 blur-[160px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(224,93,56,0.85) 0%, rgba(224,93,56,0.3) 45%, transparent 75%)",
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-zinc-950/70 border-b border-white/[0.08] transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-[#e05d38]/10 border border-[#e05d38]/20 group-hover:border-[#e05d38]/50 transition-colors">
              <Image src="/icons/icon-48x48.png" alt="Buddhi AI" width={28} height={28} className="object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-[#e05d38] transition-colors">
                Buddhi AI
              </span>
              <span className="hidden sm:inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide uppercase bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                Academic v2.0
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="/library" className="hover:text-white transition-colors">
              Library
            </Link>
            <Link href="/chat" className="hover:text-white transition-colors">
              Research Workspace
            </Link>
            <Link href="/models" className="hover:text-white transition-colors">
              Model Hub
            </Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </nav>

          {/* Action Area */}
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link href="/chat">
              <button className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#e05d38] hover:bg-[#e05d38]/90 text-white text-xs font-semibold tracking-wide shadow-[0_0_20px_rgba(224,93,56,0.3)] transition-all cursor-pointer">
                <span>Launch App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-col w-full">
        {/* HERO SECTION */}
        <section className="relative w-full pt-12 pb-20 md:pt-20 md:pb-28 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Column: Interactive Particle Logo Animation */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center order-2 lg:order-1">
              <div className="relative w-full max-w-[480px] p-6 rounded-3xl bg-zinc-900/40 border border-white/[0.08] backdrop-blur-xl shadow-2xl flex flex-col items-center group">
                {/* Particle Canvas Area */}
                <div className="w-full flex items-center justify-center py-2">
                  <ParticleLogo
                    density={4}
                    dispersionStrength={14}
                    interactionRadius={90}
                    returnSpeed={0.08}
                    className="w-full max-w-[380px] sm:max-w-[420px]"
                  />
                </div>

                {/* Tech Chips */}
                <div className="mt-6 w-full grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06] text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Engine</span>
                    <span className="text-xs font-semibold text-zinc-300">LiteRT WebGPU</span>
                  </div>
                  <div className="flex flex-col items-center border-x border-white/[0.06]">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Vector Store</span>
                    <span className="text-xs font-semibold text-zinc-300">PGlite WASM</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Privacy</span>
                    <span className="text-xs font-semibold text-[#e05d38]">100% Local</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Content & Capabilities */}
            <div className="lg:col-span-7 flex flex-col items-start gap-6 order-1 lg:order-2">
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 rounded-full p-[1px] bg-gradient-to-r from-white/30 via-white/10 to-transparent">
                <div className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 text-xs font-mono font-medium text-zinc-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#e05d38]" />
                  <span>Buddhi AI Developer Preview · Everything Runs Client-Side</span>
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[4.2rem] font-bold tracking-tight text-white leading-[1.12]">
                Academic Research & Scholarly Intelligence,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e05d38] via-[#f28564] to-[#f2ccbf]">
                  100% On-Device.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed font-normal">
                Read complex scientific manuscripts with instant AI explanations, run dense semantic vector retrieval via in-browser PGlite, and draft literature matrices completely private on your device with Google LiteRT.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <Link href="/chat">
                  <button className="flex items-center gap-2.5 h-12 px-6 rounded-xl bg-[#e05d38] hover:bg-[#e05d38]/90 text-white font-semibold text-sm shadow-[0_0_30px_rgba(224,93,56,0.35)] transition-all cursor-pointer">
                    <BookOpen className="w-4 h-4" />
                    <span>Start Researching</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>
                </Link>

                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 h-12 px-5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.1] text-sm font-medium transition-colors"
                >
                  <Code2 className="w-4 h-4" />
                  <span>View on GitHub</span>
                </a>

                <Link
                  href="/models"
                  className="flex items-center gap-2 h-12 px-5 rounded-xl bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Model Hub</span>
                </Link>
              </div>

              {/* Capabilities Highlights Banner */}
              <div className="w-full max-w-2xl mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08] backdrop-blur-md flex flex-col">
                  <div className="flex items-center gap-2 text-[#e05d38] mb-1.5 font-semibold text-xs font-mono uppercase tracking-wider">
                    <Cpu className="w-4 h-4" />
                    <span>LiteRT WebGPU</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Zero cloud API calls, running Gemma 4 E2B locally on edge hardware.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08] backdrop-blur-md flex flex-col">
                  <div className="flex items-center gap-2 text-[#e05d38] mb-1.5 font-semibold text-xs font-mono uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>PGlite Vector</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Full PostgreSQL + pgvector compiled to WASM for instant dense retrieval.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08] backdrop-blur-md flex flex-col">
                  <div className="flex items-center gap-2 text-[#e05d38] mb-1.5 font-semibold text-xs font-mono uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>100% Private</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Unpublished manuscripts never leave your device. Complete offline security.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* THREE-PILLAR ARCHITECTURE SECTION */}
        <section className="relative py-24 px-6 border-t border-white/[0.08] bg-zinc-950/40">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center mb-16">
            <div className="inline-flex items-center rounded-full p-[1px] bg-gradient-to-r from-white/30 via-white/10 to-transparent mb-4">
              <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 font-mono text-xs font-medium text-zinc-300 uppercase tracking-wider">
                Architecture = On-Device Models + In-Browser Vector Store + Sandbox
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Private by Architecture. Powerful by Design.
            </h2>
            <p className="text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Buddhi AI shifts the computational burden entirely from remote cloud clusters to client-side hardware. Zero server computation costs and zero external data transmission.
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Google LiteRT */}
            <div className="relative rounded-2xl p-8 bg-zinc-900/50 border border-white/[0.08] backdrop-blur-xl flex flex-col items-start hover:border-[#e05d38]/40 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#e05d38]/10 text-[#e05d38] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#e05d38] transition-colors">
                Google LiteRT Runtime
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Native WebGPU hardware acceleration using <code className="text-xs bg-white/[0.06] px-1 py-0.5 rounded text-zinc-300">@litert-lm/core</code> and <code className="text-xs bg-white/[0.06] px-1 py-0.5 rounded text-zinc-300">@litertjs/core</code>. Runs Gemma 4 E2B and EmbeddingGemma 300M directly in edge browser memory without remote inference calls.
              </p>
              <div className="mt-auto flex items-center gap-2 text-xs font-mono text-[#e05d38]">
                <span>Gemma 4 E2B · WebGPU</span>
              </div>
            </div>

            {/* Card 2: In-Browser PGlite Vector Store */}
            <div className="relative rounded-2xl p-8 bg-zinc-900/50 border border-white/[0.08] backdrop-blur-xl flex flex-col items-start hover:border-[#e05d38]/40 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#e05d38]/10 text-[#e05d38] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#e05d38] transition-colors">
                PGlite Vector Store (WASM)
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Full-featured PostgreSQL compiled to WebAssembly via <code className="text-xs bg-white/[0.06] px-1 py-0.5 rounded text-zinc-300">@electric-sql/pglite</code> with <code className="text-xs bg-white/[0.06] px-1 py-0.5 rounded text-zinc-300">pgvector</code> support. Executes dense vector similarity queries, document chunk caching, and relational filters right in browser memory.
              </p>
              <div className="mt-auto flex items-center gap-2 text-xs font-mono text-[#e05d38]">
                <span>pgvector · Zero Backend</span>
              </div>
            </div>

            {/* Card 3: RLM & Sandbox */}
            <div className="relative rounded-2xl p-8 bg-zinc-900/50 border border-white/[0.08] backdrop-blur-xl flex flex-col items-start hover:border-[#e05d38]/40 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#e05d38]/10 text-[#e05d38] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#e05d38] transition-colors">
                RLM & In-Browser Sandbox
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Recursive Language Models (RLM) deconstruct multi-page academic papers into structured hierarchies. Integrated with <code className="text-xs bg-white/[0.06] px-1 py-0.5 rounded text-zinc-300">@buddhilive/sandbox</code> to compile and live-preview Next.js applications client-side via Service Worker routing.
              </p>
              <div className="mt-auto flex items-center gap-2 text-xs font-mono text-[#e05d38]">
                <span>Service Worker · Live Preview</span>
              </div>
            </div>
          </div>
        </section>

        {/* RESEARCH PIPELINE WORKFLOW SECTION */}
        <section className="relative py-24 px-6 border-t border-white/[0.08]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#e05d38] font-semibold">
                  Scholarly Pipeline
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mt-2">
                  From Raw Manuscript to Synthesized Literature Review
                </h2>
              </div>
              <p className="text-zinc-400 text-sm max-w-md">
                Every stage in the research lifecycle executes locally on your device with complete cryptographic isolation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  title: "Document Ingestion",
                  desc: "Upload PDF or LaTeX papers. Extracts text, tables, and frontmatter metadata locally via pdfjs-dist.",
                  icon: FileText,
                },
                {
                  step: "02",
                  title: "Vector Embeddings",
                  desc: "EmbeddingGemma 300M generates dense 2048-dim vectors into WASM PGlite with zero cloud latency.",
                  icon: Database,
                },
                {
                  step: "03",
                  title: "RLM Decomposition",
                  desc: "Recursive language models summarize methodology sections, isolate experimental limits, and map cross-paper concepts.",
                  icon: Search,
                },
                {
                  step: "04",
                  title: "Citation & Drafting",
                  desc: "Draft conference abstracts, generate verified APA/IEEE citations, and export literature review matrices.",
                  icon: BookOpen,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl p-6 bg-zinc-900/30 border border-white/[0.06] flex flex-col items-start hover:border-white/[0.15] transition-colors"
                >
                  <div className="w-full flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] text-[#e05d38] flex items-center justify-center">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs text-zinc-600 font-bold">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SYSTEM REQUIREMENTS & CALL TO ACTION */}
        <section className="relative py-20 px-6 border-t border-white/[0.08] bg-zinc-950">
          <div className="max-w-4xl mx-auto rounded-3xl p-8 md:p-12 bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border border-white/[0.08] backdrop-blur-xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#e05d38]/10 text-[#e05d38] flex items-center justify-center mb-6">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Begin Your Private Research Session
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-xl mb-8 leading-relaxed">
              No registration required. No remote servers. Launch the research workspace to start reading, querying, and synthesizing academic papers on your machine right now.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/chat">
                <button className="flex items-center gap-2 h-12 px-8 rounded-xl bg-[#e05d38] hover:bg-[#e05d38]/90 text-white font-semibold text-sm shadow-[0_0_30px_rgba(224,93,56,0.35)] transition-all cursor-pointer">
                  <span>Open Research Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/library">
                <button className="flex items-center gap-2 h-12 px-6 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.1] text-sm font-medium transition-colors cursor-pointer">
                  <span>View Document Library</span>
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-6 border-t border-white/[0.08] bg-black text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-48x48.png" alt="Buddhi AI" width={20} height={20} className="opacity-70" />
            <span>Buddhi AI — Open-source client-side intelligence.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/library" className="hover:text-zinc-300 transition-colors">
              Library
            </Link>
            <Link href="/chat" className="hover:text-zinc-300 transition-colors">
              Chat
            </Link>
            <Link href="/models" className="hover:text-zinc-300 transition-colors">
              Models
            </Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition-colors"
            >
              GitHub
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
