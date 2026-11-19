import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemedToaster, ThemeSync } from "@/components/theme/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "InfraWatch", template: "%s · InfraWatch" },
  description: "Read-only monitoring dashboard for Amazon EC2 and CloudWatch.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script (see ThemeSync) sets data-theme before React hydrates.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-navy-50 dark:bg-navy-950 text-navy-900 dark:text-navy-100">
        <ThemeSync />
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
