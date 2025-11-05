import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoMono = Noto_Sans_Mono({
  variable: "--font-noto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Buddhi AI",
  description: "Browser based AI apps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="origin-trial"
          content="A/tiwlx81CZF7NW3SkPsCtJHCKrsrcyp+94rpUqctAbRIR8ndcACedO1WapWH+9PYFYa15SRP82NLm1hs8eGWAMAAABxeyJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJmZWF0dXJlIjoiQUlQcm9tcHRBUElNdWx0aW1vZGFsSW5wdXQiLCJleHBpcnkiOjE3NzQzMTA0MDAsImlzVGhpcmRQYXJ0eSI6dHJ1ZX0="
        />
      </head>
      <body className={`${notoSans.variable} ${notoMono.variable} antialiased`}>
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
    </html>
  );
}
