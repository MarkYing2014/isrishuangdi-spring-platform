import type { Metadata } from "next";
import { CompressionCalculator } from "@/components/calculators/CompressionCalculator";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Compression Spring Calculator | Rate, Stress, Buckling & Coil Bind Analysis",
  description:
    "Professional compression spring calculator for spring rate, shear stress, buckling, solid height, and coil bind. Includes 3D preview and design rule checks.",
  keywords: [
    "compression spring calculator",
    "spring rate calculator",
    "coil spring design",
    "spring stress analysis",
    "buckling analysis",
    "coil bind",
    "spring design software",
  ],
};

export default function CompressionSpringPage() {
  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Spring Calculator Module" zh="弹簧计算模块" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Compression Spring Calculator" zh="压缩弹簧计算器" />
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          <LanguageText
            en="Calculate spring rate, load, stress, and buckling safety factors for helical compression springs. Supports 3D preview, fatigue analysis, and engineering-grade design rule checks."
            zh="计算圆柱螺旋压缩弹簧的刚度、载荷、应力和屈曲安全系数。支持 3D 预览、疲劳分析和工程级设计规则校核。"
          />
        </p>
      </div>

      {/* Calculator Component */}
      <CompressionCalculator />
    </section>
  );
}
