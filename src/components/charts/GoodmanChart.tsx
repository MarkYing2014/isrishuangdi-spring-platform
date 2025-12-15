"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/components/language-context";

export type MeanStressFatigueCriterion = "goodman" | "gerber" | "soderberg";

interface GoodmanChartProps {
  sigmaA: number;
  sigmaM: number;
  Se: number | null;
  Su: number | null;
  Sy?: number | null;
  criterion?: MeanStressFatigueCriterion;
  height?: number;
}

export function GoodmanChart({
  sigmaA,
  sigmaM,
  Se,
  Su,
  Sy = null,
  criterion = "goodman",
  height = 320,
}: GoodmanChartProps) {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const isZh = language === "zh";

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!Se || !isFinite(Se) || Se <= 0) return [];

    if (criterion === "soderberg") {
      if (!Sy || !isFinite(Sy) || Sy <= 0) return [];
      return [
        { sigmaM: 0, sigmaA: Se },
        { sigmaM: Sy, sigmaA: 0 },
      ];
    }

    if (!Su || !isFinite(Su) || Su <= 0) return [];

    if (criterion === "gerber") {
      const n = 60;
      const pts: Array<{ sigmaM: number; sigmaA: number }> = [];
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * Su;
        const y = Se * (1 - Math.pow(x / Su, 2));
        pts.push({ sigmaM: x, sigmaA: Math.max(0, y) });
      }
      return pts;
    }

    // goodman
    return [
      { sigmaM: 0, sigmaA: Se },
      { sigmaM: Su, sigmaA: 0 },
    ];
  }, [Se, Su, Sy, criterion]);

  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Loading chart...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        {criterion === "soderberg"
          ? isZh
            ? "缺少 Sy/Se，无法绘制 Soderberg 图"
            : "Missing Sy/Se; cannot draw Soderberg chart"
          : isZh
            ? "缺少 Su/Se，无法绘制疲劳图"
            : "Missing Su/Se; cannot draw fatigue chart"}
      </div>
    );
  }

  const limitXMax = chartData.length ? Math.max(...chartData.map((p) => p.sigmaM)) : 0;
  const limitYMax = chartData.length ? Math.max(...chartData.map((p) => p.sigmaA)) : 0;
  const xMax = Math.max(limitXMax, sigmaM, 1);
  const yMax = Math.max(limitYMax, sigmaA, 1);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { sigmaM: number; sigmaA: number } }>;
  }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">σ_m = {p.sigmaM.toFixed(1)} MPa</p>
          <p className="text-slate-700">σ_a = {p.sigmaA.toFixed(1)} MPa</p>
        </div>
      );
    }
    return null;
  };

  const utilization = (() => {
    if (!Se || !isFinite(Se) || Se <= 0) return null;
    if (criterion === "soderberg") {
      if (!Sy || !isFinite(Sy) || Sy <= 0) return null;
      return sigmaA / Se + sigmaM / Sy;
    }
    if (!Su || !isFinite(Su) || Su <= 0) return null;
    if (criterion === "gerber") return sigmaA / Se + Math.pow(sigmaM / Su, 2);
    return sigmaA / Se + sigmaM / Su;
  })();

  const isSafe = utilization !== null ? utilization <= 1 : null;

  const criterionLabel =
    criterion === "gerber"
      ? "Gerber"
      : criterion === "soderberg"
        ? "Soderberg"
        : "Goodman";

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 22, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

          <XAxis
            dataKey="sigmaM"
            type="number"
            domain={[0, xMax * 1.05]}
            tick={{ fontSize: 11 }}
            label={{
              value: isZh ? "平均应力 σ_m (MPa)" : "Mean stress σ_m (MPa)",
              position: "bottom",
              offset: 15,
              fontSize: 12,
            }}
          />
          <YAxis
            dataKey="sigmaA"
            type="number"
            domain={[0, yMax * 1.05]}
            tick={{ fontSize: 11 }}
            label={{
              value: isZh ? "应力幅值 σ_a (MPa)" : "Stress amplitude σ_a (MPa)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fontSize: 12,
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type={criterion === "gerber" ? "monotone" : "linear"}
            dataKey="sigmaA"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            name={criterionLabel}
          />

          <ReferenceLine x={0} stroke="#94a3b8" strokeOpacity={0.4} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeOpacity={0.4} />

          <ReferenceDot
            x={sigmaM}
            y={sigmaA}
            r={6}
            fill={isSafe === null ? "#64748b" : isSafe ? "#22c55e" : "#f59e0b"}
            stroke="#fff"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: "#8b5cf6" }} />
          <span>
            {isZh ? `${criterionLabel} 极限线` : `${criterionLabel} limit`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: isSafe === null ? "#64748b" : isSafe ? "#22c55e" : "#f59e0b" }}
          />
          <span>{isZh ? "当前点" : "Current"}</span>
        </div>
      </div>
    </div>
  );
}
