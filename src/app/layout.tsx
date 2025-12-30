import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { LanguageProvider, type SupportedLanguage } from "@/components/language-context";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@vercel/analytics/next";

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
  title: "ISRI-SHUANGDI Spring Engineering Cloud Platform",
  description:
    "Next-generation spring design, simulation, and RFQ platform by ISRI-SHUANGDI.",
};

import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value as SupportedLanguage) || "zh";

  return (
    <html lang={lang} suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-900 antialiased`}
        suppressHydrationWarning={true}
      >
        <LanguageProvider initialLanguage={lang}>
          <div className="flex min-h-screen flex-col">
            <MainNav />
            <main className="flex-1 w-full max-w-6xl px-4 py-10 mx-auto">
              {children}
            </main>
            <SiteFooter />
          </div>
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  );
}
