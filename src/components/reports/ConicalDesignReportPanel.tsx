"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConicalDesignReportData } from "@/lib/reports/conicalReport";

interface ConicalDesignReportPanelProps {
  data: ConicalDesignReportData;
}

export function ConicalDesignReportPanel({ data }: ConicalDesignReportPanelProps) {
  const formatNumber = (value: number, decimals = 2) => 
    Number(value.toFixed(decimals)).toLocaleString();

  return (
    <div className="space-y-4">
      {/* Design Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Design Summary / 设计概要</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Large Diameter D₁</p>
              <p className="font-medium">{formatNumber(data.largeDiameter)} mm</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Small Diameter D₂</p>
              <p className="font-medium">{formatNumber(data.smallDiameter)} mm</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Wire Diameter d</p>
              <p className="font-medium">{formatNumber(data.wireDiameter)} mm</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Active Coils Na</p>
              <p className="font-medium">{data.activeCoils}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Free Length L₀</p>
              <p className="font-medium">{formatNumber(data.freeLength)} mm</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Solid Height H_solid</p>
              <p className="font-medium">{formatNumber(data.solidHeight)} mm</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Max Travel X_total</p>
              <p className="font-medium">{formatNumber(data.totalDeflectionCapacity)} mm</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Shear Modulus G</p>
              <p className="font-medium">{formatNumber(data.shearModulus, 0)} MPa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Results */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-green-800">Final Results / 最终结果</CardTitle>
          <p className="text-xs text-green-600">At max deflection Δx = {formatNumber(data.maxDeflection)} mm</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-green-700 text-xs">Final Load F</p>
              <p className="font-bold text-green-900 text-lg">{formatNumber(data.finalLoad)} N</p>
            </div>
            <div>
              <p className="text-green-700 text-xs">Final Stiffness k</p>
              <p className="font-bold text-green-900 text-lg">{formatNumber(data.finalStiffness)} N/mm</p>
            </div>
            <div>
              <p className="text-green-700 text-xs">Shear Stress τ</p>
              <p className="font-bold text-green-900 text-lg">{formatNumber(data.finalShearStress)} MPa</p>
            </div>
            <div>
              <p className="text-green-700 text-xs">Active Coils</p>
              <p className="font-semibold text-green-900">{data.finalActiveCoils}</p>
            </div>
            <div>
              <p className="text-green-700 text-xs">Collapsed Coils</p>
              <p className="font-semibold text-green-900">{data.finalCollapsedCoils}</p>
            </div>
            {data.safetyFactor && (
              <div>
                <p className="text-green-700 text-xs">Safety Factor SF</p>
                <p className={`font-bold text-lg ${data.safetyFactor >= 1.5 ? "text-green-900" : "text-amber-600"}`}>
                  {formatNumber(data.safetyFactor)}
                </p>
              </div>
            )}
          </div>

          {data.exceededSolidHeight && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
              ⚠️ Note: Requested deflection exceeded available travel. Results clamped to solid height.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coil Collapse Stages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Coil Collapse Stages / 圈贴底阶段</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.stages.map((stage) => (
              <div 
                key={stage.stage} 
                className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">Stage {stage.stage}</span>
                  <span className="ml-2 text-muted-foreground">
                    {stage.stage === 0 
                      ? "Initial state" 
                      : `${stage.collapsedCoils} coil(s) collapsed`
                    }
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-muted-foreground">from Δx ≈ </span>
                  <span className="font-medium">{formatNumber(stage.startDeflection)} mm</span>
                  <span className="mx-2 text-muted-foreground">|</span>
                  <span className="text-muted-foreground">Na = </span>
                  <span className="font-medium">{stage.activeCoils}</span>
                  <span className="mx-2 text-muted-foreground">|</span>
                  <span className="text-muted-foreground">k = </span>
                  <span className="font-medium">{formatNumber(stage.stiffness)} N/mm</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nonlinear Curve Key Points */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Nonlinear Curve Key Points / 非线性曲线关键点</CardTitle>
          <p className="text-xs text-muted-foreground">Sampled at 0%, 25%, 50%, 75%, 100% of deflection range</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Point</th>
                  <th className="px-3 py-2 font-medium">Deflection Δx (mm)</th>
                  <th className="px-3 py-2 font-medium">Load F (N)</th>
                  <th className="px-3 py-2 font-medium">Stiffness k (N/mm)</th>
                  <th className="px-3 py-2 font-medium">Active Coils</th>
                </tr>
              </thead>
              <tbody>
                {data.curveKeyPoints.map((point, idx) => {
                  const pctLabels = ["0%", "25%", "50%", "75%", "100%"];
                  const isLast = idx === data.curveKeyPoints.length - 1;
                  return (
                    <tr 
                      key={idx} 
                      className={`border-t ${isLast ? "bg-green-50 font-semibold" : ""}`}
                    >
                      <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                        {pctLabels[idx]}
                      </td>
                      <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                        {formatNumber(point.deflection)}
                      </td>
                      <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                        {formatNumber(point.load)}
                      </td>
                      <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                        {formatNumber(point.k)}
                      </td>
                      <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                        {point.activeCoils}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Report Metadata */}
      <div className="text-xs text-muted-foreground text-center">
        Report generated: {new Date(data.generatedAt).toLocaleString()}
        {data.designId && <span className="ml-2">| Design ID: {data.designId}</span>}
      </div>
    </div>
  );
}
