import type { Metadata } from "next";
import { WaveSpringCalculator } from "@/components/calculators/WaveSpringCalculator";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Wave Spring Calculator & 3D Visualization | Compact Spring Design Tool",
  description:
    "Design wave springs with accurate load calculation, geometry visualization, and space-saving analysis. Ideal for compact mechanical and automotive applications.",
  keywords: [
    "wave spring calculator",
    "crest-to-crest spring",
    "flat wire compression spring",
    "compact spring design",
    "Smalley wave spring alternative",
  ],
};

export default function WaveSpringPage() {
  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Wave Spring Calculator Module" zh="波形弹簧计算模块" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Wave Spring Calculator" zh="波形弹簧计算器" />
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          <LanguageText
            en="Calculate wave spring rate, load, and stress. Visualize crest-to-crest wave springs for space-constrained applications."
            zh="计算波形弹簧的刚度、载荷和应力。可视化对顶波簧，适用于空间受限的应用场景。"
          />
        </p>
      </div>

      {/* Calculator */}
      <WaveSpringCalculator />
    </section>
  );
}
