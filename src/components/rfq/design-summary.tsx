
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EngineeringSummary } from "@/lib/rfq/types";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { LanguageText } from "@/components/language-context";

interface DesignSummaryCardProps {
    summary: EngineeringSummary;
}

export function DesignSummaryCard({ summary }: DesignSummaryCardProps) {
    const isArc = summary.springType === "arc";
    
    return (
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        <LanguageText en="Engineering Design Summary" zh="工程设计摘要" />
                    </span>
                    <Badge variant="outline" className="font-mono text-xs bg-white">
                        {summary.designHash.substring(0, 8)}
                    </Badge>
                </CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                    <LanguageText 
                        en="This definition is validated and locked. Any changes require a new design iteration." 
                        zh="此定义已经过验证并锁定。任何更改都需要新的设计迭代。" 
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* 1. Basic Params */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b text-sm">
                    <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                            <LanguageText en="Material" zh="材料" />
                        </div>
                        <div className="font-medium">{summary.material}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                            <LanguageText en="Max Load" zh="最大负载" />
                        </div>
                        <div className="font-medium">{summary.performance.maxLoad.toFixed(1)} N·m</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                            <LanguageText en="Stress Util." zh="应力利用率" />
                        </div>
                        <div className={`font-medium ${summary.performance.utilization > 90 ? "text-amber-600" : "text-emerald-600"}`}>
                            {summary.performance.utilization.toFixed(1)}%
                        </div>
                    </div>
                     <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                            <LanguageText en="Fatigue" zh="疲劳寿命" />
                        </div>
                        <div className="font-medium capitalize">{summary.performance.fatigueStatus.replace("_", " ")}</div>
                    </div>
                </div>

                {/* 2. Review Issues */}
                {summary.reviewIssues.length > 0 && (
                     <div className="bg-amber-50 p-4 border-b border-amber-100">
                        <div className="text-xs font-bold text-amber-800 mb-2 uppercase flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <LanguageText en="Engineering Notes & Risks" zh="工程说明与风险" />
                        </div>
                        <ul className="text-sm text-amber-900 space-y-1 pl-4 list-disc">
                            {summary.reviewIssues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                            ))}
                        </ul>
                     </div>
                )}

                {/* 3. Arc Pack Groups (if applicable) */}
                {isArc && summary.packGroups && summary.packGroups.length > 0 && (
                    <div className="p-4 bg-white">
                         <div className="text-xs font-bold text-slate-500 mb-2 uppercase">
                            <LanguageText en="Pack Group Definition" zh="弹簧组定义" />
                         </div>
                         <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="p-2 font-medium"><LanguageText en="Group" zh="组别" /></th>
                                        <th className="p-2 font-medium"><LanguageText en="Count" zh="数量" /></th>
                                        <th className="p-2 font-medium"><LanguageText en="Stage 1 (k1)" zh="刚度 1 (k1)" /></th>
                                        <th className="p-2 font-medium"><LanguageText en="Stage 2 (k2)" zh="刚度 2 (k2)" /></th>
                                        <th className="p-2 font-medium"><LanguageText en="Stage 3 (k3)" zh="刚度 3 (k3)" /></th>
                                        <th className="p-2 font-medium"><LanguageText en="Break Angles (°)" zh="转折角 (°)" /></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {summary.packGroups.map((g, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2 font-medium">{g.name || `G${idx+1}`}</td>
                                            <td className="p-2 font-mono">{g.count}</td>
                                            <td className="p-2 font-mono">{g.kStages[0]?.toFixed(1) ?? "-"}</td>
                                            <td className="p-2 font-mono">{g.kStages[1]?.toFixed(1) ?? "-"}</td>
                                            <td className="p-2 font-mono">{g.kStages[2]?.toFixed(1) ?? "-"}</td>
                                            <td className="p-2 font-mono text-slate-500">
                                                {g.phiBreaksDeg?.map((b: number) => b.toFixed(1)).join(" / ")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
