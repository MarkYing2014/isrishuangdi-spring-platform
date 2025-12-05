"use client";

// TODO: Implement full engineering calculations for torsion springs using springMath in future phase.

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DimensionHint } from "./DimensionHint";

interface FormValues {
  diameterType: "outer" | "inner";
  diameter: number;
  wireDiameter: number;
  totalCoils: number;
  legLength1: number;
  legLength2: number;
  freeAngle: number;
  workingAngle: number;
  handOfCoil: "right" | "left";
}

export function TorsionCalculator() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      diameterType: "outer",
      diameter: 15,
      wireDiameter: 1.5,
      totalCoils: 5,
      legLength1: 20,
      legLength2: 20,
      freeAngle: 90,
      workingAngle: 45,
      handOfCoil: "right",
    },
  });

  const diameterType = form.watch("diameterType");

  const onSubmit = () => {
    setSubmitted(true);
  };

  const handleNotSupported = () => {
    alert("3D model for torsion springs is not yet supported.\n扭转弹簧的3D模型暂未支持。");
  };

  // Watch form values for URL generation
  const watchedValues = form.watch();

  const analysisUrl = useMemo(() => {
    const meanDiameter = watchedValues.diameterType === "outer" 
      ? (watchedValues.diameter ?? 15) - (watchedValues.wireDiameter ?? 2) 
      : (watchedValues.diameter ?? 15) + (watchedValues.wireDiameter ?? 2);
    const params = new URLSearchParams({
      type: "torsion",
      d: watchedValues.wireDiameter?.toString() ?? "2",
      Dm: meanDiameter.toString(),
      Na: watchedValues.totalCoils?.toString() ?? "6",
      L1: watchedValues.legLength1?.toString() ?? "20",
      L2: watchedValues.legLength2?.toString() ?? "20",
      dxMin: "0",
      dxMax: watchedValues.workingAngle?.toString() ?? "45",
      material: "music_wire_a228",
    });
    return `/tools/analysis?${params.toString()}`;
  }, [watchedValues]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Torsion Spring / 扭转弹簧</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Diameter Type Toggle */}
            <div className="space-y-2">
              <Label>Diameter Type / 直径类型</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="outer"
                    {...form.register("diameterType")}
                  />
                  Outer Diameter / 外径
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="inner"
                    {...form.register("diameterType")}
                  />
                  Inner Diameter / 内径
                </label>
              </div>
            </div>

            {/* Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code={diameterType === "outer" ? "OD" : "ID"}
                label={diameterType === "outer" ? "Outer Diameter" : "Inner Diameter"}
                description={diameterType === "outer" ? "外径，线圈外缘到外缘。" : "内径，线圈内缘到内缘。"}
              />
              <Label htmlFor="diameter">
                {diameterType === "outer" ? "Outer Diameter OD" : "Inner Diameter ID"} (mm) / {diameterType === "outer" ? "外径" : "内径"}
              </Label>
              <Input
                id="diameter"
                type="number"
                step="0.1"
                {...form.register("diameter", { valueAsNumber: true })}
              />
            </div>

            {/* Wire Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code="d"
                label="Wire Diameter"
                description="线径，弹簧钢丝的直径。"
              />
              <Label htmlFor="wireDiameter">Wire Diameter d (mm) / 线径</Label>
              <Input
                id="wireDiameter"
                type="number"
                step="0.01"
                {...form.register("wireDiameter", { valueAsNumber: true })}
              />
            </div>

            {/* Total Coils */}
            <div className="space-y-2">
              <Label htmlFor="totalCoils">Total Coils Nt / 总圈数</Label>
              <Input
                id="totalCoils"
                type="number"
                step="0.25"
                {...form.register("totalCoils", { valueAsNumber: true })}
              />
            </div>

            {/* Leg Lengths */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legLength1">Leg 1 (mm) / 腿长1</Label>
                <Input
                  id="legLength1"
                  type="number"
                  step="0.1"
                  {...form.register("legLength1", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legLength2">Leg 2 (mm) / 腿长2</Label>
                <Input
                  id="legLength2"
                  type="number"
                  step="0.1"
                  {...form.register("legLength2", { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Free Angle */}
            <div className="space-y-2">
              <DimensionHint
                code="θ₀"
                label="Free Angle"
                description="自由角，两腿之间的初始夹角。"
              />
              <Label htmlFor="freeAngle">Free Angle θ₀ (°) / 自由角</Label>
              <Input
                id="freeAngle"
                type="number"
                step="1"
                {...form.register("freeAngle", { valueAsNumber: true })}
              />
            </div>

            {/* Working Angle */}
            <div className="space-y-2">
              <DimensionHint
                code="θ"
                label="Working Deflection Angle"
                description="工作扭转角，从自由位置扭转的角度。"
              />
              <Label htmlFor="workingAngle">Working Angle θ (°) / 工作扭转角</Label>
              <Input
                id="workingAngle"
                type="number"
                step="1"
                {...form.register("workingAngle", { valueAsNumber: true })}
              />
            </div>

            {/* Hand of Coil */}
            <div className="space-y-2">
              <Label>Hand of Coil / 绕向</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="right"
                    {...form.register("handOfCoil")}
                  />
                  Right Hand / 右旋
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="left"
                    {...form.register("handOfCoil")}
                  />
                  Left Hand / 左旋
                </label>
              </div>
            </div>

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
          {submitted ? (
            <div className="space-y-4">
              {/* Parameter Summary */}
              <div className="space-y-2 rounded-md border border-slate-700 bg-slate-800 p-3">
                <p className="text-xs font-medium text-slate-400">Parameter Summary / 参数摘要</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-400">{diameterType === "outer" ? "OD" : "ID"}:</span>
                  <span>{form.getValues("diameter")} mm</span>
                  <span className="text-slate-400">Wire d:</span>
                  <span>{form.getValues("wireDiameter")} mm</span>
                  <span className="text-slate-400">Total Coils:</span>
                  <span>{form.getValues("totalCoils")}</span>
                  <span className="text-slate-400">Free Angle:</span>
                  <span>{form.getValues("freeAngle")}°</span>
                  <span className="text-slate-400">Working Angle:</span>
                  <span>{form.getValues("workingAngle")}°</span>
                  <span className="text-slate-400">Hand:</span>
                  <span>{form.getValues("handOfCoil") === "right" ? "Right / 右旋" : "Left / 左旋"}</span>
                </div>
              </div>

              {/* Development Notice */}
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-200">
                  Torsion spring engineering formulas (rate, torque–angle curve, stress) will be added later.
                </p>
                <p className="mt-2 text-sm text-amber-300/80">
                  扭转弹簧的工程计算（扭矩刚度、扭矩-角度曲线、应力）正在开发中。
                </p>
              </div>

              {/* Formula Preview */}
              <div className="space-y-2 text-sm text-slate-400">
                <p className="text-xs font-medium">Formulas (coming soon):</p>
                <p>• k = E·d⁴ / (64·Dm·Na) [N·mm/°]</p>
                <p>• M = k·θ [N·mm]</p>
                <p>• σ = 32·M / (π·d³) [MPa]</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-200">
              Input parameters and run the calculation to view results.
              <br />
              <span className="text-slate-400">输入参数并点击计算，查看结果。</span>
            </p>
          )}

          <div className="space-y-2">
            <Button variant="secondary" className="w-full" disabled onClick={handleNotSupported}>
              Generate 3D Model / 生成3D模型
            </Button>
            <Button asChild variant="outline" className="w-full border-blue-600 text-blue-400 hover:bg-blue-950">
              <a href={analysisUrl}>Send to Engineering Analysis / 发送到工程分析</a>
            </Button>
          </div>
          <p className="text-center text-xs text-slate-500">3D model not yet available for torsion springs</p>
        </CardContent>
      </Card>
    </div>
  );
}
