import React from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight,
  Factory,
  Clock,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ManufacturingPlan } from "@/lib/manufacturing/workOrderTypes";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";

interface ManufacturingPlanCardProps {
  plan: ManufacturingPlan;
  className?: string;
}

export function ManufacturingPlanCard({ plan, className }: ManufacturingPlanCardProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-slate-50/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">
              {isZh ? "制造工艺路线" : "Manufacturing Plan"}
            </CardTitle>
          </div>
          <Badge variant="outline" className="font-mono">
             {plan.totalEstimatedTime} min
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <span className="font-semibold">{isZh ? "材料规格：" : "Material Spec:"}</span>
          <span>{plan.wireSpec.material} ({plan.wireSpec.standard})</span>
          <span>Ø{plan.wireSpec.diameter.toFixed(3)}mm</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          {/* Vertical connection line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200" />
          
          <ScrollArea className="h-[400px]">
            <div className="p-6 space-y-6">
              {plan.processRoute.map((process, idx) => (
                <div key={process.processId} className="relative flex gap-4">
                  {/* Step Number Bubble */}
                  <div className={cn(
                    "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold shadow-sm transition-colors",
                    "bg-white border-slate-200 text-slate-500"
                  )}>
                    {idx + 1}
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-1 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 uppercase tracking-wide">
                          {process.type.replace("-", " ")}
                        </span>
                        {process.required ? (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">REQ</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-400 px-1 py-0 h-4 border-dashed">OPT</Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {process.estimatedDuration}m
                      </span>
                    </div>
                    
                    {process.notes && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                        {process.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Machine Requirements Footer */}
        {plan.machineRequirements && plan.machineRequirements.length > 0 && (
          <div className="bg-slate-900 text-slate-300 p-4 text-xs border-t">
            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-100">
              <Settings className="w-3 h-3" />
              {isZh ? "设备需求" : "Machine Requirements"}
            </div>
            <div className="flex flex-wrap gap-2">
              {plan.machineRequirements.map((machine, i) => (
                <Badge key={i} variant="outline" className="border-slate-700 bg-slate-800 text-slate-400">
                  {machine}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
