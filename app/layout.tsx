import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "MarketScout – Autonomous AI Lead Generation Agent",
    template: "%s | MarketScout",
  },
  description:
    "An AI agent that searches the web, verifies official business websites, scores every lead and drafts a personal outreach email.",
  openGraph: {
    title: "MarketScout – Autonomous AI Lead Generation Agent",
    description:
      "An AI agent that searches the web, verifies official business websites, scores every lead and drafts a personal outreach email.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="bg-[#05080c]">{children}</body>
    </html>
  );
}