"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { useLanguage } from "@/components/language-context";
import type { ForceDeflectionPoint } from "@/lib/engine/types";

interface StressDeflectionChartProps {
  /** Force-deflection curve data with stress */
  data: ForceDeflectionPoint[];
  /** Current deflection position */
  currentDeflection?: number;
  /** Allowable stress limit */
  allowableStress?: number;
  /** Chart height */
  height?: number;
  /** Line color */
  lineColor?: string;
  /** Marker color */
  markerColor?: string;
  /** X-axis label (for torsion springs: angle) */
  xAxisLabel?: string;
}

/**
 * Stress vs Deflection Chart
 * 应力-位移曲线图
 */
export function StressDeflectionChart({
  data,
  currentDeflection,
  allowableStress,
  height = 300,
  lineColor = "#8b5cf6",
  markerColor = "#ef4444",
  xAxisLabel,
}: StressDeflectionChartProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Filter data to only include points with stress
  const chartData = data.filter((p) => p.stress !== undefined).map((p) => ({
    deflection: p.deflection,
    stress: p.stress!,
    force: p.force,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {isZh ? "暂无应力数据" : "No stress data available"}
      </div>
    );
  }

  // Find current point
  const currentPoint = currentDeflection !== undefined
    ? chartData.find((p) => Math.abs(p.deflection - currentDeflection) < 0.01) ||
      chartData.reduce((prev, curr) =>
        Math.abs(curr.deflection - currentDeflection) < Math.abs(prev.deflection - currentDeflection)
          ? curr
          : prev
      )
    : null;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { deflection: number; stress: number; force: number } }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p>Δx = {d.deflection.toFixed(2)} mm</p>
          <p className="text-purple-600 font-medium">τ = {d.stress.toFixed(1)} MPa</p>
          <p className="text-blue-600">F = {d.force.toFixed(1)} N</p>
        </div>
      );
    }
    return null;
  };

  const defaultXLabel = isZh ? "位移 Δx (mm)" : "Deflection Δx (mm)";

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          
          <XAxis
            dataKey="deflection"
            type="number"
            tick={{ fontSize: 11 }}
            label={{
              value: xAxisLabel || defaultXLabel,
              position: "bottom",
              offset: 15,
              fontSize: 12,
            }}
          />
          
          <YAxis
            dataKey="stress"
            type="number"
            tick={{ fontSize: 11 }}
            label={{
              value: isZh ? "剪应力 τ (MPa)" : "Shear Stress τ (MPa)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fontSize: 12,
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Stress curve */}
          <Line
            type="monotone"
            dataKey="stress"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            name={isZh ? "应力曲线" : "Stress Curve"}
          />
          
          {/* Allowable stress limit */}
          {allowableStress && (
            <ReferenceLine
              y={allowableStress}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{
                value: isZh ? `许用 ${allowableStress} MPa` : `Allow ${allowableStress} MPa`,
                position: "right",
                fontSize: 10,
                fill: "#ef4444",
              }}
            />
          )}
          
          {/* Current point marker */}
          {currentPoint && (
            <ReferenceDot
              x={currentPoint.deflection}
              y={currentPoint.stress}
              r={6}
              fill={markerColor}
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: lineColor }} />
          <span>{isZh ? "应力曲线" : "Stress Curve"}</span>
        </div>
        {allowableStress && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
            <span>{isZh ? "许用应力" : "Allowable"}</span>
          </div>
        )}
        {currentPoint && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColor }} />
            <span>{isZh ? "当前点" : "Current"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
