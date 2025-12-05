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

interface SNcurveChartProps {
  /** S-N curve data points */
  curveData: Array<{ cycles: number; stress: number }>;
  /** Current operating point */
  currentPoint?: {
    cycles: number;
    stress: number;
  };
  /** Endurance limit stress */
  enduranceLimit?: number;
  /** Chart height */
  height?: number;
  /** Line color */
  lineColor?: string;
  /** Current point color */
  pointColor?: string;
}

/**
 * S-N Fatigue Curve Chart
 * S-N 疲劳曲线图
 * 
 * Displays logarithmic S-N curve with current operating point
 */
export function SNcurveChart({
  curveData,
  currentPoint,
  enduranceLimit,
  height = 300,
  lineColor = "#3b82f6",
  pointColor = "#ef4444",
}: SNcurveChartProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Transform data for log scale display
  const chartData = curveData.map((point) => ({
    logCycles: Math.log10(point.cycles),
    stress: point.stress,
    cycles: point.cycles,
  }));

  // Format axis labels
  const formatLogCycles = (value: number) => {
    const cycles = Math.pow(10, value);
    if (cycles >= 1e6) return `10^${value.toFixed(0)}`;
    return `10^${value.toFixed(0)}`;
  };

  const formatStress = (value: number) => `${value.toFixed(0)}`;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { cycles: number; stress: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">
            N = {data.cycles >= 1e6 
              ? `${(data.cycles / 1e6).toFixed(1)}M` 
              : data.cycles >= 1e3 
                ? `${(data.cycles / 1e3).toFixed(0)}k`
                : data.cycles.toFixed(0)
            } {isZh ? "次" : "cycles"}
          </p>
          <p className="text-blue-600">
            τ = {data.stress.toFixed(1)} MPa
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate current point position
  const currentPointData = currentPoint ? {
    logCycles: Math.log10(Math.max(currentPoint.cycles, 100)),
    stress: currentPoint.stress,
  } : null;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          
          <XAxis
            dataKey="logCycles"
            type="number"
            domain={[3, 8]}
            tickFormatter={formatLogCycles}
            tick={{ fontSize: 11 }}
            label={{
              value: isZh ? "循环次数 N (log)" : "Cycles N (log)",
              position: "bottom",
              offset: 15,
              fontSize: 12,
            }}
          />
          
          <YAxis
            dataKey="stress"
            type="number"
            tickFormatter={formatStress}
            tick={{ fontSize: 11 }}
            label={{
              value: isZh ? "应力幅值 τ (MPa)" : "Stress Amplitude τ (MPa)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fontSize: 12,
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* S-N Curve */}
          <Line
            type="monotone"
            dataKey="stress"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            name={isZh ? "S-N 曲线" : "S-N Curve"}
          />
          
          {/* Endurance limit line */}
          {enduranceLimit && (
            <ReferenceLine
              y={enduranceLimit}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{
                value: isZh ? `疲劳极限 ${enduranceLimit} MPa` : `Endurance ${enduranceLimit} MPa`,
                position: "right",
                fontSize: 10,
                fill: "#22c55e",
              }}
            />
          )}
          
          {/* Current operating point */}
          {currentPointData && (
            <ReferenceDot
              x={currentPointData.logCycles}
              y={currentPointData.stress}
              r={6}
              fill={pointColor}
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
          <span>{isZh ? "S-N 曲线" : "S-N Curve"}</span>
        </div>
        {enduranceLimit && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-green-500" />
            <span>{isZh ? "疲劳极限" : "Endurance Limit"}</span>
          </div>
        )}
        {currentPoint && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pointColor }} />
            <span>{isZh ? "当前工况" : "Current Point"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
