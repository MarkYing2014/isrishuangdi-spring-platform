import type { Metadata } from "next";
import { DiskSpringCalculator } from "@/components/calculators/DiskSpringCalculator";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Disk / Belleville Spring Calculator & 3D Visualization",
  description:
    "Design disk springs (Belleville washers) with DIN 2092/2093 calculations. Support for parallel and series stacking, force-deflection and stress analysis.",
  keywords: [
    "disk spring calculator",
    "belleville washer design",
    "stacking disk springs",
    "conical spring washer",
    "DIN 2092",
    "DIN 2093",
  ],
};

export default function DiskSpringPage() {
  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Disk Spring Design Module" zh="碟形弹簧设计模块" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight uppercase">
          <LanguageText en="Disk / Belleville Spring" zh="碟形弹簧（碟簧）" />
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          <LanguageText
            en="Analyze single and stacked disk springs using DIN 2092 engineering models. Visualize complex stacking arrangements and verify design rules in real-time."
            zh="使用 DIN 2092 工程模型分析单片和叠置碟簧。实时可视化复杂的叠放方式并验证设计规则。"
          />
        </p>
      </div>

      {/* Calculator */}
      <DiskSpringCalculator />
    </section>
  );
}
