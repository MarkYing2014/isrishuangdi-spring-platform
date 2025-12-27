import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { DieSpringSystemAnalysis } from "@/lib/dieSpring/torsionalIntegration";
import { TorsionalAuditStageCard } from "./TorsionalAuditStageCard";
import { TorsionalAuditCurveChart } from "./TorsionalAuditCurveChart";
import { TorsionalAuditPlayController } from "./TorsionalAuditPlayController";
import { TorsionalAuditSummary } from "./TorsionalAuditSummary";

interface TorsionalAuditPanelProps {
  analysis: DieSpringSystemAnalysis;
  onPlayheadChange?: (theta: number) => void;
}

export function TorsionalAuditPanel({ analysis, onPlayheadChange }: TorsionalAuditPanelProps) {
  const [playheadTheta, setPlayheadTheta] = useState(0);
  const { systemCurve, customerDrawing, operatingRequirement, stageSafeResults } = analysis;

  const handleThetaChange = (newTheta: number | ((prev: number) => number)) => {
    if (typeof newTheta === 'function') {
      setPlayheadTheta(prev => {
        const val = newTheta(prev);
        onPlayheadChange?.(val);
        return val;
      });
    } else {
      setPlayheadTheta(newTheta);
      onPlayheadChange?.(newTheta);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 制造商免责声明 - Legal & QA Defensive Disclaimer */}
      <Alert className="bg-slate-50 border-slate-200 shadow-sm py-3">
        <Info className="h-4 w-4 text-slate-500" />
        <AlertDescription className="text-[10px] text-slate-600 leading-normal">
          <strong className="text-slate-900 uppercase">Manufacturer Audit Mode Only (仅限制造商审计模式)</strong>: 
          This system evaluates manufacturability and operating validity based on customer-provided design inputs. 
          No design substitution, optimization, or selection is performed. 
          Traceability to customer engineering documentation is the primary auditing basis.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Summary & Traceability Basis */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
            <TorsionalAuditSummary analysis={analysis} />
            
            {/* Traceability Basis Card */}
            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
              <CardHeader className="py-3 px-4 bg-slate-50/30 border-b">
                <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Traceability Basis (审计依据)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Customer Drawing</span>
                    <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        {customerDrawing?.number || "NOT_PROVIDED"}
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-xs border-t pt-2 border-slate-100">
                    <span className="text-slate-500 font-medium">Revision Level</span>
                    <span className="font-mono font-bold text-slate-700">
                        {customerDrawing?.revision || "N/A"}
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-xs border-t pt-2 border-slate-100">
                    <span className="text-slate-500 font-medium">Customer Req (θ_operating)</span>
                    <span className="font-mono font-bold text-blue-600">
                        {operatingRequirement ? `${operatingRequirement.angleDeg.toFixed(2)}°` : "NOT SPECIFIED"}
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-xs border-t pt-2 border-slate-100">
                    <span className="text-slate-500 font-medium">Data Origin Trace</span>
                    <Badge variant="outline" className="text-[9px] h-4 font-bold uppercase border-slate-200 text-slate-500">
                        {operatingRequirement?.source || "ASSUMED"}
                    </Badge>
                 </div>
                  {analysis.assumptions && analysis.assumptions.length > 0 && (
                    <div className="border-t pt-2 border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Assumptions (审计假设)</span>
                      <ul className="space-y-1">
                        {analysis.assumptions.map((asm, i) => (
                          <li key={i} className="text-[10px] text-slate-600 flex gap-1.5 items-start">
                            <span className="text-blue-500 font-bold">•</span>
                            {asm}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Individual Component Audits */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Component-Level Audit Findings</h3>
                 <span className="text-[10px] text-slate-400 font-mono">Stages: {stageSafeResults.length}</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {stageSafeResults.map((s, idx) => (
                      <TorsionalAuditStageCard 
                        key={s.stageId} 
                        stageSafe={s} 
                        stageIndex={idx + 1} 
                        currentTheta={playheadTheta}
                       />
                  ))}
               </div>
            </div>
        </div>

        {/* Right Column: Technical Explanations & Animation */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
            <TorsionalAuditCurveChart 
                systemCurve={systemCurve} 
                operatingTheta={operatingRequirement?.angleDeg}
                playheadTheta={playheadTheta}
                thetaSafeLife={systemCurve.thetaSafeSystemDeg}
                thetaPhysicalStop={systemCurve.thetaHardSystemDeg}
            />
            
            <TorsionalAuditPlayController 
                thetaSafe={systemCurve.thetaSafeSystemDeg}
                currentTheta={playheadTheta}
                onThetaChange={handleThetaChange}
            />
            
            {/* System Projection Note */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-3 shadow-sm italic">
                <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                   <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">System Modeling Projection Note</h4>
                   <p className="text-[10px] text-slate-500 leading-normal">
                     The system behavior is reconstructed by projecting angular rotation (θ) to stage linear stroke (s) via the modeling basis: 
                     <span className="font-mono text-slate-700 font-bold ml-1">s_i = θ(rad) × R_i</span>. 
                     Conclusions regarding <span className="text-slate-700 font-semibold">PASS/WARN/FAIL</span> are strictly derived from hard physical constraints (Solid Height, Slot Travel, Catalog Fatigue Limits).
                   </p>
                </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl text-white shadow-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                   <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quality Compliance Baseline</span>
                </div>
                <div className="text-xs font-medium leading-relaxed text-slate-300">
                    This automated audit facilitates compliance with <span className="text-blue-300">IATF 16949 Design Review</span> requirements. 
                    All visual projections and safety conclusions are non-speculative and traceable to the provided customer drawing number.
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
