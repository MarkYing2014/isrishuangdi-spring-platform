"use client";

import { LanguageText } from "@/components/language-context";
import { ArrowRight, Ruler, Scale, Activity, ShieldCheck } from "lucide-react";

export function RulesVisualizer() {
  const steps = [
    {
      icon: Ruler,
      title: { en: "Geometry (V1)", zh: "几何校验 (V1)" },
      desc: { 
        en: "Physical constraints, manufacturing ratios (Index, aspect ratio), and coil bind gaps.",
        zh: "物理约束、制造比例（旋绕比、高径比）与并紧间隙。"
      },
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200"
    },
    {
      icon: Scale,
      title: { en: "Load & Stress (V2)", zh: "载荷与应力 (V2)" },
      desc: {
        en: "Corrected stress (Wahl), static safety factor, and setting loss risks.",
        zh: "修正应力（Wahl）、静态安全系数与松弛风险。"
      },
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200"
    },
    {
      icon: Activity,
      title: { en: "Fatigue Life", zh: "疲劳寿命" },
      desc: {
        en: "Goodman diagrams, S-N curves, and cycle life prediction reliability.",
        zh: "Goodman 图、S-N 曲线与循环寿命预测可靠性。"
      },
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200"
    },
    {
      icon: ShieldCheck,
      title: { en: "Quality Risk", zh: "质量风险" },
      desc: {
        en: "Process capability (Cpk) estimation based on tolerance class.",
        zh: "基于公差等级的过程能力（Cpk）预估。"
      },
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200"
    }
  ];

  return (
    <div className="relative">
      {/* Connector Line (Desktop) */}
      <div className="absolute top-8 left-0 hidden w-full -translate-y-1/2 md:block">
        <div className="h-0.5 w-full border-t-2 border-dashed border-muted-foreground/30" />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 ${step.bg} ${step.border} shadow-sm transition-transform hover:scale-105`}
              >
                <Icon className={`h-8 w-8 ${step.color}`} />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">
                <LanguageText en={step.title.en} zh={step.title.zh} />
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                <LanguageText en={step.desc.en} zh={step.desc.zh} />
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
