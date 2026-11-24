import type { Metadata } from "next";
import { Barlow, Geist, Geist_Mono } from "next/font/google";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Barlow: free DIN-style grotesque for headings and figures.
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Order Sentinel", template: "%s · Order Sentinel" },
  description: "Suspicious Order Monitoring demo — all data is fictitious.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${barlow.variable} h-full antialiased`}>
      <body className="min-h-full pt-7">
        <DemoBanner />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" theme="light" richColors />
      </body>
    </html>
  );
}
