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
} from "recharts";
import { useLanguage } from "@/components/language-context";

export interface SpiralTorqueBandPoint {
  thetaDeg: number;
  torqueNom: number;
  torqueMin: number;
  torqueMax: number;
}

interface SpiralTorqueBandChartProps {
  data: SpiralTorqueBandPoint[];
  height?: number;
}

export function SpiralTorqueBandChart({ data, height = 260 }: SpiralTorqueBandChartProps) {
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

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        {isZh ? "暂无曲线数据" : "No curve data"}
      </div>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number; payload: SpiralTorqueBandPoint }>;
    label?: number;
  }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">θ = {p.thetaDeg.toFixed(1)}°</p>
          <p className="text-slate-700">T_nom = {p.torqueNom.toFixed(1)} N·mm</p>
          <p className="text-emerald-700">T_min = {p.torqueMin.toFixed(1)} N·mm</p>
          <p className="text-amber-700">T_max = {p.torqueMax.toFixed(1)} N·mm</p>
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
          <Line type="monotone" dataKey="torqueNom" stroke="#3b82f6" strokeWidth={2} dot={false} name="Nominal" />
          <Line type="monotone" dataKey="torqueMin" stroke="#10b981" strokeWidth={2} dot={false} name="Min" />
          <Line type="monotone" dataKey="torqueMax" stroke="#f59e0b" strokeWidth={2} dot={false} name="Max" />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: "#3b82f6" }} />
          <span>{isZh ? "名义" : "Nom"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: "#10b981" }} />
          <span>{isZh ? "下界" : "Min"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: "#f59e0b" }} />
          <span>{isZh ? "上界" : "Max"}</span>
        </div>
      </div>
    </div>
  );
}
