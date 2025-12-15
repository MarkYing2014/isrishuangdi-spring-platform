"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

import { useFeaStore } from "@/lib/stores/feaStore";
import type { FeaColorMode } from "@/lib/fea/feaTypes";
import type { SpiralTorsionGeometry } from "@/lib/stores/springDesignStore";
import { FeaColorLegend } from "@/components/analysis/FeaColorLegend";

type SpiralFeaLoadType = "torque" | "angle";

export function SpiralFeaPanel(props: {
  isZh: boolean;
  geometry: SpiralTorsionGeometry;
  springRate_NmmPerDeg: number;
  preloadTorque_Nmm: number;
  suggestedTorque_Nmm: number;
  suggestedAngle_deg: number;
  allowableStress_MPa?: number;
}) {
  const {
    isZh,
    geometry,
    springRate_NmmPerDeg,
    preloadTorque_Nmm,
    suggestedTorque_Nmm,
    suggestedAngle_deg,
    allowableStress_MPa,
  } = props;

  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);
  const isLoading = useFeaStore((s) => s.isLoading);
  const error = useFeaStore((s) => s.error);
  const setFeaResult = useFeaStore((s) => s.setFeaResult);
  const setColorMode = useFeaStore((s) => s.setColorMode);
  const setLoading = useFeaStore((s) => s.setLoading);
  const setError = useFeaStore((s) => s.setError);

  const [loadType, setLoadType] = useState<SpiralFeaLoadType>("torque");
  const [torque_Nmm, setTorque_Nmm] = useState<number>(Math.max(0, suggestedTorque_Nmm));
  const [angle_deg, setAngle_deg] = useState<number>(Math.max(0, suggestedAngle_deg));

  const torqueFromAngle_Nmm = useMemo(() => {
    const theta = isFinite(angle_deg) ? angle_deg : 0;
    const k = isFinite(springRate_NmmPerDeg) ? springRate_NmmPerDeg : 0;
    const T0 = isFinite(preloadTorque_Nmm) ? preloadTorque_Nmm : 0;
    return T0 + k * theta;
  }, [angle_deg, springRate_NmmPerDeg, preloadTorque_Nmm]);

  const effectiveTorque_Nmm = loadType === "torque" ? torque_Nmm : torqueFromAngle_Nmm;

  const runFea = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        springType: "spiralTorsion",
        geometry: {
          innerDiameter: geometry.innerDiameter,
          outerDiameter: geometry.outerDiameter,
          activeCoils: geometry.activeCoils,
          turns: geometry.activeCoils,
          stripWidth: geometry.stripWidth,
          stripThickness: geometry.stripThickness,
          windingDirection: geometry.windingDirection ?? "cw",
          handedness: geometry.windingDirection ?? "cw",
        },
        loadCase: {
          springType: "spiralTorsion",
          loadValue: effectiveTorque_Nmm,
          angleDeg: loadType === "angle" ? angle_deg : undefined,
        },
        allowableStress: allowableStress_MPa,
      } as const;

      const res = await fetch("/api/fea/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || (isZh ? "FEA 调用失败" : "FEA call failed"));
      }

      setFeaResult(json.result);
      setColorMode("fea_disp");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setFeaResult(null);
    } finally {
      setLoading(false);
    }
  };

  const effectiveTorqueText = useMemo(() => {
    return isFinite(effectiveTorque_Nmm) ? effectiveTorque_Nmm.toFixed(1) : "-";
  }, [effectiveTorque_Nmm]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{isZh ? "FEA 精确分析 (Beam v0)" : "FEA Analysis (Beam v0)"}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {isZh
            ? "v0：中心线梁 + 矩形截面 b×t；不考虑接触/塑性/残余应力。Angle 模式先换算为 Torque。"
            : "v0: centerline beam + rectangular section b×t; no contact/plasticity/residual stress. Angle is converted to Torque first."}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{isZh ? "载荷类型" : "Load Type"}</Label>
            <Select value={loadType} onValueChange={(v) => setLoadType(v as SpiralFeaLoadType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="torque">{isZh ? "扭矩 T (N·mm)" : "Torque T (N·mm)"}</SelectItem>
                <SelectItem value="angle">{isZh ? "角度 θ (deg)" : "Angle θ (deg)"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isZh ? "建议值" : "Suggested"}</Label>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full"
              onClick={() => {
                setTorque_Nmm(suggestedTorque_Nmm);
                setAngle_deg(suggestedAngle_deg);
              }}
            >
              {isZh ? "填充 θmax/Tmax" : "Use θmax/Tmax"}
            </Button>
          </div>
        </div>

        {loadType === "torque" ? (
          <div className="space-y-1">
            <Label className="text-xs">{isZh ? "扭矩 T (N·mm)" : "Torque T (N·mm)"}</Label>
            <Input
              type="number"
              value={torque_Nmm}
              onChange={(e) => setTorque_Nmm(Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{isZh ? "角度 θ (deg)" : "Angle θ (deg)"}</Label>
              <Input
                type="number"
                value={angle_deg}
                onChange={(e) => setAngle_deg(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isZh ? "换算扭矩 T" : "Converted T"}</Label>
              <div className="h-8 flex items-center rounded-md border px-3 text-sm bg-muted/40">
                <span className="font-mono">{torqueFromAngle_Nmm.toFixed(1)}</span>
                <span className="ml-1 text-xs text-muted-foreground">N·mm</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">
            {isZh ? "提交扭矩" : "Submitted Torque"}: <span className="font-mono text-foreground">{effectiveTorqueText}</span> N·mm
          </div>
          {feaResult?.safetyFactor != null && (
            <Badge variant="outline">
              SF {feaResult.safetyFactor.toFixed(2)}
            </Badge>
          )}
        </div>

        <Button onClick={runFea} disabled={isLoading} className="w-full" size="sm">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isZh ? "正在调用 CalculiX…" : "Running CalculiX…"}
            </>
          ) : (
            isZh ? "运行 FEA" : "Run FEA"
          )}
        </Button>

        {error && <p className="text-sm text-destructive">{isZh ? "FEA 出错" : "FEA Error"}: {error}</p>}

        {feaResult && (
          <div className="grid gap-3 md:grid-cols-[1fr,auto] items-start border-t pt-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">σ_vm,max</div>
                <div className="font-mono font-medium text-red-500">
                  {feaResult.maxSigma.toFixed(1)} <span className="text-xs text-muted-foreground">MPa</span>
                </div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">u_max</div>
                <div className="font-mono font-medium text-blue-500">
                  {feaResult.maxDisplacement.toFixed(3)} <span className="text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">{isZh ? "颜色模式" : "Color Mode"}:</Label>
                  <Select value={colorMode} onValueChange={(v) => setColorMode(v as FeaColorMode)}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formula">{isZh ? "工程公式近似" : "Engineering Formula"}</SelectItem>
                      <SelectItem value="fea_sigma">FEA σ_vm</SelectItem>
                      <SelectItem value="fea_disp">{isZh ? "FEA 位移" : "FEA Displacement"}</SelectItem>
                      <SelectItem value="fea_sf">{isZh ? "安全系数" : "Safety Factor"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <FeaColorLegend allowableStress={allowableStress_MPa} className="justify-self-end" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
