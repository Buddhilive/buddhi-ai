import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { SandboxServiceWorkerRegistrar } from "@/components/custom/sandbox/sandbox-sw-registrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Buddhi AI — Academic Research Platform",
    template: "%s | Buddhi AI",
  },
  description:
    "AI-powered research platform designed to help students, academics, and researchers read, critique, and write academic papers more efficiently. 100% on-device and private.",
  keywords: [
    "academic research",
    "paper reader",
    "scispace alternative",
    "literature review",
    "academic writing",
    "research assistant",
    "local ai",
    "on-device ai",
    "private ai research",
    "citation assistant",
    "scholarly writing"
  ],
  authors: [{ name: "Buddhi Kavindra" }],
  creator: "Buddhilive Labs",
  publisher: "Buddhilive Labs",
  metadataBase: new URL("https://ai.buddhilive.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Buddhi AI — Academic Research Platform",
    description:
      "Read, understand, and write academic papers with an intelligent on-device AI assistant. Completely private, running in your browser.",
    url: "https://ai.buddhilive.com",
    siteName: "Buddhi AI",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "images/buddhi-ai-screenshot.png",
        width: 1200,
        height: 630,
        alt: "Buddhi AI — Academic Research Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buddhi AI — Academic Research Platform",
    description:
      "Read, understand, and write academic papers with an intelligent on-device AI assistant.",
    images: ["images/buddhi-ai-screenshot.png"],
    creator: "@buddhilive",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Education",
  classification: "Academic Research Tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#e05d38" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta
          httpEquiv="origin-trial"
          content="A/tiwlx81CZF7NW3SkPsCtJHCKrsrcyp+94rpUqctAbRIR8ndcACedO1WapWH+9PYFYa15SRP82NLm1hs8eGWAMAAABxeyJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJmZWF0dXJlIjoiQUlQcm9tcHRBUElNdWx0aW1vZGFsSW5wdXQiLCJleHBpcnkiOjE3NzQzMTA0MDAsImlzVGhpcmRQYXJ0eSI6dHJ1ZX0="
        />
      </head>
      <body className={geistMono.className + " min-h-full flex flex-col"} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SandboxServiceWorkerRegistrar />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
