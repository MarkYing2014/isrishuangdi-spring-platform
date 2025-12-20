"use client";

import { DieSpringCalculator } from "@/components/calculators/DieSpringCalculator";
import { useLanguage } from "@/components/language-context";

export default function DieSpringPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          {isZh ? "模具弹簧计算模块" : "DIE SPRING CALCULATOR MODULE"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isZh ? "模具弹簧计算器" : "Die Spring Calculator"}
        </h1>
        <p className="text-muted-foreground">
          {isZh
            ? "计算矩形截面模具弹簧的刚度、载荷和应力。"
            : "Calculate rectangular wire die spring rate, load, and stress."}
        </p>
      </div>

      {/* Calculator */}
      <DieSpringCalculator isZh={isZh} />
    </section>
  );
}
