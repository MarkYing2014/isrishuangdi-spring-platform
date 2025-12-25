import React from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2,
  HardHat
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ManufacturingAudit, ManufacturingAuditItem } from "@/lib/manufacturing/workOrderTypes";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";

interface ManufacturingAuditCardProps {
  audit: ManufacturingAudit;
  className?: string;
}

export function ManufacturingAuditCard({ audit, className }: ManufacturingAuditCardProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  const statusColor = 
    audit.overallStatus === "FAIL" ? "text-red-600 bg-red-50 border-red-200" :
    audit.overallStatus === "WARNING" ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-emerald-600 bg-emerald-50 border-emerald-200";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("pb-4 border-b", statusColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            <CardTitle className="text-lg">
              {isZh ? "制造可行性审计" : "Manufacturing Audit"}
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn("bg-white", statusColor)}>
             {audit.overallStatus}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 divide-y divide-slate-100">
        <AuditRow 
          label={isZh ? "端面磨削" : "End Grinding"} 
          item={audit.endGrinding} 
        />
        <AuditRow 
          label={isZh ? "并圈风险" : "Coil Bind Risk"} 
          item={audit.coilBind} 
        />
        <AuditRow 
          label={isZh ? "屈曲风险" : "Buckling Risk"} 
          item={audit.buckling} 
        />
        <AuditRow 
          label={isZh ? "热处理" : "Heat Treatment"} 
          item={audit.heatTreatment} 
        />
        <AuditRow 
          label={isZh ? "喷丸强化" : "Shot Peening"} 
          item={audit.shotPeening} 
        />
        <AuditRow 
          label={isZh ? "表面涂层" : "Surface Coating"} 
          item={audit.coating} 
        />

        {audit.blockingIssues.length > 0 && (
          <div className="p-4 bg-red-50 text-red-700 text-sm">
            <div className="font-bold flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4" />
              {isZh ? "阻断性问题" : "Blocking Issues"}
            </div>
            <ul className="list-disc list-inside space-y-1 ml-1">
              {audit.blockingIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditRow({ label, item }: { label: string; item: ManufacturingAuditItem }) {
  // If not required and passes, checking strictly irrelevant items might clutter UI, 
  // but "Not Required" implies skipped/n/a which is effectively a pass or neutral.
  // We'll show all but fade out irrelevant ones.
  
  const isRelevant = item.required || item.status !== "PASS";
  
  const icon = 
    item.status === "FAIL" ? <XCircle className="w-4 h-4 text-red-500" /> :
    item.status === "WARNING" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
    <CheckCircle2 className="w-4 h-4 text-emerald-500" />;

  return (
    <div className={cn(
      "flex items-center justify-between p-4 text-sm",
      !isRelevant && "opacity-50 grayscale"
    )}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-slate-700">{label}</span>
      </div>
      
      <div className="text-right">
        {item.reason ? (
          <span className={cn(
            "text-xs font-semibold",
             item.status === "FAIL" ? "text-red-600" : "text-amber-600"
          )}>
            {item.reason}
          </span>
        ) : (
          <span className="text-xs text-slate-500">{item.notes || (item.required ? "Required" : "N/A")}</span>
        )}
      </div>
    </div>
  );
}
