import type { Metadata } from "next";
import { Albert_Sans, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalytics } from "@next/third-parties/google";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
});

const notoMono = Noto_Sans_Mono({
  variable: "--font-noto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Buddhi AI - Private Client-Side AI",
    template: "%s | Buddhi AI"
  },
  description: "Experience the future of private AI with Buddhi AI. Privacy-first AI that runs directly in your browser.",
  keywords: [
    "AI tools",
    "client-side AI",
    "private AI",
    "browser AI",
    "AI chat",
    "text summarizer",
    "AI writer",
    "privacy-first AI",
    "local AI processing",
    "secure AI tools",
    "free AI tools"
  ],
  authors: [{ name: "Buddhi Kavindra" }],
  creator: "Buddhilive Labs",
  publisher: "Buddhilive Labs",
  metadataBase: new URL("https://ai.buddhilive.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Buddhi AI - Private Client-Side AI Tools",
    description: "Powerful AI tools that run directly in your browser. Chat, Summarizer, and Writer with complete privacy and no server-side data processing.",
    url: "https://ai.buddhilive.com",
    siteName: "Buddhi AI",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/buddhi-ai-screenshot.png",
        width: 1200,
        height: 630,
        alt: "Buddhi AI - Private Client-Side AI Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buddhi AI - Private Client-Side AI Tools",
    description: "Powerful AI tools that run directly in your browser with complete privacy.",
    images: ["/buddhi-ai-screenshot.png"],
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
  category: "Technology",
  classification: "AI Tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#34b45a" />
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
      <body className={`${albertSans.variable} ${notoMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" closeButton richColors />
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-N7X9PSKK0Y" />
    </html>
  );
}
