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

import type { ImrChart } from "@/lib/quality";

function fmt(n: number, decimals = 3) {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

function Dot({ cx, cy, payload, stroke }: any) {
  if (!(typeof cx === "number" && typeof cy === "number")) return null;
  const ooc = !!payload?.outOfControl;
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

export function QualityImrCharts({ imr, height = 260 }: { imr: ImrChart; height?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const iData = useMemo(() => {
    return (imr.points ?? []).map((p) => ({
      x: p.x,
      value: p.value,
      cl: p.cl,
      ucl: p.ucl,
      lcl: p.lcl,
      outOfControl: p.outOfControl,
    }));
  }, [imr.points]);

  const mrLimits = useMemo(() => {
    const mrBar = imr.mrBar ?? 0;
    const d3 = 0;
    const d4 = 3.267;
    return {
      cl: mrBar,
      ucl: d4 * mrBar,
      lcl: d3 * mrBar,
    };
  }, [imr.mrBar]);

  const mrData = useMemo(() => {
    const xs = (imr.points ?? []).map((p) => p.value);
    const out: Array<{ x: number; mr: number; outOfControl: boolean }> = [];
    for (let i = 1; i < xs.length; i++) {
      const mr = Math.abs(xs[i] - xs[i - 1]);
      out.push({
        x: i + 1,
        mr,
        outOfControl: mr > mrLimits.ucl || mr < mrLimits.lcl,
      });
    }
    return out;
  }, [imr.points, mrLimits.lcl, mrLimits.ucl]);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        Loading chart...
      </div>
    );
  }

  if (!iData.length) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        No data
      </div>
    );
  }

  const ITooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <div className="font-medium">i = {p.x}</div>
          <div>Value = {fmt(p.value, 4)}</div>
          <div className="text-slate-600">CL/UCL/LCL = {fmt(p.cl, 4)} / {fmt(p.ucl, 4)} / {fmt(p.lcl, 4)}</div>
        </div>
      );
    }
    return null;
  };

  const MRTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <div className="font-medium">i = {p.x}</div>
          <div>MR = {fmt(p.mr, 4)}</div>
          <div className="text-slate-600">CL/UCL/LCL = {fmt(mrLimits.cl, 4)} / {fmt(mrLimits.ucl, 4)} / {fmt(mrLimits.lcl, 4)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="w-full" style={{ height }}>
        <div className="text-xs text-muted-foreground mb-2">I Chart</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={iData} margin={{ top: 12, right: 18, left: 6, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ITooltip />} />
            <ReferenceLine y={imr.ucl} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={imr.mean} stroke="#64748b" strokeDasharray="2 2" />
            <ReferenceLine y={imr.lcl} stroke="#ef4444" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={<Dot />} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full" style={{ height }}>
        <div className="text-xs text-muted-foreground mb-2">MR Chart</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mrData} margin={{ top: 12, right: 18, left: 6, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<MRTooltip />} />
            <ReferenceLine y={mrLimits.ucl} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={mrLimits.cl} stroke="#64748b" strokeDasharray="2 2" />
            <ReferenceLine y={mrLimits.lcl} stroke="#ef4444" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="mr" stroke="#8b5cf6" strokeWidth={2} dot={<Dot />} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
