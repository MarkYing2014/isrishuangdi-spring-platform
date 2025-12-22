import type { Metadata } from "next";
import { DieSpringCalculator } from "@/components/calculators/DieSpringCalculator";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Die Spring Calculator & 3D Model | Rectangular Wire, Closed & Ground Ends",
  description:
    "Accurate die spring calculator with rectangular wire geometry, closed & ground ends, stress analysis, and realistic 3D preview. Built for real manufacturing constraints.",
  keywords: [
    "die spring calculator",
    "ISO 10243 spring",
    "rectangular wire spring",
    "JIS B5012 spring",
    "heavy duty spring",
    "mold spring design",
  ],
};

export default function DieSpringPage() {
  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Die Spring Calculator Module" zh="模具弹簧计算模块" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Die Spring Calculator" zh="模具弹簧计算器" />
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          <LanguageText
            en="Calculate rectangular wire die spring rate, load, and stress. Supports ISO 10243, JIS B5012 standards and custom rectangular sections."
            zh="计算矩形截面模具弹簧的刚度、载荷和应力。支持 ISO 10243、JIS B5012 标准及自定义矩形截面。"
          />
        </p>
      </div>

      {/* Calculator */}
      <DieSpringCalculator />
    </section>
  );
}
