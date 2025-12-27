import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { DieSpringSystemAnalysis } from "@/lib/dieSpring/torsionalIntegration";

interface TorsionalAuditSummaryProps {
  analysis: DieSpringSystemAnalysis;
}

export function TorsionalAuditSummary({ analysis }: TorsionalAuditSummaryProps) {
  const { systemCurve } = analysis;
  const { systemResult, thetaSafeSystemDeg, governingStageId, governing } = systemCurve;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PASS":
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-500" />,
          bgColor: "bg-green-50 border-green-200",
          textColor: "text-green-800",
          label: "PASS (通过)",
          desc: "Customer design meets manufacturability requirements (θ_operating ≤ 80% θ_safe). / 客户设计满足制造可行性要求。"
        };
      case "WARN":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
          bgColor: "bg-amber-50 border-amber-200",
          textColor: "text-amber-800",
          label: "WARN (警告)",
          desc: "Design authorized but has low safety margin. Review stack-up tolerance. /以此设计生产存在风险，建议检查公差叠加。"
        };
      case "FAIL":
        return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          bgColor: "bg-red-50 border-red-200",
          textColor: "text-red-800",
          label: "FAIL (失效)",
          desc: "Design violates hard physical limits (Solid Height / Stroke). / 设计违反物理极限（压并/行程），不可制造。"
        };
      default:
        return {
          icon: <Info className="h-6 w-6 text-blue-500" />,
          bgColor: "bg-blue-50 border-blue-200",
          textColor: "text-blue-800",
          label: "AUDIT MODE (审计模式)",
          desc: "Operating requirements not provided. Capability audit only. / 未提供工况要求，仅进行能力审计。"
        };
    }
  };

  const config = getStatusConfig(systemResult);

  return (
    <Card className={`${config.bgColor} border shadow-sm`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-full shadow-sm">
            {config.icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold ${config.textColor}`}>{config.label}</h2>
              <Badge variant="outline" className="text-[10px] h-4">OEM AUDIT</Badge>
              {systemCurve.conformsToCustomerRange && (
                <Badge className="text-[9px] h-4 bg-green-500 hover:bg-green-600 border-none">WITHIN RANGE (范围内)</Badge>
              )}
              {systemCurve.deviationRequired && (
                <Badge className="text-[9px] h-4 bg-red-500 hover:bg-red-600 border-none">DEVIATION REQ (需特批)</Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {config.desc}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/5 pt-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">System Safe Angle (θ_safe)</span>
            <span className="text-xl font-mono font-bold text-slate-900">{thetaSafeSystemDeg.toFixed(2)}°</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Governing Bottleneck (限制因素)</span>
            <div className="flex flex-col">
               <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-700">Stage {governingStageId} /</span>
                  <span className="text-[10px] font-mono text-slate-500">{governing.code}</span>
               </div>
               <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Limit: {governing.limitThetaDeg.toFixed(2)}° ({governing.limitStrokeMm.toFixed(2)} mm)
               </span>
            </div>
          </div>
        </div>
        
        {systemResult === "FAIL" && (
            <div className="mt-4 p-2 bg-white/50 rounded text-[10px] text-red-600 border border-red-100 italic">
                <strong>Critical Violation</strong>: Hard stop reached at θ = {governing.limitThetaDeg.toFixed(2)}°.
                <br/>
                <strong>严重失效</strong>: 在 {governing.limitThetaDeg.toFixed(2)}° 达到硬限位。
            </div>
        )}
        
        <div className="mt-4 text-[9px] text-slate-400 text-right">
            IATF 16949 / PPAP Aligned Audit Conclusion
        </div>
      </CardContent>
    </Card>
  );
}
