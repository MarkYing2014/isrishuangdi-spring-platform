"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { XbarRChart } from "@/lib/quality";

function fmt(n: number, decimals = 3) {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

function Dot({ cx, cy, payload, stroke, kind }: any) {
  if (!(typeof cx === "number" && typeof cy === "number")) return null;
  const ooc = kind === "x" ? !!payload?.xOutOfControl : !!payload?.rOutOfControl;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={ooc ? 3.5 : 2.5}
      fill={ooc ? "#ef4444" : stroke ?? "#2563eb"}
      stroke="#fff"
      strokeWidth={1}
    />
  );
}

export function QualityXbarRCharts({ xbarr, height = 260 }: { xbarr: XbarRChart; height?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => {
    return (xbarr.points ?? []).map((p) => ({
      x: p.index,
      subgroupId: p.subgroupId,
      mean: p.mean,
      range: p.range,
      xcl: p.xcl,
      xucl: p.xucl,
      xlcl: p.xlcl,
      rcl: p.rcl,
      rucl: p.rucl,
      rlcl: p.rlcl,
      xOutOfControl: p.xOutOfControl,
      rOutOfControl: p.rOutOfControl,
    }));
  }, [xbarr.points]);

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
        No Xbar-R data
      </div>
    );
  }

  const XTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <div className="font-medium">Subgroup {p.subgroupId}</div>
          <div>X = {fmt(p.mean, 4)}</div>
          <div className="text-slate-600">CL/UCL/LCL = {fmt(p.xcl, 4)} / {fmt(p.xucl, 4)} / {fmt(p.xlcl, 4)}</div>
        </div>
      );
    }
    return null;
  };

  const RTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <div className="font-medium">Subgroup {p.subgroupId}</div>
          <div>R = {fmt(p.range, 4)}</div>
          <div className="text-slate-600">CL/UCL/LCL = {fmt(p.rcl, 4)} / {fmt(p.rucl, 4)} / {fmt(p.rlcl, 4)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="w-full" style={{ height }}>
        <div className="text-xs text-muted-foreground mb-2">Xbar Chart (n={xbarr.subgroupSize})</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<XTooltip />} />
            <ReferenceLine y={data[0].xucl} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={data[0].xcl} stroke="#64748b" strokeDasharray="2 2" />
            <ReferenceLine y={data[0].xlcl} stroke="#ef4444" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="mean" stroke="#2563eb" strokeWidth={2} dot={<Dot kind="x" />} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full" style={{ height }}>
        <div className="text-xs text-muted-foreground mb-2">R Chart</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<RTooltip />} />
            <ReferenceLine y={data[0].rucl} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={data[0].rcl} stroke="#64748b" strokeDasharray="2 2" />
            <ReferenceLine y={data[0].rlcl} stroke="#ef4444" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="range" stroke="#8b5cf6" strokeWidth={2} dot={<Dot kind="r" />} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
