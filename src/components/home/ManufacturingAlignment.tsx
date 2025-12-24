"use client";

import React from "react";
import { 
  CheckCircle, 
  ShieldCheck, 
  Factory, 
  FileCheck,
  Zap
} from "lucide-react";
import { useLanguage } from "@/components/language-context";
import { LanguageText } from "@/components/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ManufacturingAlignment() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const benefits = [
    {
      icon: <Factory className="h-6 w-6 text-blue-500" />,
      title: { en: "Factory-Aligned Models", zh: "工厂一致性模型" },
      description: { 
        en: "Models calibrated against real factory inspection reports (DIN / ISO standards).", 
        zh: "模型基于真实生产质检报告（DIN / ISO 标准）进行校准和对齐。" 
      }
    },
    {
      icon: <FileCheck className="h-6 w-6 text-emerald-500" />,
      title: { en: "Verified Load Paths", zh: "经验证的载荷路径" },
      description: { 
        en: "Stress, stiffness, and buckling paths verified against production data — not just curve-fitting.", 
        zh: "应力、刚度和屈曲路径经过大量生产数据验证，而非简单的公式拟合。" 
      }
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-indigo-500" />,
      title: { en: "Manufacturing-Ready", zh: "生产就绪" },
      description: { 
        en: "Built to validate designs before tooling, minimizing the cost of trial-and-error.", 
        zh: "旨在图纸下发前验证设计可行性，最大程度减少试模与打样成本。" 
      }
    }
  ];

  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4 border-blue-200 text-blue-600 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
          <Zap className="h-3 w-3 mr-2" />
          {isZh ? "制造可信度" : "Manufacturing Confidence"}
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          <LanguageText 
            en="Manufacturing-Aligned Engineering" 
            zh="面向制造的工程对齐" 
          />
        </h2>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
          <LanguageText 
            en="Replace 'trial-and-error' with engineering certainty. Our platform bridges the gap between digital design and physical production." 
            zh="用工程确定性消除“尝试与错误”。我们的平台跨越了数字设计与物理生产之间的鸿沟。" 
          />
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {benefits.map((benefit, idx) => (
          <Card key={idx} className="border-none shadow-xl bg-slate-50/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">
                <LanguageText en={benefit.title.en} zh={benefit.title.zh} />
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed px-2">
                <LanguageText en={benefit.description.en} zh={benefit.description.zh} />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-8 rounded-3xl bg-slate-900 text-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h4 className="text-2xl font-bold mb-2">
            <LanguageText en="Trusted by Industry Standards" zh="遵循行业顶级标准" />
          </h4>
          <p className="text-slate-400 max-w-xl">
            <LanguageText 
              en="Our core logic matches factory quality reports used in automotive, tooling, and medical environments. No black-box decisions." 
              zh="核心逻辑与汽车、模具及医疗行业工质质检报告高度匹配，拒绝决策黑盒。" 
            />
          </p>
        </div>
        <div className="flex flex-wrap gap-4 relative">
          <Badge className="bg-white/10 hover:bg-white/20 text-white border-none px-3 py-1.5 rounded-lg font-mono text-xs">DIN 2095/96</Badge>
          <Badge className="bg-white/10 hover:bg-white/20 text-white border-none px-3 py-1.5 rounded-lg font-mono text-xs">ISO 10243</Badge>
          <Badge className="bg-white/10 hover:bg-white/20 text-white border-none px-3 py-1.5 rounded-lg font-mono text-xs">VDA 6.3</Badge>
        </div>
      </div>
    </section>
  );
}
