"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "motion/react";
import React, { useRef } from "react";
import { Cpu, ShieldCheck, Zap, ServerOff, ArrowRight, BrainCircuit } from "lucide-react";

// Tilt Card Component for the 3D hover magnetic effect
function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
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

        {/* Animated Paths and Data Packets */}
        {[
          { d: "M 0 200 L 400 200 L 400 600 L 1000 600 L 1000 1200 L 2000 1200", delay: 0, dur: 4 },
          { d: "M 200 0 L 200 400 L 800 400 L 800 1000 L 1600 1000 L 1600 2000", delay: 2, dur: 5 },
          { d: "M 2000 400 L 1400 400 L 1400 800 L 600 800 L 600 1600 L 0 1600", delay: 1, dur: 6.5 },
          { d: "M 1800 0 L 1800 600 L 1200 600 L 1200 1400 L 400 1400 L 400 2000", delay: 3, dur: 5.5 },
          { d: "M 0 1400 L 800 1400 L 800 800 L 1600 800 L 1600 400 L 2000 400", delay: 1.5, dur: 3.5 },
          { d: "M -200 800 L 600 800 L 600 1800 L 1800 1800 L 1800 2200", delay: 0.5, dur: 6 },
          { d: "M 1000 -200 L 1000 400 L 200 400 L 200 1200 L -200 1200", delay: 2.5, dur: 7 },
          { d: "M 500 0 L 500 300 L 900 300 L 900 700 L 1300 700 L 1300 2000", delay: 1.2, dur: 5.2 },
          { d: "M 0 1000 L 400 1000 L 400 1400 L 1200 1400 L 1200 1800 L 2000 1800", delay: 2.8, dur: 6.8 },
          { d: "M 2000 700 L 1500 700 L 1500 300 L 700 300 L 700 800 L 0 800", delay: 0.8, dur: 7.5 },
          { d: "M 1300 0 L 1300 500 L 1700 500 L 1700 1100 L 900 1100 L 900 2000", delay: 3.5, dur: 8 },
          { d: "M -100 500 L 300 500 L 300 900 L 1100 900 L 1100 1500 L 2100 1500", delay: 2.2, dur: 6.2 },
          { d: "M 1600 2100 L 1600 1500 L 1000 1500 L 1000 900 L 500 900 L 500 -100", delay: 4.1, dur: 7.1 },
          { d: "M 2100 100 L 1700 100 L 1700 600 L 1100 600 L 1100 1200 L 500 1200 L 500 2000", delay: 1.8, dur: 6.6 },
          { d: "M -100 1700 L 300 1700 L 300 1300 L 700 1300 L 700 500 L 2100 500", delay: 3.1, dur: 5.8 }
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
            {/* The data packet */}
            <motion.circle
              r="6"
              fill="#ffffff"
              className="circuit-node"
            >
              <animateMotion dur={`${path.dur}s`} repeatCount="indefinite" begin={`${path.delay}s`}>
                <mpath href={`#path-${index}`} />
              </animateMotion>
            </motion.circle>
            {/* We need an invisible path with an id for animateMotion */}
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
    offset: ["start start", "end end"]
  });

  // Smoothing the scroll so parallax isn't jittery
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Deep Parallax effects
  const y1 = useTransform(smoothProgress, [0, 1], [0, 400]);
  const y2 = useTransform(smoothProgress, [0, 1], [0, -500]);
  const y3 = useTransform(smoothProgress, [0, 1], [0, 250]);
  const scale = useTransform(smoothProgress, [0, 0.5], [1, 0.8]);
  const opacity = useTransform(smoothProgress, [0, 0.3, 1], [1, 0, 0]);

  const titleWords = "Your AI. Your Device.".split(" ");

  return (
    <div ref={containerRef} className="relative min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans selection:bg-[#e05d38] selection:text-white">

      {/* Animated Background Gradients & Particles */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden -z-10 pointer-events-none">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#faebe7] dark:bg-[#e05d38]/15 blur-[140px]"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#f2ccbf]/40 dark:bg-[#a7381a]/25 blur-[140px]"
        />
      </div>

      {/* Circuit System Layer */}
      <CircuitBackground />

      {/* Hero Section */}
      <motion.section style={{ scale }} className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center transform-gpu z-10">
        <motion.div style={{ y: y3, opacity }} className="absolute z-0 pointer-events-none w-full h-full flex items-center justify-center">
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 2, -2, 0]
            }}
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
            <Zap className="w-4 h-4 animate-pulse" /> The Revolution of Web AI is Here
          </motion.div>

          <h1 className="text-6xl md:text-8xl lg:text-[8rem] font-bold tracking-tighter max-w-6xl leading-[1.05] overflow-hidden py-4">
            {titleWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 100, rotate: 10 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1, type: "spring", bounce: 0.2 }}
                className={`inline-block mr-4 md:mr-6 ${word.includes('AI') || word.includes('Device') ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#e05d38] to-[#f2ccbf] dark:from-[#e05d38] dark:to-[#eaab95]' : ''}`}
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
            Experience the future of AI running completely within your browser.
            No server costs, no complex setups, and absolute zero data leaving your PC.
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
                className="group relative flex items-center justify-center gap-3 h-16 px-10 rounded-full bg-[#e05d38] text-white font-bold text-xl shadow-[0_0_40px_-15px_#e05d38] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  Start Your AI Engine
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating Abstract Elements */}
        <motion.div
          style={{ y: y1 }}
          className="absolute hidden lg:flex top-[20%] left-[10%] xl:left-[15%]"
        >
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(224,93,56,0.15)] backdrop-blur-2xl flex items-center justify-center text-[#e05d38]"
          >
            <Cpu className="w-10 h-10" />
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: y2 }}
          className="absolute hidden lg:flex bottom-[25%] right-[10%] xl:right-[15%]"
        >
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
          {[{
            icon: ServerOff,
            title: "Zero Server Costs",
            desc: "Why pay for the cloud when your device has incredible computing power? BuddhiAI runs right on your CPU, GPU, or NPU, bypassing expensive API fees completely."
          }, {
            icon: ShieldCheck,
            title: "Uncompromising Privacy",
            desc: "Your conversations are your business. Every single piece of data stays strictly within your browser. There is no middleman, telemetry, or server to collect your prompts."
          }, {
            icon: Cpu,
            title: "Edge AI Power",
            desc: "Fueled by Google Gemma and LiteRT, we turn your native hardware into a local AI powerhouse. The state-of-the-art models are cached locally for blazing fast reloads."
          }].map((feature, i) => (
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
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-[#e05d38]"
                    initial={{ scale: 1, opacity: 0 }}
                    whileHover={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
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

      {/* How It Works Section */}
      <section className="relative py-40 px-6 bg-zinc-100 dark:bg-zinc-900/30 overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#f2ccbf]/20 dark:bg-[#e05d38]/5 blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-zinc-900 dark:text-zinc-50">How It Works</h2>
            <p className="text-2xl text-zinc-600 dark:text-zinc-400">Three simple steps to absolute AI privacy.</p>
          </motion.div>

          <div className="space-y-32">
            {[
              { title: "Download Model", desc: "Just open the app natively. Your browser securely fetches the powerful lightweight Google model directly into its cache.", icon: "01" },
              { title: "Hardware Acceleration", desc: "Our engine automatically detects and harnesses your CPU, GPU, or NPU ensuring the fastest token generation possible.", icon: "02" },
              { title: "Run Offline Forever", desc: "Once cached, the model lives on your machine. You can even disconnect your internet entirely and still chat securely.", icon: "03" }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  hidden: { opacity: 0, y: 50 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, staggerChildren: 0.2 }
                  }
                }}
                className="flex flex-col md:flex-row items-center gap-12 md:gap-24"
              >
                <div className={`flex-1 w-full ${idx % 2 !== 0 ? 'md:order-2' : ''}`}>
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
                <div className={`flex-1 w-full ${idx % 2 !== 0 ? 'md:order-1 md:text-right flex flex-col md:items-end' : 'flex flex-col items-start'}`}>
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
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#e05d38] to-transparent opacity-50"
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0, scale: 0.9 },
            visible: { opacity: 1, scale: 1, transition: { duration: 0.8, type: "spring", bounce: 0.5, staggerChildren: 0.2 } }
          }}
          className="max-w-3xl mx-auto flex flex-col items-center relative z-10"
        >
          <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="w-24 h-24 mb-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center transform hover:scale-110 transition-transform duration-300"
          >
            <Image src="/icons/icon-192x192.png" alt="BuddhiAI" width={80} height={80} />
          </motion.div>

          <motion.h2
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-10 text-zinc-900 dark:text-zinc-50"
          >
            Ready to cut the cord?
          </motion.h2>

          <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
            <Link href="/chat">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)" }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-3 h-16 px-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-2xl"
              >
                Try BuddhiAI
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
