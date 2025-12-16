"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Legend,
} from "recharts";

export type VariablePitchCurvePoint = {
  deflection: number;
  load: number;
  springRate?: number;
  shearStress?: number;
  activeCoils?: number;
};

export type VariablePitchCurveMode =
  | "force"
  | "stiffness"
  | "stress"
  | "overlay_force_stress"
  | "overlay_force_stiffness";

interface Props {
  data: VariablePitchCurvePoint[];
  mode: VariablePitchCurveMode;
}

export function VariablePitchCurvesChart({ data, mode }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasK = useMemo(() => data.some((p) => typeof p.springRate === "number"), [data]);
  const hasTau = useMemo(() => data.some((p) => typeof p.shearStress === "number"), [data]);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        Loading chart...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        No data yet. Generate a curve to see the chart.
      </div>
    );
  }

  const showForce = mode === "force" || mode.startsWith("overlay_force_");
  const showK = mode === "stiffness" || mode === "overlay_force_stiffness";
  const showTau = mode === "stress" || mode === "overlay_force_stress";

  const primaryKey = showForce ? "load" : showK ? "springRate" : "shearStress";
  const primaryLabel = showForce
    ? "Force (N)"
    : showK
      ? "Stiffness (N/mm)"
      : "Shear Stress (MPa)";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 40, right: 24, left: 16, bottom: 18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="deflection"
          label={{ value: "Deflection (mm)", position: "insideBottom", offset: -10 }}
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis
          yAxisId="left"
          dataKey={primaryKey}
          label={{ value: primaryLabel, angle: -90, position: "insideLeft", offset: 10 }}
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />

        {mode === "overlay_force_stress" && hasTau && (
          <YAxis
            yAxisId="right"
            orientation="right"
            dataKey="shearStress"
            label={{ value: "Shear Stress (MPa)", angle: -90, position: "insideRight", offset: 10 }}
            tick={{ fontSize: 12 }}
            stroke="#64748b"
          />
        )}

        {mode === "overlay_force_stiffness" && hasK && (
          <YAxis
            yAxisId="right"
            orientation="right"
            dataKey="springRate"
            label={{ value: "Stiffness (N/mm)", angle: -90, position: "insideRight", offset: 10 }}
            tick={{ fontSize: 12 }}
            stroke="#64748b"
          />
        )}

        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          labelFormatter={(label: number) => `Deflection: ${label.toFixed(2)} mm`}
        />
        <Legend
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
        />

        {showForce && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="load"
            name="Force"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        )}

        {mode === "stiffness" && (
          <Line
            yAxisId="left"
            type="stepAfter"
            dataKey="springRate"
            name="Stiffness"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}

        {mode === "stress" && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="shearStress"
            name="Shear Stress"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}

        {mode === "overlay_force_stress" && hasTau && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="shearStress"
            name="Shear Stress"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}

        {mode === "overlay_force_stiffness" && hasK && (
          <Line
            yAxisId="right"
            type="stepAfter"
            dataKey="springRate"
            name="Stiffness"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
