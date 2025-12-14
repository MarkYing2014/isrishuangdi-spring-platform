"use client";

import { useLanguage } from "@/components/language-context";
import { ArcSpringCalculator } from "@/components/calculators/ArcSpringCalculator";

export default function ArcSpringPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          {isZh ? "弧形弹簧计算模块" : "ARC SPRING CALCULATOR MODULE"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isZh ? "弧形弹簧计算器" : "Arc Spring Calculator"}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          {isZh 
            ? "弧形弹簧（DMF 弹簧）是螺旋压缩弹簧在圆弧轴线上的力学映射。核心关系：M(α) = F(α) · r。输出扭矩-角度曲线（含迟滞回线），支持单级/双级系统。"
            : "Arc Spring (DMF Spring) is a mechanical mapping of helical compression spring on a curved axis. Core relation: M(α) = F(α) · r. Outputs Torque-Angle curve with hysteresis loop, supports single/dual-stage systems."
          }
        </p>
      </div>

      {/* Calculator */}
      <ArcSpringCalculator />
    </section>
  );
}
