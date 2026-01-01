"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSpline } from "@/components/home/hero-spline";
import { LanguageText } from "@/components/language-context";

export function Frame1Hero() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-20 py-20 md:py-32 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
      {/* Left Column (6 Cols) */}
      <div className="md:col-span-6 space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-primary">
            <LanguageText 
              en="Spring Engineering Operating System" 
              zh="弹簧工程操作系统" 
            />
          </h1>
          <p className="text-xl md:text-2xl font-medium text-muted-foreground font-mono">
            <LanguageText 
              en="From geometry → physics → safety → RFQ" 
              zh="从几何 → 物理 → 安全 → 询价" 
            />
          </p>
        </div>
        
        <p className="text-lg text-muted-foreground max-w-lg">
          <LanguageText 
            en="A unified engineering platform for designing, reviewing, and handing off springs with accountability." 
            zh="一个用于设计、评审和交付弹簧的统一工程平台，确保全程可追溯。" 
          />
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="rounded-full px-8 text-base">
            <Link href="/tools/calculator">
              <LanguageText en="Run Engineering Demo" zh="运行工程演示" />
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="rounded-full px-8 text-base text-muted-foreground hover:text-primary">
            <Link href="/tools/calculator">
              <FileText className="mr-2 h-4 w-4" />
              <LanguageText en="View Sample OEM Report" zh="查看 OEM 报告样本" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Right Column (6 Cols) - Visual Placeholder */}
      <div className="md:col-span-6 relative">
         <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-muted/30 shadow-sm relative">
             <HeroSpline />
              {/* Technical Tag - Bottom Right */}
              <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur border rounded-md px-3 py-1.5 text-xs font-mono font-medium text-muted-foreground shadow-sm z-10 pointer-events-none">
                  k(x) · Stress · Grinding · Fatigue
              </div>
         </div>
      </div>
    </section>
  );
}
