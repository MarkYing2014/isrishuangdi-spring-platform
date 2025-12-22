"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SpringType } from "@/lib/springTypes";
import { useLanguage } from "@/components/language-context";
import { useSpringDesignStore } from "@/lib/stores/springDesignStore";
import { CompressionCalculator } from "@/components/calculators/CompressionCalculator";
import { ExtensionCalculator } from "@/components/calculators/ExtensionCalculator";
import { TorsionCalculator } from "@/components/calculators/TorsionCalculator";
import { ConicalCalculator } from "@/components/calculators/ConicalCalculator";
import { SpiralTorsionCalculator } from "@/components/calculators/SpiralTorsionCalculator";
import { WaveSpringCalculator } from "@/components/calculators/WaveSpringCalculator";
import { DieSpringCalculator } from "@/components/calculators/DieSpringCalculator";
import { SuspensionSpringCalculator } from "@/components/calculators/SuspensionSpringCalculator";
import { SpringSeoContent } from "@/components/seo/SpringSeoContent";

const springTypes: {
  type: SpringType;
  icon: string;
  nameEn: string;
  nameZh: string;
  descEn: string;
  descZh: string;
}[] = [
  {
    type: "compression",
    icon: "⟐",
    nameEn: "Compression",
    nameZh: "压缩弹簧",
    descEn: "Resist compressive forces",
    descZh: "承受压缩力",
  },
  {
    type: "extension",
    icon: "⟷",
    nameEn: "Extension",
    nameZh: "拉伸弹簧",
    descEn: "Resist tensile forces",
    descZh: "承受拉伸力",
  },
  {
    type: "torsion",
    icon: "↻",
    nameEn: "Torsion",
    nameZh: "扭转弹簧",
    descEn: "Resist rotational forces",
    descZh: "承受扭转力",
  },
  {
    type: "conical",
    icon: "◎",
    nameEn: "Conical",
    nameZh: "锥形弹簧",
    descEn: "Variable rate, telescoping",
    descZh: "变刚度，可嵌套",
  },
  {
    type: "spiralTorsion",
    icon: "🌀",
    nameEn: "Spiral Torsion",
    nameZh: "螺旋扭转弹簧",
    descEn: "Strip wound, high torque",
    descZh: "带材卷绕，高扭矩",
  },
  {
    type: "wave",
    icon: "〰",
    nameEn: "Wave Spring",
    nameZh: "波形弹簧",
    descEn: "Axial load, ultra-low height",
    descZh: "轴向承载，超薄安装高度",
  },
  {
    type: "dieSpring",
    icon: "▭",
    nameEn: "Die Spring",
    nameZh: "模具弹簧",
    descEn: "Rectangular wire, high-load tooling",
    descZh: "矩形线材，高载荷模具",
  },
  {
    type: "suspensionSpring",
    icon: "🚗",
    nameEn: "Suspension Spring",
    nameZh: "减震器弹簧",
    descEn: "Shock absorber, vehicle suspension",
    descZh: "减震器，车辆悬挂系统",
  },
];

export default function SpringCalculatorPage() {
  // 从 store 读取上次保存的弹簧类型，如果没有则默认 compression
  const storedSpringType = useSpringDesignStore(state => state.springType);
  const [selectedType, setSelectedType] = useState<SpringType>(
    storedSpringType ?? "compression"
  );
  const { language } = useLanguage();
  const isZh = language === "zh";

  const handleTypeSelect = (type: SpringType) => {
    setSelectedType(type);
    // Scroll to Step 2
    const step2Element = document.getElementById("step-2");
    if (step2Element) {
      step2Element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          {isZh ? "弹簧计算模块" : "SPRING CALCULATOR MODULE"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isZh ? "弹簧计算器" : "Spring Calculator"}
        </h1>
        <p className="text-muted-foreground">
          {isZh 
            ? "请选择弹簧类型，并使用工程工具估算弹簧刚度与应力。"
            : "Select your spring type and estimate stiffness and stresses using our engineering tools."
          }
        </p>
      </div>

      {/* Step 1: Choose Spring Type */}
      <div className="space-y-4 rounded-lg bg-slate-100 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {isZh ? "第一步 · 选择弹簧类型" : "Step #1 · Choose your spring type"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh ? "首先选择你要设计的弹簧类型。" : "Select the type of spring you want to design."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {springTypes.map((spring) => (
            <button
              key={spring.type}
              onClick={() => handleTypeSelect(spring.type)}
              className={cn(
                "group relative flex flex-col items-center gap-3 rounded-lg border-2 bg-white p-6 text-center transition-all hover:shadow-md",
                selectedType === spring.type
                  ? "border-indigo-500 bg-indigo-50 shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              {/* Icon */}
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-colors",
                  selectedType === spring.type
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                )}
              >
                {spring.icon}
              </span>

              {/* Name */}
              <div className="space-y-1">
                <p
                  className={cn(
                    "font-medium transition-colors",
                    selectedType === spring.type ? "text-indigo-700" : "text-slate-700"
                  )}
                >
                  {isZh ? spring.nameZh : spring.nameEn}
                </p>
                <p
                  className={cn(
                    "text-xs transition-colors",
                    selectedType === spring.type ? "text-indigo-600" : "text-slate-500"
                  )}
                >
                  {isZh ? spring.descZh : spring.descEn}
                </p>
              </div>

              {/* Selected indicator */}
              {selectedType === spring.type && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs text-white">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Calculator */}
      <div id="step-2" className="space-y-4 scroll-mt-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {isZh ? "第二步 · 输入尺寸与工况参数" : "Step #2 · Enter dimensions and working conditions"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh 
              ? "根据所选弹簧类型，输入几何参数与工作压缩量/扭转角度，系统将给出刚度与应力的工程估算结果。"
              : "Enter geometric parameters and working deflection/angle. The system will calculate stiffness and stress estimates."
            }
          </p>
        </div>

        {/* Render calculator based on selected type */}
        {selectedType === "compression" && <CompressionCalculator />}
        {selectedType === "extension" && <ExtensionCalculator />}
        {selectedType === "torsion" && <TorsionCalculator />}
        {selectedType === "conical" && <ConicalCalculator />}
        {selectedType === "spiralTorsion" && <SpiralTorsionCalculator />}
        {selectedType === "wave" && <WaveSpringCalculator isZh={isZh} />}
        {selectedType === "dieSpring" && <DieSpringCalculator isZh={isZh} />}
        {selectedType === "suspensionSpring" && <SuspensionSpringCalculator />}

        {/* SEO Content Section */}
        <SpringSeoContent type={selectedType} />
      </div>
    </section>
  );
}
