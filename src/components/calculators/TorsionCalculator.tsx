"use client";

/**
 * Torsion Spring Calculator
 * 扭转弹簧计算器
 * 
 * Engineering formulas:
 * - Spring rate: k = E·d⁴ / (64·Dm·Na) [N·mm/°] (converted from rad)
 * - Torque: M = k·θ [N·mm]
 * - Bending stress: σ = 32·M / (π·d³) [MPa]
 * - Stress correction factor: Ki = (4C² - C - 1) / (4C(C - 1)) (inner fiber)
 */

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DimensionHint } from "./DimensionHint";
import { MaterialSelector } from "./MaterialSelector";
import { 
  type SpringMaterialId, 
  type SpringMaterial,
  getSpringMaterial 
} from "@/lib/materials/springMaterials";

interface FormValues {
  wireDiameter: number;        // d - 线径
  outerDiameter: number;       // Do - 外径
  totalCoils: number;          // N - 总圈数
  activeCoils: number;         // Na - 有效圈数
  armLength1: number;          // a1 - 臂长1
  armLength2: number;          // a2 - 臂长2
  loadRadius: number;          // R - 负载作用半径
  bodyLength: number;          // Lmo - 簧体长度
  installAngle: number;        // θdi - 装置扭转角度
  workingAngle: number;        // θdo - 作用扭转角度
  pitch: number;               // p - 节距
  handOfCoil: "right" | "left";
}

interface TorsionResults {
  // Geometry
  innerDiameter: number;       // Di - 内径 mm
  meanDiameter: number;        // Dm - 平均直径 mm
  springIndex: number;         // C = Dm/d
  activeCoils: number;         // Na - 有效圈数
  rotatedLength: number;       // L - 旋转后总长度 mm
  rotatedInnerDiameter: number; // Ds - 旋转后内径 mm
  // Material
  elasticModulus: number;      // E - 弹性模量 MPa
  shearModulus: number;        // G - 剪切模量 kg/mm²
  maxAllowableStress: number;  // Smax - 最大许用应力 Pa
  // Rate & Torque
  springRate: number;          // k - N·mm/° 
  springRateGmm: number;       // K - g·mm/deg
  installTorque: number;       // M1 - 安装扭矩 N·mm
  workingTorque: number;       // M2 - 工作扭矩 N·mm
  installTorqueGmm: number;    // M1 - g·mm
  workingTorqueGmm: number;    // M2 - g·mm
  installForce: number;        // P1 - 安装力 N
  workingForce: number;        // P2 - 工作力 N
  installForceG: number;       // P1 - g
  workingForceG: number;       // P2 - g
  // Stress
  installStress: number;       // S1 - 安装应力 kg/mm²
  workingStress: number;       // S2 - 工作应力 kg/mm²
  bendingStress: number;       // σ - MPa
  correctedStress: number;     // σ_corrected - MPa with Ki factor
  stressCorrectionFactor: number; // Ki
  // Safety & Weight
  safetyFactor: number;        // n
  safetyFactorPercent: number; // SF %
  springWeight: number;        // M - 弹簧重量 g
  isValid: boolean;
  warnings: string[];
}

/**
 * Calculate torsion spring properties
 * 
 * @param wireDiameter d - 线径 (mm)
 * @param outerDiameter Do - 外径 (mm)
 * @param activeCoils Na - 有效圈数
 * @param installAngle θdi - 装置扭转角度 A1 (°)
 * @param workingAngle θdo - 作用扭转角度 A2 (°)
 * @param loadRadius R - 负载作用半径 (mm)
 * @param armLength1 X1 - 固定侧力臂长 (mm)
 * @param armLength2 X2 - 施力侧力臂长 (mm)
 * @param bodyLength Lmo - 簧体长度 (mm)
 * @param material - 材料
 */
function calculateTorsionSpring(
  wireDiameter: number,
  outerDiameter: number,
  activeCoils: number,
  installAngle: number,
  workingAngle: number,
  loadRadius: number,
  armLength1: number,
  armLength2: number,
  bodyLength: number,
  material: SpringMaterial
): TorsionResults {
  const warnings: string[] = [];
  
  // Calculate diameters
  const innerDiameter = outerDiameter - 2 * wireDiameter; // Di = Do - 2d
  const meanDiameter = outerDiameter - wireDiameter; // Dm = Do - d
  
  // Spring index C = Dm / d
  const springIndex = meanDiameter / wireDiameter;
  
  // Validate spring index (typical range 4-12 for torsion springs)
  if (springIndex < 3) {
    warnings.push("弹簧指数过低 (C < 3)，制造困难");
  } else if (springIndex > 15) {
    warnings.push("弹簧指数过高 (C > 15)，弹簧可能不稳定");
  }
  
  // Material properties
  const elasticModulus = material.elasticModulus ?? material.shearModulus * 2.5;
  const shearModulusKg = material.shearModulus / 9.80665; // MPa to kg/mm² (1 MPa ≈ 0.102 kg/mm²)
  const maxAllowableStress = material.allowShearStatic * 1e6; // MPa to Pa
  
  // Spring rate in N·mm/rad: k = E·d⁴ / (64·Dm·Na)
  const springRateRad = (elasticModulus * Math.pow(wireDiameter, 4)) / 
                        (64 * meanDiameter * activeCoils);
  
  // Convert to N·mm/° (multiply by π/180)
  const springRate = springRateRad * (Math.PI / 180);
  
  // Convert to g·mm/deg (1 N = 101.97 g)
  const springRateGmm = springRate * 101.97;
  
  // Total angles
  const totalAngle = installAngle + workingAngle;
  
  // Torques
  const installTorque = springRate * installAngle; // N·mm
  const workingTorque = springRate * totalAngle;   // N·mm
  const installTorqueGmm = installTorque * 101.97; // g·mm
  const workingTorqueGmm = workingTorque * 101.97; // g·mm
  
  // Forces at load radius: P = M / R
  const installForce = loadRadius > 0 ? installTorque / loadRadius : 0; // N
  const workingForce = loadRadius > 0 ? workingTorque / loadRadius : 0; // N
  const installForceG = installForce * 101.97; // g
  const workingForceG = workingForce * 101.97; // g
  
  // Bending stress σ = 32·M / (π·d³)
  const installBendingStress = (32 * installTorque) / (Math.PI * Math.pow(wireDiameter, 3)); // MPa
  const workingBendingStress = (32 * workingTorque) / (Math.PI * Math.pow(wireDiameter, 3)); // MPa
  
  // Convert to kg/mm² (1 MPa = 0.10197 kg/mm²)
  const installStress = installBendingStress * 0.10197;
  const workingStress = workingBendingStress * 0.10197;
  
  // Stress correction factor Ki for inner fiber (Wahl factor for torsion)
  // Ki = (4C² - C - 1) / (4C(C - 1))
  const stressCorrectionFactor = (4 * springIndex * springIndex - springIndex - 1) / 
                                  (4 * springIndex * (springIndex - 1));
  
  // Corrected stress
  const correctedStress = workingBendingStress * stressCorrectionFactor;
  
  // Allowable stress for torsion (bending)
  const allowableStress = material.allowShearStatic * 1.25;
  
  // Safety factor
  const safetyFactor = allowableStress / correctedStress;
  const safetyFactorPercent = safetyFactor * 100;
  
  // Rotated inner diameter: Ds = Di - (θ/360) * d * Na / Na_original
  // When spring is wound tighter, inner diameter decreases
  const rotatedInnerDiameter = innerDiameter - (totalAngle / 360) * wireDiameter * 0.1;
  
  // Rotated length: L = Lmo + additional coil compression
  const rotatedLength = bodyLength + (totalAngle / 360) * wireDiameter * 0.5;
  
  // Spring weight: M = ρ × V = ρ × π × (d/2)² × L_wire
  // L_wire = π × Dm × Na + X1 + X2
  const density = material.density ?? 7850; // kg/m³
  const wireLength = Math.PI * meanDiameter * activeCoils + armLength1 + armLength2; // mm
  const wireVolume = Math.PI * Math.pow(wireDiameter / 2, 2) * wireLength; // mm³
  const springWeight = (density / 1e6) * wireVolume; // g (density in kg/m³, volume in mm³)
  
  // Validation
  if (safetyFactor < 1.0) {
    warnings.push("安全系数 < 1.0，应力超过许用值");
  } else if (safetyFactor < 1.2) {
    warnings.push("安全系数较低 (< 1.2)，建议减小变形量");
  }
  
  if (totalAngle > 360) {
    warnings.push("总扭转角 > 360°，可能需要多圈");
  }
  
  return {
    // Geometry
    innerDiameter,
    meanDiameter,
    springIndex,
    activeCoils,
    rotatedLength,
    rotatedInnerDiameter,
    // Material
    elasticModulus,
    shearModulus: shearModulusKg,
    maxAllowableStress,
    // Rate & Torque
    springRate,
    springRateGmm,
    installTorque,
    workingTorque,
    installTorqueGmm,
    workingTorqueGmm,
    installForce,
    workingForce,
    installForceG,
    workingForceG,
    // Stress
    installStress,
    workingStress,
    bendingStress: workingBendingStress,
    correctedStress,
    stressCorrectionFactor,
    // Safety & Weight
    safetyFactor,
    safetyFactorPercent,
    springWeight,
    isValid: safetyFactor >= 1.0,
    warnings,
  };
}

export function TorsionCalculator() {
  const [submitted, setSubmitted] = useState(false);
  const [materialId, setMaterialId] = useState<SpringMaterialId>("music_wire_a228");

  const form = useForm<FormValues>({
    defaultValues: {
      wireDiameter: 1.5,
      outerDiameter: 15,
      totalCoils: 6,
      activeCoils: 6,
      armLength1: 25,
      armLength2: 25,
      loadRadius: 20,
      bodyLength: 10,
      installAngle: 0,
      workingAngle: 45,
      pitch: 1.5,
      handOfCoil: "right",
    },
  });

  const watchedValues = form.watch();

  // Calculate results
  const results = useMemo((): TorsionResults | null => {
    if (!submitted) return null;
    
    const material = getSpringMaterial(materialId);
    if (!material) return null;
    
    return calculateTorsionSpring(
      watchedValues.wireDiameter ?? 1.5,
      watchedValues.outerDiameter ?? 15,
      watchedValues.activeCoils ?? 6,
      watchedValues.installAngle ?? 0,
      watchedValues.workingAngle ?? 45,
      watchedValues.loadRadius ?? 20,
      watchedValues.armLength1 ?? 25,
      watchedValues.armLength2 ?? 25,
      watchedValues.bodyLength ?? 10,
      material
    );
  }, [submitted, watchedValues, materialId]);

  const onSubmit = () => {
    setSubmitted(true);
  };

  const handleMaterialChange = (material: SpringMaterial) => {
    setMaterialId(material.id);
    if (submitted) {
      setSubmitted(false);
      setTimeout(() => setSubmitted(true), 0);
    }
  };

  // Generate analysis URL with all parameters
  const analysisUrl = useMemo(() => {
    const meanDiameter = (watchedValues.outerDiameter ?? 15) - (watchedValues.wireDiameter ?? 1.5);
    const params = new URLSearchParams({
      type: "torsion",
      d: (watchedValues.wireDiameter ?? 1.5).toString(),
      Dm: meanDiameter.toString(),
      Na: (watchedValues.activeCoils ?? 6).toString(),
      L1: (watchedValues.armLength1 ?? 25).toString(),
      L2: (watchedValues.armLength2 ?? 25).toString(),
      Lb: (watchedValues.bodyLength ?? 10).toString(),
      dxMin: (watchedValues.installAngle ?? 0).toString(),
      dxMax: ((watchedValues.installAngle ?? 0) + (watchedValues.workingAngle ?? 45)).toString(),
      hand: watchedValues.handOfCoil ?? "right",
      material: materialId,
    });
    return `/tools/analysis?${params.toString()}`;
  }, [watchedValues, materialId]);

  const cadExportUrl = useMemo(() => {
    const meanDiameter = (watchedValues.outerDiameter ?? 15) - (watchedValues.wireDiameter ?? 1.5);
    const params = new URLSearchParams({
      type: "torsion",
      d: (watchedValues.wireDiameter ?? 1.5).toString(),
      Dm: meanDiameter.toString(),
      Na: (watchedValues.activeCoils ?? 6).toString(),
      L1: (watchedValues.armLength1 ?? 25).toString(),
      L2: (watchedValues.armLength2 ?? 25).toString(),
      Lb: (watchedValues.bodyLength ?? 10).toString(),
      hand: watchedValues.handOfCoil ?? "right",
      material: materialId,
      k: results?.springRate?.toString() ?? "",
      dx: (watchedValues.workingAngle ?? 45).toString(),
    });
    return `/tools/cad-export?${params.toString()}`;
  }, [watchedValues, materialId, results]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Torsion Spring / 扭转弹簧</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Wire Diameter */}
            <div className="space-y-2">
              <DimensionHint code="d" label="Wire Diameter" description="线径，弹簧钢丝的直径。" />
              <Label htmlFor="wireDiameter">Wire Diameter d (mm) / 线径</Label>
              <Input id="wireDiameter" type="number" step="0.01" {...form.register("wireDiameter", { valueAsNumber: true })} />
            </div>

            {/* Outer Diameter */}
            <div className="space-y-2">
              <DimensionHint code="Do" label="Outer Diameter" description="外径，线圈外缘到外缘。" />
              <Label htmlFor="outerDiameter">Outer Diameter Do (mm) / 外径</Label>
              <Input id="outerDiameter" type="number" step="0.1" {...form.register("outerDiameter", { valueAsNumber: true })} />
            </div>

            {/* Coils */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalCoils">Total Coils N / 总圈数</Label>
                <Input id="totalCoils" type="number" step="0.25" {...form.register("totalCoils", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activeCoils">Active Coils Na / 有效圈数</Label>
                <Input id="activeCoils" type="number" step="0.25" {...form.register("activeCoils", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Arm Lengths */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <DimensionHint code="a1" label="Arm Length 1" description="臂长1，第一个脚的长度。" />
                <Label htmlFor="armLength1">Arm 1 a1 (mm) / 臂长1</Label>
                <Input id="armLength1" type="number" step="0.1" {...form.register("armLength1", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <DimensionHint code="a2" label="Arm Length 2" description="臂长2，第二个脚的长度。" />
                <Label htmlFor="armLength2">Arm 2 a2 (mm) / 臂长2</Label>
                <Input id="armLength2" type="number" step="0.1" {...form.register("armLength2", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Load Radius */}
            <div className="space-y-2">
              <DimensionHint code="R" label="Load Radius" description="负载作用半径，力臂长度。" />
              <Label htmlFor="loadRadius">Load Radius R (mm) / 负载作用半径</Label>
              <Input id="loadRadius" type="number" step="0.1" {...form.register("loadRadius", { valueAsNumber: true })} />
            </div>

            {/* Body Length & Pitch */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <DimensionHint code="Lmo" label="Body Length" description="簧体长度。" />
                <Label htmlFor="bodyLength">Body Length Lmo (mm) / 簧体长度</Label>
                <Input id="bodyLength" type="number" step="0.1" {...form.register("bodyLength", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <DimensionHint code="p" label="Pitch" description="节距，≥线径。" />
                <Label htmlFor="pitch">Pitch p (mm) / 节距</Label>
                <Input id="pitch" type="number" step="0.1" {...form.register("pitch", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Angles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <DimensionHint code="θdi" label="Install Angle" description="装置扭转角度，初始安装时的扭转角。" />
                <Label htmlFor="installAngle">Install Angle θdi (°) / 装置扭转角</Label>
                <Input id="installAngle" type="number" step="1" {...form.register("installAngle", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <DimensionHint code="θdo" label="Working Angle" description="作用扭转角度，工作时的扭转角。" />
                <Label htmlFor="workingAngle">Working Angle θdo (°) / 作用扭转角</Label>
                <Input id="workingAngle" type="number" step="1" {...form.register("workingAngle", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Hand of Coil */}
            <div className="space-y-2">
              <Label>Hand of Coil / 绕向</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" value="right" {...form.register("handOfCoil")} />
                  Right Hand / 右旋
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" value="left" {...form.register("handOfCoil")} />
                  Left Hand / 左旋
                </label>
              </div>
            </div>

            {/* Material Selector */}
            <MaterialSelector
              value={materialId}
              onChange={handleMaterialChange}
            />

            <Button type="submit" className="w-full">
              Calculate / 计算
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-slate-50">
        <CardHeader>
          <CardTitle>Results / 计算结果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted && results ? (
            <div className="space-y-4">
              {/* Warnings */}
              {results.warnings.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  {results.warnings.map((warning, i) => (
                    <p key={i} className="text-xs text-amber-200">⚠ {warning}</p>
                  ))}
                </div>
              )}

              {/* Material Properties */}
              <div className="space-y-2 rounded-md border border-slate-700 bg-slate-800 p-3">
                <p className="text-xs font-medium text-slate-400">Material / 材料</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-400">Shear Modulus G:</span>
                  <span>{results.shearModulus.toFixed(0)} kg/mm²</span>
                  <span className="text-slate-400">Max Stress Smax:</span>
                  <span>{(results.maxAllowableStress / 1e6).toFixed(0)} MPa</span>
                </div>
              </div>

              {/* Geometry Results */}
              <div className="space-y-2 rounded-md border border-slate-700 bg-slate-800 p-3">
                <p className="text-xs font-medium text-slate-400">Geometry / 几何参数</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-400">Na (有效圈数):</span>
                  <span>{results.activeCoils}</span>
                  <span className="text-slate-400">Rotated Length L:</span>
                  <span>{results.rotatedLength.toFixed(2)} mm</span>
                  <span className="text-slate-400">Rotated Inner Ds:</span>
                  <span>{results.rotatedInnerDiameter.toFixed(2)} mm</span>
                </div>
              </div>

              {/* Spring Rate */}
              <div className="space-y-2 rounded-md border border-green-700 bg-green-900/30 p-3">
                <p className="text-xs font-medium text-green-400">Spring Rate / 弹簧系数</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-400">K =</span>
                  <span className="text-green-300 font-medium">{results.springRateGmm.toFixed(2)} g·mm/deg</span>
                </div>
              </div>

              {/* Force & Torque */}
              <div className="space-y-2 rounded-md border border-cyan-700 bg-cyan-900/30 p-3">
                <p className="text-xs font-medium text-cyan-400">Force & Torque / 力与扭矩</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-400">P1 (作用力量):</span>
                  <span>{results.installForceG.toFixed(2)} g</span>
                  <span className="text-slate-400">P2 (作用力量):</span>
                  <span className="text-cyan-300 font-medium">{results.workingForceG.toFixed(2)} g</span>
                  <span className="text-slate-400">M1 (力矩):</span>
                  <span>{results.installTorqueGmm.toFixed(2)} g·mm</span>
                  <span className="text-slate-400">M2 (力矩):</span>
                  <span className="text-cyan-300 font-medium">{results.workingTorqueGmm.toFixed(2)} g·mm</span>
                </div>
              </div>

              {/* Stress Results */}
              <div className="space-y-2 rounded-md border border-blue-700 bg-blue-900/30 p-3">
                <p className="text-xs font-medium text-blue-400">Stress / 应力</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-400">S1 (应力):</span>
                  <span>{results.installStress.toFixed(3)} kg/mm²</span>
                  <span className="text-slate-400">S2 (应力):</span>
                  <span className="text-blue-300 font-medium">{results.workingStress.toFixed(3)} kg/mm²</span>
                </div>
              </div>

              {/* Safety & Weight */}
              <div className={`space-y-2 rounded-md border p-3 ${
                results.safetyFactor >= 1.2 
                  ? "border-emerald-700 bg-emerald-900/30" 
                  : results.safetyFactor >= 1.0 
                    ? "border-amber-700 bg-amber-900/30"
                    : "border-red-700 bg-red-900/30"
              }`}>
                <p className="text-xs font-medium text-slate-400">Safety & Weight / 安全与重量</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-400">SF (安全率):</span>
                  <span className={`font-bold ${
                    results.safetyFactor >= 1.2 
                      ? "text-emerald-400" 
                      : results.safetyFactor >= 1.0 
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}>
                    {results.safetyFactorPercent.toFixed(0)} %
                  </span>
                  <span className="text-slate-400">M (弹簧重量):</span>
                  <span>{results.springWeight.toFixed(2)} g</span>
                </div>
              </div>

              {/* Formula Reference */}
              <div className="space-y-1 text-xs text-slate-500 border-t border-slate-700 pt-2">
                <p>K = E·d⁴ / (64·D·Na) × (π/180)</p>
                <p>M = K·θ, P = M/R</p>
                <p>S = 32·M / (π·d³)</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-200">
              Input parameters and run the calculation to view results.
              <br />
              <span className="text-slate-400">输入参数并点击计算，查看结果。</span>
            </p>
          )}

          <div className="space-y-2 pt-2">
            <Button asChild variant="secondary" className="w-full">
              <a href={analysisUrl}>View 3D Model / 查看3D模型</a>
            </Button>
            <Button asChild variant="outline" className="w-full border-blue-600 text-blue-400 hover:bg-blue-950">
              <a href={analysisUrl}>Send to Engineering Analysis / 发送到工程分析</a>
            </Button>
            <Button asChild variant="outline" className="w-full border-purple-600 text-purple-400 hover:bg-purple-950" disabled={!results}>
              <a href={cadExportUrl}>Export CAD / 导出 CAD</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
