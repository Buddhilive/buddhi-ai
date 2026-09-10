"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "motion/react";
import React, { useRef } from "react";
import { Cpu, ShieldCheck, Zap, ServerOff, ArrowRight, BrainCircuit, Sparkles, Layers, Terminal, Database, Play } from "lucide-react";

// Tilt Card Component for the 3D hover magnetic effect
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left - width / 2);
    mouseY.set(clientY - top - height / 2);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [10, -10]), { damping: 30, stiffness: 200 });
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-10, 10]), { damping: 30, stiffness: 200 });

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-3xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none transition-colors group ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Electronic Circuit Background
function CircuitBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-60 dark:opacity-50">
      <style>{`
        .circuit-node { filter: drop-shadow(0 0 10px #e05d38) drop-shadow(0 0 20px #e05d38) drop-shadow(0 0 40px #e05d38); }
        .dark .circuit-node { filter: drop-shadow(0 0 10px #fbbf24) drop-shadow(0 0 20px #f59e0b) drop-shadow(0 0 40px #d97706); }
      `}</style>
      <svg className="absolute w-full h-full" viewBox="0 0 2000 2000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-200 dark:text-zinc-800" />
            <circle cx="100" cy="100" r="1.5" className="fill-zinc-300 dark:fill-zinc-700" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {[
          { d: "M 0 200 L 400 200 L 400 600 L 1000 600 L 1000 1200 L 2000 1200", delay: 0, dur: 4 },
          { d: "M 200 0 L 200 400 L 800 400 L 800 1000 L 1600 1000 L 1600 2000", delay: 2, dur: 5 },
          { d: "M 2000 400 L 1400 400 L 1400 800 L 600 800 L 600 1600 L 0 1600", delay: 1, dur: 6.5 },
          { d: "M 1800 0 L 1800 600 L 1200 600 L 1200 1400 L 400 1400 L 400 2000", delay: 3, dur: 5.5 },
          { d: "M 0 1400 L 800 1400 L 800 800 L 1600 800 L 1600 400 L 2000 400", delay: 1.5, dur: 3.5 },
          { d: "M -200 800 L 600 800 L 600 1800 L 1800 1800 L 1800 2200", delay: 0.5, dur: 6 },
          { d: "M 1000 -200 L 1000 400 L 200 400 L 200 1200 L -200 1200", delay: 2.5, dur: 7 },
        ].map((path, index) => (
          <g key={index}>
            <motion.path
              d={path.d}
              fill="none"
              stroke="#e05d38"
              strokeWidth="2"
              strokeOpacity="0.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 1, 0] }}
              transition={{ duration: path.dur, repeat: Infinity, delay: path.delay, ease: "easeInOut" }}
            />
            <motion.circle
              r="6"
              fill="#ffffff"
              className="circuit-node"
            >
              <animateMotion dur={`${path.dur}s`} repeatCount="indefinite" begin={`${path.delay}s`}>
                <mpath href={`#path-${index}`} />
              </animateMotion>
            </motion.circle>
            <path id={`path-${index}`} d={path.d} fill="none" display="none" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const y1 = useTransform(smoothProgress, [0, 1], [0, 400]);
  const y2 = useTransform(smoothProgress, [0, 1], [0, -500]);
  const y3 = useTransform(smoothProgress, [0, 1], [0, 250]);
  const scale = useTransform(smoothProgress, [0, 0.5], [1, 0.8]);
  const opacity = useTransform(smoothProgress, [0, 0.3, 1], [1, 0, 0]);

  const titleWords = "Vibe Code Full-Stack Next.js On-Device".split(" ");

  return (
    <div ref={containerRef} className="relative min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans selection:bg-[#e05d38] selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden -z-10 pointer-events-none">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#faebe7] dark:bg-[#e05d38]/15 blur-[140px]"
        />
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#f2ccbf]/40 dark:bg-[#a7381a]/25 blur-[140px]"
        />
      </div>

      <CircuitBackground />

      {/* Hero Section */}
      <motion.section style={{ scale }} className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center transform-gpu z-10">
        <motion.div style={{ y: y3, opacity }} className="absolute z-0 pointer-events-none w-full h-full flex items-center justify-center">
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-[350px] h-[350px] md:w-[700px] md:h-[700px]"
          >
            <Image src="/icons/icon-512x512.png" alt="BuddhiAI Icon" fill className="object-contain opacity-20 dark:opacity-25 blur-[3px]" />
          </motion.div>
        </motion.div>

        <motion.div className="z-10 flex flex-col items-center mt-20">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e05d38]/10 text-[#e05d38] border border-[#e05d38]/20 backdrop-blur-md text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(224,93,56,0.15)]"
          >
            <Zap className="w-4 h-4 animate-pulse" /> Client-Side Next.js 16 WebAssembly Sandbox
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-[7rem] font-bold tracking-tighter max-w-6xl leading-[1.05] overflow-hidden py-4">
            {titleWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 100, rotate: 10 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.8, delay: i * 0.08, type: "spring", bounce: 0.2 }}
                className={`inline-block mr-3 md:mr-5 ${
                  word.includes("Next.js") || word.includes("On-Device") || word.includes("Vibe")
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-[#e05d38] to-[#f2ccbf] dark:from-[#e05d38] dark:to-[#eaab95]"
                    : ""
                }`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-8 text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed font-medium"
          >
            Describe what you want in natural language. Local Gemma AI builds, compiles, and runs complete Next.js App Router applications with embedded SQLite in your browser. Zero backend servers, zero API costs, 100% private.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-14"
          >
            <Link href="/chat">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 60px -10px #e05d38" }}
                whileTap={{ scale: 0.95 }}
                className="group relative flex items-center justify-center gap-3 h-16 px-10 rounded-full bg-[#e05d38] text-white font-bold text-xl shadow-[0_0_40px_-15px_#e05d38] overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  Start Vibe Coding
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating Icons */}
        <motion.div style={{ y: y1 }} className="absolute hidden lg:flex top-[20%] left-[10%] xl:left-[15%]">
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(224,93,56,0.15)] backdrop-blur-2xl flex items-center justify-center text-[#e05d38]"
          >
            <Cpu className="w-10 h-10" />
          </motion.div>
        </motion.div>

        <motion.div style={{ y: y2 }} className="absolute hidden lg:flex bottom-[25%] right-[10%] xl:right-[15%]">
          <motion.div
            animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="w-24 h-24 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(224,93,56,0.15)] backdrop-blur-2xl flex items-center justify-center text-[#e05d38]"
          >
            <BrainCircuit className="w-12 h-12" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Value Proposition Section */}
      <section className="relative py-32 px-6 w-full max-w-7xl mx-auto z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {[
            {
              icon: ServerOff,
              title: "Zero Backend Infrastructure",
              desc: "No Docker containers, Firecracker VMs, or remote servers. BuddhiLive Sandbox executes 100% inside dedicated Web Workers with an in-memory POSIX VirtualFS.",
            },
            {
              icon: ShieldCheck,
              title: "Uncompromising Privacy",
              desc: "Every line of generated code, every SQLite transaction, and every AI token stays strictly within your browser. There is no telemetry, cloud logger, or server middleman.",
            },
            {
              icon: Database,
              title: "Full-Stack with SQLite",
              desc: "Build real apps with persistent data. Virtual Node.js intercepts better-sqlite3 using WebAssembly SQLite, enabling full CRUD route handlers in your browser.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15, type: "spring", bounce: 0.4 }}
              className="h-full"
            >
              <TiltCard className="h-full p-10 flex flex-col items-start overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#e05d38]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 rounded-2xl bg-[#e05d38]/10 text-[#e05d38] flex items-center justify-center mb-8 relative">
                  <feature.icon className="w-8 h-8 relative z-10" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-50 relative z-10 transition-colors group-hover:text-[#e05d38]">
                  {feature.title}
                </h3>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed relative z-10">
                  {feature.desc}
                </p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sandbox Spotlight Section */}
      <section className="relative py-32 px-6 bg-zinc-100/50 dark:bg-zinc-900/10 overflow-hidden z-20 border-y border-zinc-200 dark:border-zinc-900">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#e05d38]/5 blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Left side */}
            <div className="lg:col-span-5 flex flex-col items-start text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e05d38]/10 text-[#e05d38] border border-[#e05d38]/20 text-xs font-bold tracking-wider uppercase"
              >
                <Sparkles className="w-3.5 h-3.5" /> Next-Gen Architecture
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-zinc-900 dark:text-zinc-50 leading-tight"
              >
                Client-Side <br className="hidden md:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e05d38] to-[#f2ccbf] dark:from-[#e05d38] dark:to-[#eaab95]">
                  Next.js Sandbox
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium"
              >
                Powered by <strong>@buddhilive/sandbox</strong>. Full Node.js built-ins, transparent SWC compilation via <code>esbuild-wasm</code>, and real-time streaming preview through Service Worker port interception.
              </motion.p>

              <div className="space-y-6 mb-10 w-full">
                {[
                  {
                    title: "React Server Components & App Router",
                    desc: "Full layout and routing semantics supported. Stream chunked responses and live component trees in browser.",
                    icon: Layers,
                  },
                  {
                    title: "Live Terminal & Real-Time I/O",
                    desc: "Single-producer single-consumer (SPSC) ring buffers built on SharedArrayBuffer and Atomics stream stdout/stderr without frame drops.",
                    icon: Terminal,
                  },
                  {
                    title: "Zero Setup, Instant Export",
                    desc: "Generated code conforms to standard Next.js 16 file layouts. Export your files directly into production repos or Vercel.",
                    icon: Play,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#e05d38]/10 text-[#e05d38] flex items-center justify-center mt-1">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">{item.title}</h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Link href="/chat">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px -10px #e05d38" }}
                    whileTap={{ scale: 0.95 }}
                    className="group flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-[#e05d38] text-white font-bold text-md shadow-[0_0_30px_-15px_#e05d38] transition-all font-sans cursor-pointer"
                  >
                    Launch Vibe Workspace
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
              </motion.div>
            </div>

            {/* Right side: Mockup */}
            <div className="lg:col-span-7 w-full flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
                className="w-full max-w-2xl rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 relative overflow-hidden"
              >
                {/* Mockup Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/70 block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/70 block" />
                    <span className="w-3 h-3 rounded-full bg-green-500/70 block" />
                  </div>
                  <div className="px-3 py-0.5 rounded-md bg-zinc-950/60 text-[9px] text-emerald-400 font-mono tracking-wider flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SANDBOX: NEXT.JS 16 DEV (PORT 3000)
                  </div>
                </div>

                {/* Input Area */}
                <div className="mb-6 space-y-2">
                  <span className="text-[10px] text-[#e05d38] font-bold font-mono tracking-wider block">1. NATURAL LANGUAGE PROMPT</span>
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 font-mono text-xs leading-relaxed relative overflow-hidden">
                    <span className="relative z-10">&quot;Build a full-stack SaaS task board with SQLite todos and dark mode&quot;</span>
                    <span className="w-1 h-3.5 bg-zinc-300 inline-block align-middle ml-1 animate-pulse" />
                  </div>
                </div>

                {/* Processing Vector */}
                <div className="flex items-center justify-center my-6 py-2 relative">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                    <div className="w-full h-px border-t border-dashed border-[#e05d38]" />
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="relative z-10 w-12 h-12 rounded-full bg-[#e05d38]/10 border border-[#e05d38]/30 flex items-center justify-center text-[#e05d38] shadow-[0_0_20px_rgba(224,93,56,0.2)]"
                  >
                    <BrainCircuit className="w-6 h-6" />
                  </motion.div>
                </div>

                {/* Output Area */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-wider block">2. NEXT.JS 16 APP ROUTER GENERATED</span>
                    <span className="text-[9px] text-zinc-500 font-mono">Live in POSIX VFS</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] leading-relaxed space-y-2">
                    <div className="text-zinc-400 font-semibold">📁 /workspace/</div>
                    <div className="pl-4 text-emerald-400">├── app/layout.tsx <span className="text-zinc-600">(RootLayout)</span></div>
                    <div className="pl-4 text-emerald-400">├── app/page.tsx <span className="text-zinc-600">(&apos;use client&apos; BoardView)</span></div>
                    <div className="pl-4 text-sky-400">├── app/api/todos/route.ts <span className="text-zinc-600">(better-sqlite3 CRUD)</span></div>
                    <div className="pl-4 text-zinc-400">└── package.json <span className="text-zinc-600">(next 16, react 19)</span></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-40 px-6 bg-zinc-100 dark:bg-zinc-900/30 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-zinc-900 dark:text-zinc-50">How It Works</h2>
            <p className="text-2xl text-zinc-600 dark:text-zinc-400">Three simple steps to on-device vibe coding.</p>
          </motion.div>

          <div className="space-y-32">
            {[
              {
                title: "Prompt Your Vision",
                desc: "Describe your app idea in plain English. Ask for databases, API routes, interactive state, and beautiful Tailwind styles.",
                icon: "01",
              },
              {
                title: "On-Device Code Generation",
                desc: "Local Gemma AI emits clean, modular Next.js 16 App Router files with strict path annotations, grounded in official agent conventions.",
                icon: "02",
              },
              {
                title: "Instant WebAssembly Execution",
                desc: "BuddhiLive Sandbox compiles TypeScript and JSX on the fly via esbuild-wasm, mounts SQLite, and renders a live preview at /__preview/3000/.",
                icon: "03",
              },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  hidden: { opacity: 0, y: 50 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8, staggerChildren: 0.2 } },
                }}
                className="flex flex-col md:flex-row items-center gap-12 md:gap-24"
              >
                <div className={`flex-1 w-full ${idx % 2 !== 0 ? "md:order-2" : ""}`}>
                  <TiltCard className="w-full aspect-[4/3] flex items-center justify-center overflow-hidden relative border-none bg-gradient-to-br from-white/80 to-zinc-50/50 dark:from-zinc-800/80 dark:to-black/50 group shadow-2xl shadow-zinc-200/50 dark:shadow-black/50">
                    <motion.span
                      variants={{ hidden: { scale: 0.5, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: "spring" } } }}
                      className="text-[15rem] font-black text-zinc-200 dark:text-zinc-900/50 absolute z-0 select-none group-hover:scale-110 transition-transform duration-700 ease-out"
                    >
                      {step.icon}
                    </motion.span>
                    <motion.div
                      variants={{ hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                      className="relative z-10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] rounded-3xl bg-white dark:bg-black p-8 border border-zinc-200 dark:border-zinc-800 group-hover:scale-105 transition-transform duration-500"
                    >
                      <Image src="/icons/icon-192x192.png" alt="Step Illustration" width={120} height={120} className="opacity-90" />
                    </motion.div>
                  </TiltCard>
                </div>
                <div className={`flex-1 w-full ${idx % 2 !== 0 ? "md:order-1 md:text-right flex flex-col md:items-end" : "flex flex-col items-start"}`}>
                  <motion.div variants={{ hidden: { opacity: 0, x: idx % 2 !== 0 ? 30 : -30 }, visible: { opacity: 1, x: 0 } }}>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-[#e05d38]/10 text-[#e05d38] font-bold tracking-widest uppercase text-xs mb-6">
                      Step {step.icon}
                    </div>
                    <h3 className="text-4xl md:text-5xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">{step.title}</h3>
                    <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">{step.desc}</p>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <section className="relative py-48 px-6 text-center border-t border-zinc-200 dark:border-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#e05d38]/5 dark:to-[#e05d38]/10 pointer-events-none" />
        <div className="max-w-3xl mx-auto flex flex-col items-center relative z-10">
          <div className="w-24 h-24 mb-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl flex items-center justify-center">
            <Image src="/icons/icon-192x192.png" alt="BuddhiAI" width={80} height={80} />
          </div>

          <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-10 text-zinc-900 dark:text-zinc-50">
            Build full-stack apps at the speed of thought.
          </h2>

          <Link href="/chat">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)" }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-3 h-16 px-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-2xl cursor-pointer"
            >
              Start Vibe Coding Now
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </Link>
        </div>
      </section>
    </div>
  );
}
