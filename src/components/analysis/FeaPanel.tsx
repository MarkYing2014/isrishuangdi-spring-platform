"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpringDesignStore } from "@/lib/stores/springDesignStore";
import { useFeaStore } from "@/lib/stores/feaStore";
import { useLanguage } from "@/components/language-context";
import { Loader2, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { FEAResult, FeaColorMode } from "@/lib/fea/feaTypes";
import { cn } from "@/lib/utils";

export type { FEAResult, FeaColorMode };

interface FormulaComparison {
  sigmaFormula: number;
  sigmaFea: number;
  errorPercent: number;
  status: "good" | "warning" | "error";
}

export function FeaPanel() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const springType = useSpringDesignStore((s) => s.springType);
  const geometry = useSpringDesignStore((s) => s.geometry);
  const material = useSpringDesignStore((s) => s.material);

  // FEA store state
  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);
  const isLoading = useFeaStore((s) => s.isLoading);
  const error = useFeaStore((s) => s.error);
  const setFeaResult = useFeaStore((s) => s.setFeaResult);
  const setColorMode = useFeaStore((s) => s.setColorMode);
  const setLoading = useFeaStore((s) => s.setLoading);
  const setError = useFeaStore((s) => s.setError);

  // Local state for load inputs
  const [loadValue, setLoadValue] = useState(100);
  const [leverArm, setLeverArm] = useState(20);

  const runFea = async () => {
    if (!springType || !geometry) {
      setError(isZh ? "缺少弹簧设计数据" : "Missing spring design data");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fea/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          springType,
          geometry,
          loadCase: {
            springType,
            loadValue,
            leverArm: springType === "torsion" ? leverArm : undefined,
          },
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || (isZh ? "FEA 调用失败" : "FEA call failed"));
      }

      const result = json.result as FEAResult;
      setFeaResult(result);
      // Auto-switch to FEA σ_vm mode so user immediately sees stress colors
      setColorMode("fea_sigma");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setFeaResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleColorModeChange = (mode: FeaColorMode) => {
    setColorMode(mode);
  };

  const loadUnit = springType === "torsion" ? "N" : "N";

  // Calculate engineering formula stress for comparison
  const formulaComparison = useMemo((): FormulaComparison | null => {
    if (!feaResult || !geometry || !springType) return null;

    // Simple engineering formula approximations
    let sigmaFormula = 0;
    const geom = geometry as unknown as Record<string, number>;
    const d = geom.wireDiameter || 1.6;
    const D = geom.meanDiameter || (geom.outerDiameter || 12) - d;
    const C = D / d; // Spring index

    // Wahl correction factor (with safety check for C > 1)
    const Kw = C > 1 ? (4 * C - 1) / (4 * C - 4) + 0.615 / C : 1.0;

    switch (springType) {
      case "compression":
      case "extension":
        // τ = 8 * F * D * Kw / (π * d³)
        sigmaFormula = (8 * loadValue * D * Kw) / (Math.PI * Math.pow(d, 3));
        break;
      case "torsion":
        // Torsion spring bending stress with inner stress correction factor Ki
        // σ = Ki * 32 * M / (π * d³) where M = F * leverArm
        // Ki = (4C² - C - 1) / (4C * (C - 1)) for inner fiber (simplified)
        // For typical C values, Ki ≈ 1.0 to 1.2
        const Ki = C > 1 ? (4 * C * C - C - 1) / (4 * C * (C - 1)) : 1.0;
        const M = loadValue * leverArm;
        sigmaFormula = (Ki * 32 * M) / (Math.PI * Math.pow(d, 3));
        break;
      case "conical":
        // Use large end diameter for max stress (same as Python FEA)
        const D1Conical = (geom.largeOuterDiameter || geom.outerDiameter || 20) - d;
        const C1 = D1Conical / d;
        const KwConical = C1 > 1 ? (4 * C1 - 1) / (4 * C1 - 4) + 0.615 / C1 : 1.0;
        sigmaFormula = (8 * loadValue * D1Conical * KwConical) / (Math.PI * Math.pow(d, 3));
        break;
    }

    const sigmaFea = feaResult.maxSigma;
    const errorPercent = sigmaFormula > 0 
      ? ((sigmaFea - sigmaFormula) / sigmaFormula) * 100 
      : 0;

    let status: "good" | "warning" | "error" = "good";
    if (Math.abs(errorPercent) > 20) status = "error";
    else if (Math.abs(errorPercent) > 10) status = "warning";

    return { sigmaFormula, sigmaFea, errorPercent, status };
  }, [feaResult, geometry, springType, loadValue, leverArm]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isZh ? "FEA 精确分析 (CalculiX Beam Model)" : "FEA Analysis (CalculiX Beam Model)"}
        </CardTitle>
        {material && (
          <p className="text-xs text-muted-foreground">
            {isZh ? "材料" : "Material"}: {material.name ?? "-"},{" "}
            {isZh ? "抗拉强度" : "Tensile Strength"}:{" "}
            {material.tensileStrength ?? "-"} MPa
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Load inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">
              {isZh ? `载荷大小 (${loadUnit})` : `Load Value (${loadUnit})`}
            </Label>
            <Input
              type="number"
              value={loadValue}
              onChange={(e) => setLoadValue(Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>

          {springType === "torsion" && (
            <div className="space-y-1">
              <Label className="text-xs">
                {isZh ? "杆臂长度 (mm)" : "Lever Arm (mm)"}
              </Label>
              <Input
                type="number"
                value={leverArm}
                onChange={(e) => setLeverArm(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
          )}
        </div>

        {/* Run button */}
        <Button
          onClick={runFea}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isZh ? "正在调用 CalculiX…" : "Running CalculiX…"}
            </>
          ) : (
            isZh ? "运行 FEA 精确分析" : "Run FEA Analysis"
          )}
        </Button>

        {/* Error display */}
        {error && (
          <p className="text-sm text-destructive">
            {isZh ? "FEA 出错" : "FEA Error"}: {error}
          </p>
        )}

        {/* Results display */}
        {feaResult && (
          <div className="space-y-3 pt-2 border-t">
            {/* Key results summary - 2x2 grid */}
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
              <div className="p-2 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">{isZh ? "安全系数" : "Safety Factor"}</div>
                <div className={cn(
                  "font-mono font-medium",
                  feaResult.safetyFactor != null && feaResult.safetyFactor >= 1.5 ? "text-green-500" :
                  feaResult.safetyFactor != null && feaResult.safetyFactor >= 1.0 ? "text-yellow-500" : "text-red-500"
                )}>
                  {feaResult.safetyFactor != null ? feaResult.safetyFactor.toFixed(2) : "-"}
                </div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">{isZh ? "节点数" : "Nodes"}</div>
                <div className="font-mono font-medium">
                  {feaResult.nodes.length}
                </div>
              </div>
            </div>

            {/* Formula comparison */}
            {formulaComparison && (
              <div className={cn(
                "p-2 rounded border text-xs",
                formulaComparison.status === "good" && "border-green-500/30 bg-green-500/5",
                formulaComparison.status === "warning" && "border-yellow-500/30 bg-yellow-500/5",
                formulaComparison.status === "error" && "border-red-500/30 bg-red-500/5"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  {formulaComparison.status === "good" && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {formulaComparison.status === "warning" && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                  {formulaComparison.status === "error" && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  <span className="font-medium">{isZh ? "工程公式对比" : "Formula Comparison"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <div>
                    <span>σ_formula:</span>
                    <span className="ml-1 font-mono">{formulaComparison.sigmaFormula.toFixed(1)}</span>
                  </div>
                  <div>
                    <span>σ_FEA:</span>
                    <span className="ml-1 font-mono">{formulaComparison.sigmaFea.toFixed(1)}</span>
                  </div>
                  <div>
                    <span>{isZh ? "误差" : "Error"}:</span>
                    <Badge variant="outline" className={cn(
                      "ml-1 text-xs",
                      formulaComparison.status === "good" && "text-green-500",
                      formulaComparison.status === "warning" && "text-yellow-500",
                      formulaComparison.status === "error" && "text-red-500"
                    )}>
                      {formulaComparison.errorPercent >= 0 ? "+" : ""}{formulaComparison.errorPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Color mode selector */}
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">
                {isZh ? "颜色模式" : "Color Mode"}:
              </Label>
              <Select value={colorMode} onValueChange={handleColorModeChange}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formula">
                    {isZh ? "工程公式近似" : "Engineering Formula"}
                  </SelectItem>
                  <SelectItem value="fea_sigma">FEA σ_vm</SelectItem>
                  <SelectItem value="fea_disp">
                    {isZh ? "FEA 位移" : "FEA Displacement"}
                  </SelectItem>
                  <SelectItem value="fea_sf">
                    {isZh ? "安全系数" : "Safety Factor"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color legend */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className="h-3 flex-1 rounded"
                style={{
                  background: "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
                }}
              />
              <span className="font-mono whitespace-nowrap">
                {colorMode === "fea_sigma" && `0 → ${feaResult.maxSigma.toFixed(0)} MPa`}
                {colorMode === "fea_disp" && `0 → ${feaResult.maxDisplacement.toFixed(2)} mm`}
                {colorMode === "fea_sf" && (feaResult.safetyFactor != null ? `SF: 0 → ${feaResult.safetyFactor.toFixed(1)}` : "-")}
                {colorMode === "formula" && (isZh ? "工程公式" : "Formula")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
