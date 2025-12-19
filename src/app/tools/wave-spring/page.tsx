"use client";

import { WaveSpringCalculator } from "@/components/calculators/WaveSpringCalculator";
import { useLanguage } from "@/components/language-context";

export default function WaveSpringPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          {isZh ? "波形弹簧计算模块" : "WAVE SPRING CALCULATOR MODULE"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isZh ? "波形弹簧计算器" : "Wave Spring Calculator"}
        </h1>
        <p className="text-muted-foreground">
          {isZh
            ? "计算波形弹簧的刚度、载荷和应力。"
            : "Calculate wave spring rate, load, and stress."}
        </p>
      </div>

      {/* Calculator */}
      <WaveSpringCalculator isZh={isZh} />
    </section>
  );
}
