/**
 * Default Next.js 16 App Router starter template
 * Configured with Tailwind CSS, Shadcn UI conventions, and Buddhi AI branding.
 */

export interface StarterFile {
  path: string;
  content: string;
}

export const NEXTJS_STARTER_FILES: StarterFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "buddhi-vibe-app",
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev --port 3000",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "16.3.4",
          react: "19.2.8",
          "react-dom": "19.2.8",
          "lucide-react": "^1.7.0",
          clsx: "^2.1.1",
          "tailwind-merge": "^3.5.0",
          "class-variance-authority": "^0.7.1",
        },
        devDependencies: {
          typescript: "^5",
          "@types/node": "^20",
          "@types/react": "19.2.18",
          "@types/react-dom": "19.2.7",
          tailwindcss: "^4",
          "@tailwindcss/postcss": "^4",
        },
      },
      null,
      2
    ),
  },
  {
    path: "tsconfig.json",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [
            {
              name: "next",
            },
          ],
          paths: {
            "@/*": ["./*"],
          },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    ),
  },
  {
    path: "next.config.ts",
    content: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
  },
  {
    path: "components.json",
    content: JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "default",
        rsc: true,
        tsx: true,
        tailwind: {
          config: "",
          css: "app/globals.css",
          baseColor: "zinc",
          cssVariables: true,
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
          hooks: "@/hooks",
        },
      },
      null,
      2
    ),
  },
  {
    path: "lib/utils.ts",
    content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  },
  {
    path: "app/globals.css",
    content: `@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
`,
  },
  {
    path: "app/layout.tsx",
    content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buddhi AI - Next.js Vibe App",
  description: "Built with Buddhi AI Next.js Vibe Coding",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
`,
  },
  {
    path: "app/page.tsx",
    content: `import { Sparkles, Terminal, Code2, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="w-full max-w-2xl text-center space-y-8">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium tracking-wide">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Next.js 16 Environment Ready</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <Sparkles className="size-7 text-emerald-400" />
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Buddhi AI Vibe Coder
            </h1>
          </div>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Your live Next.js sandbox is running with Tailwind CSS & Shadcn conventions.
            Prompt the AI in the chat to create components, full pages, or entire web applications.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm space-y-2 hover:border-zinc-700 transition-colors">
            <div className="size-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-emerald-400">
              <Zap className="size-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">Instant HMR</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Real-time hot module replacement compiled live inside in-browser WebAssembly.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm space-y-2 hover:border-zinc-700 transition-colors">
            <div className="size-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-sky-400">
              <Code2 className="size-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">Shadcn & Tailwind</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Pre-configured with modern Tailwind CSS and standard component structure.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm space-y-2 hover:border-zinc-700 transition-colors">
            <div className="size-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-amber-400">
              <Terminal className="size-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">Auto-Persisted</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              All source files automatically persist to IndexedDB keyed to your chat session.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-zinc-900 text-xs text-zinc-500">
          Tip: Try asking &ldquo;Build a modern analytics dashboard with interactive charts&rdquo;
        </div>
      </div>
    </main>
  );
}
`,
  },
  {
    path: ".gitignore",
    content: `node_modules/
.next/
dist/
.env*.local
*.log
.DS_Store
`,
  },
];
