"use client";

import { useLanguage } from "@/components/language-context";
import { VariablePitchCompressionCalculator } from "@/components/calculators/VariablePitchCompressionCalculator";

export default function VariablePitchCompressionPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          {isZh ? "变节距压缩弹簧计算模块" : "VARIABLE PITCH COMPRESSION SPRING MODULE"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isZh ? "变节距压缩弹簧" : "Variable Pitch Compression Spring"}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          {isZh
            ? "用于分段节距压缩弹簧的工程近似计算：输出载荷-位移、刚度与剪应力随压缩量的变化，并支持多工况校核与报告导出。"
            : "Engineering approximation for segmented-pitch compression springs: generates F-Δx, k-Δx and τ-Δx curves, supports multi-point checks and report export."}
        </p>
      </div>

      <VariablePitchCompressionCalculator />
    </section>
  );
}
