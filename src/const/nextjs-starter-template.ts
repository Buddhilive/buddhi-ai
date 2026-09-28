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
  {
    path: "dev-server.js",
    content: `const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);

function readSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function renderHtml(urlPath) {
  let subRoute = urlPath.split("?")[0].replace(/^\\/+/, "").replace(/\\/+$/, "");
  let targetFile = subRoute ? \`/workspace/app/\${subRoute}/page.tsx\` : "/workspace/app/page.tsx";

  let pageCode = readSafe(targetFile);
  if (!pageCode) {
    pageCode = readSafe("/workspace/app/page.tsx") || "export default function Page() { return <div>Not Found</div>; }";
  }

  let globalsCss = (readSafe("/workspace/app/globals.css") || "").replace(/@import\s+["']tailwindcss["'];?/g, "");

  // Sanitize JSX: remove Next.js server directives and local utility imports
  let cleanCode = pageCode.replace(/["']use client["'];?/g, "");
  cleanCode = cleanCode.replace(/import\\s+type\\s+[^;]+;/g, "");
  cleanCode = cleanCode.replace(/from\\s+["']@\\/lib\\/utils["']/g, 'from "https://esm.sh/clsx"');
  cleanCode = cleanCode.replace(/from\\s+["']@\\/components\\/ui\\/([^"']+)["']/g, 'from "https://esm.sh/@radix-ui/react-$1"');
  cleanCode = cleanCode.replace(/export\\s+default\\s+function\\s+([A-Za-z0-9_$]+)/g, 'function $1');
  cleanCode = cleanCode.replace(/export\\s+default\\s+/g, 'const __DefaultExport = ');

  return \`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Buddhi AI - Next.js Vibe App</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://unpkg.com/@babel/standalone@7.24.4/babel.min.js"></script>
  <style>
    \${globalsCss}
    body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
  <div id="root"></div>
  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@19",
        "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
        "react-dom": "https://esm.sh/react-dom@19",
        "react-dom/client": "https://esm.sh/react-dom@19/client",
        "lucide-react": "https://esm.sh/lucide-react?external=react",
        "clsx": "https://esm.sh/clsx",
        "tailwind-merge": "https://esm.sh/tailwind-merge"
      }
    }
  </script>
  <script type="text/babel" data-type="module" data-presets="react,typescript">
    import React from 'react';
    import { createRoot } from 'react-dom/client';

    \${cleanCode}

    try {
      const AppToMount = typeof __DefaultExport !== 'undefined'
        ? __DefaultExport
        : typeof HomePage !== 'undefined'
        ? HomePage
        : typeof Page !== 'undefined'
        ? Page
        : typeof App !== 'undefined'
        ? App
        : null;

      if (AppToMount) {
        createRoot(document.getElementById('root')).render(React.createElement(AppToMount));
      } else {
        createRoot(document.getElementById('root')).render(
          React.createElement('div', { className: 'p-6 text-zinc-400' }, 'No default component found in app/page.tsx')
        );
      }
    } catch (err) {
      console.error('[Preview Runtime Error]', err);
      document.getElementById('root').innerHTML = '<div style="padding:24px;color:#ef4444;font-family:monospace"><h3>Runtime Error</h3><pre>' + (err.stack || err.message) + '</pre></div>';
    }
  </script>
</body>
</html>\`;
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  console.log(\`[dev-server] \${req.method} \${url}\`);

  if (!url.includes(".") || url.endsWith(".html")) {
    const html = renderHtml(url);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    });
    res.end(html);
    return;
  }

  // Handle static assets
  const staticPath = path.join("/workspace", url.split("?")[0]);
  try {
    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      const data = fs.readFileSync(staticPath);
      res.writeHead(200);
      res.end(data);
      return;
    }
  } catch {}

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(\`✓ Next.js dev server listening on virtual port \${PORT}\`);
});
`,
  },
];

export const DEV_SERVER_SCRIPT = NEXTJS_STARTER_FILES.find((f) => f.path === "dev-server.js")!.content;
