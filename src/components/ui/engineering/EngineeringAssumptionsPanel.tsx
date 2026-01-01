"use client";

import React from "react";
import { 
  Info, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface EngineeringAssumptionsPanelProps {
  className?: string;
  springType: string;
}

export function EngineeringAssumptionsPanel({ className, springType }: EngineeringAssumptionsPanelProps) {
  const commonAssumptions = [
    {
      title: "物理模型 / Physics Models",
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li><strong>疲劳判定 (Fatigue)</strong>: Modified Goodman (修正古德曼判据).</li>
          <li><strong>曲度修正 (Curvature)</strong>: Wahl Factor $K_w$ implemented for all helical types.</li>
          <li><strong>材料常数 (Constants)</strong>: Poisson's ratio $\nu = 0.3$, Steel density $\rho = 7.85$ g/cm³.</li>
        </ul>
      )
    },
    {
      title: "边界条件 / Boundary Conditions",
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li>假设载荷沿轴线均匀分布，且无偏心载荷。 / Axially centered loads assumed.</li>
          <li>假设支承面平整且垂直于轴线。 / Seating surfaces assumed flat and perpendicular.</li>
        </ul>
      )
    },
    {
      title: "未覆盖风险 / Analysis Exclusions",
      content: (
        <ul className="list-disc list-inside space-y-1 text-red-700/80">
          <li><strong>环境影响</strong>: 不包含高温蠕变、低温脆性或腐蚀介质下的性能衰减。</li>
          <li><strong>动力学效应</strong>: 不包含高频共振、冲击载荷下的瞬态波传播分析。</li>
          <li><strong>制造公差</strong>: 结果基于理论名义值，未计入制造公差导致的性能离散。</li>
        </ul>
      )
    }
  ];

  const typeSpecific: Record<string, any[]> = {
    shock: [
      {
        title: "非线性处理 / Non-linear Treatment",
        content: "采用分段聚合 (Segmented Aggregation) 数值积分模拟节距闭合过程中的连续刚度变化。精度优于离散有限元模拟。"
      }
    ],
    disc: [
      {
        title: "碟簧理论 / Disc Spring Theory",
        content: "基于 Almen-Laszlo 理论体系。并列堆叠假设摩擦损耗在标准范围内。"
      }
    ]
  };

  const assumptions = [...commonAssumptions, ...(typeSpecific[springType] || [])];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 px-1">
        <BookOpen className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-bold uppercase tracking-tight">工程假设与声明 / Engineering Assumptions</h4>
      </div>

      <Accordion type="single" collapsible className="w-full bg-slate-50/50 border rounded-xl px-4">
        {assumptions.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-b last:border-b-0">
            <AccordionTrigger className="text-xs font-semibold py-3 hover:no-underline">
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed pb-4">
              {item.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-[10px] text-blue-800">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <p>
          此分析仅供工程评审参考。在进入量产前，必须通过物理样品测试验证。 
          <br />
          This analysis is for reference. Physical testing is mandatory before production.
        </p>
      </div>
    </div>
  );
}
