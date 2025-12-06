"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Box } from "lucide-react";

interface SpringForceTesterLayoutProps {
  /** Spring type for styling */
  springType: "compression" | "extension" | "conical";
  /** Title for the page */
  title: string;
  /** Subtitle/description */
  subtitle: string;
  /** Parameters panel (left side) */
  parametersPanel: ReactNode;
  /** Deflection slider */
  slider: ReactNode;
  /** Current point info card */
  currentPointCard: ReactNode;
  /** 3D visualizer component */
  visualizer: ReactNode;
  /** Force-deflection chart */
  chart: ReactNode;
  /** Data table */
  table: ReactNode;
  /** Footer buttons (CAD export, etc.) */
  footer?: ReactNode;
  /** Additional info panel (e.g., stage transitions for conical) */
  additionalInfo?: ReactNode;
  /** 3D section description */
  visualizerDescription?: string;
  /** 3D section description (Chinese) */
  visualizerDescriptionCn?: string;
}

export function SpringForceTesterLayout({
  springType,
  title,
  subtitle,
  parametersPanel,
  slider,
  currentPointCard,
  visualizer,
  chart,
  table,
  footer,
  additionalInfo,
  visualizerDescription = "Drag the slider to animate the spring compression.",
  visualizerDescriptionCn = "拖动滑块查看弹簧压缩动画。",
}: SpringForceTesterLayoutProps) {
  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          Module • Spring Force Tester
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {/* Main Content Grid: Parameters + Visualization */}
      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        {/* Left Panel - Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>
              {springType === "conical" 
                ? "Conical Spring Parameters / 锥形弹簧参数" 
                : springType === "extension"
                  ? "Extension Spring Parameters / 拉伸弹簧参数"
                  : "Compression Spring Parameters / 压缩弹簧参数"
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parametersPanel}
          </CardContent>
        </Card>

        {/* Right Panel - 3D Visualization + Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              3D Visualization / 3D 可视化
            </CardTitle>
            <CardDescription>
              {visualizerDescription}
              <br />
              <span className="text-slate-400">{visualizerDescriptionCn}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Deflection Slider */}
            {slider}

            {/* Current Point Card + 3D View Grid */}
            <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
              {/* Current Point Card */}
              <div>{currentPointCard}</div>
              
              {/* 3D Canvas */}
              <div className="h-[420px] w-full rounded-lg overflow-hidden border bg-slate-50">
                {visualizer}
              </div>
            </div>

            {/* Additional Info (e.g., stage transitions) */}
            {additionalInfo}
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {springType === "extension" 
              ? "Force – Extension Curve / 力-伸长曲线"
              : "Force – Deflection Curve / 力-位移曲线"
            }
          </CardTitle>
          <CardDescription>
            {springType === "conical" 
              ? "Nonlinear curve shows progressive stiffening as coils collapse. / 非线性曲线显示线圈贴底时刚度逐步增加。"
              : springType === "extension"
                ? "F = F₀ + k × Δx (includes initial tension). / 含初拉力的线性关系。"
                : "Linear spring: F = k × Δx. / 线性弹簧：力与位移成正比。"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chart */}
          <div className="h-64 w-full">
            {chart}
          </div>

          {/* Table */}
          {table}

          {/* Footer / CAD Export Button */}
          {footer && (
            <div className="pt-4 border-t">
              {footer}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
