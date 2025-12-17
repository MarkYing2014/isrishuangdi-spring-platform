"use client";

import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { DesignRuleFinding, DesignRuleReport } from "@/lib/designRules/types";

interface DesignRulePanelProps {
  report: DesignRuleReport | null | undefined;
  title?: string;
  headerRight?: React.ReactNode;
  subheader?: React.ReactNode;
  className?: string;
  onFindingClick?: (finding: DesignRuleFinding) => void;
}

function StatusBadge({ status }: { status: DesignRuleReport["summary"]["status"] }) {
  if (status === "OK") return <Badge className="bg-emerald-600 text-white">OK</Badge>;
  if (status === "WARN") return <Badge className="bg-amber-500 text-white">Warn</Badge>;
  return <Badge variant="destructive">Fail</Badge>;
}

export function DesignRulePanel({ report, title = "Design Rules / 设计规则", headerRight, subheader, className, onFindingClick }: DesignRulePanelProps) {
  if (!report) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="outline" className="text-muted-foreground">N/A</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No data / 暂无数据</CardContent>
      </Card>
    );
  }

  const findings = report.findings ?? [];
  const metrics = report.metrics ?? {};

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            {headerRight}
            <StatusBadge status={report.summary.status} />
          </div>
        </CardTitle>
        {subheader && <div className="mt-2">{subheader}</div>}
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(metrics).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(metrics).map(([key, m]) => (
              <div key={key} className="rounded-md border bg-slate-50 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">
                  <div>{m.labelEn ?? key}</div>
                  {m.labelZh && <div>{m.labelZh}</div>}
                </div>
                <div className="mt-1 font-medium">
                  {m.value}{m.unit ? ` ${m.unit}` : ""}
                </div>
                {(m.noteEn || m.noteZh) && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {m.noteEn && <div>{m.noteEn}</div>}
                    {m.noteZh && <div>{m.noteZh}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {findings.length === 0 ? (
          <div className="text-sm text-emerald-700">✓ No findings. / 无发现项。</div>
        ) : (
          <div className="space-y-2">
            {findings.map((f) => {
              const color =
                f.level === "error" ? "text-red-700" : f.level === "warning" ? "text-amber-700" : "text-slate-700";
              const icon = f.level === "error" ? "✗" : f.level === "warning" ? "⚠" : "i";

              return (
                <details key={f.id} className="rounded-md border bg-white px-3 py-2">
                  <summary className={cn("cursor-pointer select-none text-sm font-medium", color)}>
                    {icon} {f.titleEn} / {f.titleZh}
                  </summary>
                  {(f.detailEn || f.detailZh) && (
                    <div className="mt-2 text-sm text-muted-foreground space-y-1">
                      {f.detailEn && <div>{f.detailEn}</div>}
                      {f.detailZh && <div>{f.detailZh}</div>}
                    </div>
                  )}
                  {(f.suggestionEn || f.suggestionZh) && (
                    <div className="mt-2 text-sm">
                      <div className="text-muted-foreground">Suggestion / 建议</div>
                      {f.suggestionEn && <div>{f.suggestionEn}</div>}
                      {f.suggestionZh && <div>{f.suggestionZh}</div>}
                    </div>
                  )}

                  {onFindingClick && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="text-xs text-blue-600 underline-offset-2 hover:underline"
                        onClick={() => onFindingClick(f)}
                      >
                        Jump / 定位
                      </button>
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
