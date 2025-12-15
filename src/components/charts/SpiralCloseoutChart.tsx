"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ReferenceLine,
} from "recharts";
import { useLanguage } from "@/components/language-context";

export interface SpiralCloseoutPoint {
  thetaDeg: number;
  torque: number;
}

interface SpiralCloseoutChartProps {
  linear: SpiralCloseoutPoint[];
  nonlinear: SpiralCloseoutPoint[];
  thetaCoDeg: number;
  height?: number;
}

export function SpiralCloseoutChart({ linear, nonlinear, thetaCoDeg, height = 260 }: SpiralCloseoutChartProps) {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const isZh = language === "zh";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Loading chart...
      </div>
    );
  }

  const data = (linear || []).map((p, idx) => ({
    thetaDeg: p.thetaDeg,
    torqueLinear: p.torque,
    torqueNonlinear: nonlinear && nonlinear[idx] ? nonlinear[idx].torque : null,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        {isZh ? "暂无曲线数据" : "No curve data"}
      </div>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { thetaDeg: number; torqueLinear: number; torqueNonlinear: number | null } }>;
  }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">θ = {p.thetaDeg.toFixed(1)}°</p>
          <p className="text-slate-700">T_linear = {p.torqueLinear.toFixed(1)} N·mm</p>
          <p className="text-purple-700">
            T_nonlinear = {p.torqueNonlinear !== null ? p.torqueNonlinear.toFixed(1) : "—"} N·mm
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 22, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="thetaDeg"
            type="number"
            tick={{ fontSize: 11 }}
            label={{
              value: isZh ? "角度 θ (deg)" : "Angle θ (deg)",
              position: "bottom",
              offset: 15,
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            tick={{ fontSize: 11 }}
            label={{
              value: isZh ? "扭矩 T (N·mm)" : "Torque T (N·mm)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fontSize: 12,
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            x={thetaCoDeg}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{
              value: isZh ? "θ_co" : "θ_co",
              position: "top",
              fontSize: 10,
              fill: "#f59e0b",
            }}
          />

          <Line type="monotone" dataKey="torqueLinear" stroke="#3b82f6" strokeWidth={2} dot={false} name="Linear" />
          <Line type="monotone" dataKey="torqueNonlinear" stroke="#a855f7" strokeWidth={2} dot={false} name="Nonlinear" />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: "#3b82f6" }} />
          <span>{isZh ? "线性" : "Linear"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: "#a855f7" }} />
          <span>{isZh ? "渐进硬化" : "Nonlinear"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: "#f59e0b" }} />
          <span>{isZh ? "贴合角" : "Close-out"}</span>
        </div>
      </div>
    </div>
  );
}
