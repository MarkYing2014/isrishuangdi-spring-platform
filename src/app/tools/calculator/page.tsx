"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { GarterSpringCalculator } from "@/components/calculators/GarterSpringCalculator";
import { SuspensionSpringCalculator } from "@/components/calculators/SuspensionSpringCalculator";
import { DiskSpringCalculator } from "@/components/calculators/DiskSpringCalculator";
import { TorsionalSystemCalculator } from "@/components/calculators/TorsionalSystemCalculator";
import { ArcSpringCalculator } from "@/components/calculators/ArcSpringCalculator";
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
  {
    type: "disk",
    icon: "⊚",
    nameEn: "Disk Spring",
    nameZh: "碟形弹簧",
    descEn: "Belleville washers, high force",
    descZh: "中空锥形垫圈，高弹性力",
  },
  {
    type: "garter",
    icon: "⭕",
    nameEn: "Garter Spring",
    nameZh: "环形拉簧 (Oil Seal)",
    descEn: "Radial force, closed ring",
    descZh: "径向紧固，闭合圆环",
  },
  {
    type: "torsionalSpringSystem",
    icon: "⚙️",
    nameEn: "Torsional Spring Pack",
    nameZh: "弹簧包 (Spring Pack)",
    descEn: "Clutch dampening, multi-group",
    descZh: "离合器减震，多组弹簧包",
  },
  {
    type: "arc",
    icon: "◎",
    nameEn: "Arc Spring",
    nameZh: "弧形弹簧",
    descEn: "Torque dampening, curved axis",
    descZh: "扭转减震，圆弧轴线",
  },
];

// Wrapper component that handles client-side search params
function CalculatorContent() {
  const searchParams = useSearchParams();
  // 从 store 读取上次保存的弹簧类型，如果没有则默认 compression
  const storedSpringType = useSpringDesignStore(state => state.springType);
  const [selectedType, setSelectedType] = useState<SpringType>(
    storedSpringType ?? "compression"
  );
  const { language } = useLanguage();
  const isZh = language === "zh";
  const router = useRouter();

  // Read type from URL query parameter on mount
  useEffect(() => {
    const typeFromUrl = searchParams.get("type") as SpringType | null;
    if (typeFromUrl && springTypes.some(t => t.type === typeFromUrl)) {
      setSelectedType(typeFromUrl);
    }
  }, [searchParams]);

  const handleTypeSelect = (type: SpringType) => {
    // Special Redirect: Spring Pack Hub
    if (type === "torsionalSpringSystem") {
      router.push("/tools/spring-pack");
      return;
    }

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
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          <span className="text-primary mr-2">1</span>
          {isZh ? "选择弹簧类型" : "Select Spring Type"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {springTypes.map((spring) => (
            <button
              key={spring.type}
              onClick={() => handleTypeSelect(spring.type)}
              className={cn(
                "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                selectedType === spring.type
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              {selectedType === spring.type && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="w-12 h-12 mb-2 flex items-center justify-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xl">{spring.icon}</span>
                </div>
              </div>
              <span className="text-sm font-medium text-center">
                {isZh ? spring.nameZh : spring.nameEn}
              </span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                {isZh ? spring.descZh : spring.descEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Calculator Section */}
      <div id="step-2" className="space-y-4">
        <h2 className="text-lg font-semibold">
          <span className="text-primary mr-2">2</span>
          {isZh ? "输入弹簧参数" : "Enter Spring Parameters"}
        </h2>

        {/* Dynamic Calculator Component */}
        {selectedType === "compression" && <CompressionCalculator />}
        {selectedType === "extension" && <ExtensionCalculator />}
        {selectedType === "torsion" && <TorsionCalculator />}
        {selectedType === "conical" && <ConicalCalculator />}
        {selectedType === "spiralTorsion" && <SpiralTorsionCalculator />}
        {selectedType === "wave" && <WaveSpringCalculator isZh={isZh} />}
        {selectedType === "dieSpring" && <DieSpringCalculator isZh={isZh} />}
        {selectedType === "suspensionSpring" && <SuspensionSpringCalculator />}
        {selectedType === "disk" && <DiskSpringCalculator />}
        {selectedType === "garter" && <GarterSpringCalculator />}
        {selectedType === "torsionalSpringSystem" && <TorsionalSystemCalculator />}
        {selectedType === "arc" && <ArcSpringCalculator />}

        {/* SEO Content Section */}
        <SpringSeoContent type={selectedType} />
      </div>
    </section>
  );
}

// Default export wraps content in Suspense for useSearchParams
export default function SpringCalculatorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading...</div>}>
      <CalculatorContent />
    </Suspense>
  );
}
