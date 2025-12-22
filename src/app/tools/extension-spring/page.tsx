import type { Metadata } from "next";
import { ExtensionCalculator } from "@/components/calculators/ExtensionCalculator";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Extension Spring Calculator with Hook Types | Initial Tension & Stress Analysis",
  description:
    "Calculate extension springs with different hook types, initial tension, working deflection, and stress. Engineering-accurate formulas with 3D preview.",
  keywords: [
    "extension spring calculator",
    "tension spring design",
    "spring hook types",
    "initial tension calculator",
    "spring stress analysis",
    "helical extension spring",
  ],
};

export default function ExtensionSpringPage() {
  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Spring Calculator Module" zh="弹簧计算模块" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Extension Spring Calculator" zh="拉伸弹簧计算器" />
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          <LanguageText
            en="Design helical extension springs with various hook configurations (Machine, Cross, Side). Calculate spring rate, initial tension, and stress at both body and hooks."
            zh="设计具有各种钩环配置（机械钩、交叉钩、侧钩）的圆柱螺旋拉伸弹簧。计算弹簧主体和钩环处的刚度、初拉力和应力。"
          />
        </p>
      </div>

      {/* Calculator Component */}
      <ExtensionCalculator />
    </section>
  );
}
