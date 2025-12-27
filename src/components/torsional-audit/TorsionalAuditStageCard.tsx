import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageSafeResult } from "@/lib/torsional/types";

interface TorsionalAuditStageCardProps {
  stageSafe: StageSafeResult;
  stageIndex: number;
  currentTheta?: number;
}

export function TorsionalAuditStageCard({ stageSafe, stageIndex, currentTheta = 0 }: TorsionalAuditStageCardProps) {
  const { hardLimitStrokeMm, thetaSafeDeg, governing, stageId } = stageSafe;

  // Calculate real-time utilization
  const currentUtilization = currentTheta > 0 
    ? Math.min(100, (currentTheta / thetaSafeDeg) * 100)
    : 0;

  const isGoverning = currentTheta >= thetaSafeDeg - 0.01;

  // Determine stage-level status based on 80% safety threshold
  let status: "PASS" | "WARN" | "FAIL" = "PASS";
  const utilizationPercent = (currentTheta / thetaSafeDeg) * 100;
  if (utilizationPercent >= 100) status = "FAIL";
  else if (utilizationPercent >= 80) status = "WARN";

  const statusColors = {
    PASS: "bg-green-100 text-green-700 border-green-200",
    WARN: "bg-amber-100 text-amber-700 border-amber-200",
    FAIL: "bg-red-100 text-red-700 border-red-200"
  };

  return (
    <Card className={`border-slate-200 hover:border-slate-300 transition-all bg-white/50 backdrop-blur-sm shadow-sm ${isGoverning ? 'ring-1 ring-red-500/20 bg-red-50/10' : ''}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full ${isGoverning ? 'bg-red-600' : 'bg-slate-900'} text-[10px] text-white flex items-center justify-center font-bold transition-colors`}>
              {stageIndex}
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight leading-none">Stage {stageId}</span>
                <Badge variant="outline" className={`mt-1 text-[8px] h-3.5 py-0 px-1 font-bold ${statusColors[status]}`}>
                    {status}
                </Badge>
            </div>
          </div>
          <Badge variant="secondary" className={`text-[9px] h-4 font-mono uppercase border-none transition-colors ${isGoverning ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
            {governing.code}
          </Badge>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-1 mb-3">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                <span className="text-slate-400">Utilization</span>
                <span className={currentUtilization >= 100 ? 'text-red-600' : currentUtilization >= 80 ? 'text-amber-500' : 'text-slate-500'}>
                    {currentUtilization.toFixed(1)}%
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-300 ${currentUtilization >= 100 ? 'bg-red-500' : currentUtilization >= 80 ? 'bg-amber-400' : 'bg-blue-500'}`}
                    style={{ width: `${currentUtilization}%` }}
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-2 border-slate-100">
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-400 block uppercase font-medium">θ_limit_stage</span>
            <span className="text-xs font-mono font-semibold text-blue-600">{thetaSafeDeg.toFixed(2)}°</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-400 block uppercase font-medium">Stroke at Limit</span>
            <span className="text-xs font-mono font-semibold text-slate-700">{hardLimitStrokeMm.toFixed(2)} mm</span>
          </div>
        </div>
        
        <div className="mt-2 p-1.5 rounded bg-slate-50/50 text-[8px] text-slate-500 border border-slate-100/50 italic leading-tight">
            <strong>Audit Ref</strong>: {
                governing.code === 'SOLID_HEIGHT' ? 'Structural solid height constraint reached.' :
                governing.code === 'SLOT_TRAVEL' ? 'Slot travel geometry reached.' :
                governing.code === 'LIFE_LIMIT' ? 'Fatigue life threshold reached.' : 
                'Maximum catalog stroke reached.'
            }
        </div>
      </CardContent>
    </Card>
  );
}
