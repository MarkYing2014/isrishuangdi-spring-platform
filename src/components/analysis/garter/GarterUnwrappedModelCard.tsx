"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GarterAnalysisBundle } from "@/lib/analysis/garter/types";

export function GarterUnwrappedModelCard({ bundle }: { bundle: GarterAnalysisBundle }) {
  const a = bundle.analytical;

  const n = (v: number, digits = 2) => Number(v.toFixed(digits)).toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Analysis / 快速分析 (Equivalent Model)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Ring circumference change maps to linear extension: ΔL = π·ΔD
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <Row label="ΔD (installed - free) / 安装直径差" value={`${n(a.deltaD_signed)} mm`} />
          <Row label="ΔL = π·|ΔD| / 等效展开位移" value={`${n(a.deltaL)} mm`} />
          <Row label="k_ax / 等效轴向刚度" value={`${n(a.k_ax)} N/mm`} />
          <Row label="Ft (effective) / 等效拉力" value={`${n(a.forceEffective)} N`} />
          <Row label="τ_max / 最大剪应力" value={`${n(a.maxShearStress)} MPa`} />
          <Row label="C = Dm/d / 旋绕比" value={`${n(a.springIndex)} `} />
          <Row label="Kw / Wahl 系数" value={`${n(a.wahlFactor, 3)} `} />
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5">
          <div className="font-medium">Model Notes / 模型说明</div>
          <ul className="list-disc pl-4">
            <li>Analytical is the primary model for design iteration.</li>
            <li>FEA is used for verification & joint sensitivity.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
