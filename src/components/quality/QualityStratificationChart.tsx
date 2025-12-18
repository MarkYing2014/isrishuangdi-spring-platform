"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { QualityStratificationResult } from "@/lib/quality";

function statusColor(status: string) {
  if (status === "HIGH_RISK") return "#ef4444";
  if (status === "MANUFACTURING_RISK") return "#f59e0b";
  return "#22c55e";
}

export function QualityStratificationChart({ stratification, height = 260 }: { stratification: QualityStratificationResult; height?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => {
    return (stratification.strata ?? []).map((s) => ({
      key: s.key,
      score: s.score,
      status: s.status,
      n: s.count,
    }));
  }, [stratification.strata]);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        Loading chart...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        No stratification data
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <div className="font-medium">{p.key}</div>
          <div>Score = {p.score}</div>
          <div>Status = {p.status}</div>
          <div>n = {p.n}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="key" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={46} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={`${entry.key}-${idx}`} fill={statusColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
