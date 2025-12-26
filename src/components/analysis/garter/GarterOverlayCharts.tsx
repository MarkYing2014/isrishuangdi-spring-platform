"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GarterAnalysisBundle } from "@/lib/analysis/garter/types";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export function GarterOverlayCharts({ bundle }: { bundle: GarterAnalysisBundle }) {
  const anaF = bundle.analytical.curves.force;
  const anaS = bundle.analytical.curves.stress;

  // 同 x 轴拼数据（先按 index 对齐，V1 足够）
  const rows = anaF.map((p, i) => ({
    x: p.x,
    force_ana: p.y,
    stress_ana: anaS[i]?.y ?? null,
    force_fea: bundle.fea?.curves?.force?.[i]?.y ?? null,
    stress_fea: bundle.fea?.curves?.stress?.[i]?.y ?? null,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Force vs ΔD / 拉力曲线</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tickFormatter={(v) => `${v}`} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="force_ana" name="Analytical" dot={false} stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="force_fea" name="FEA" dot={false} stroke="#9333ea" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stress vs ΔD / 应力曲线</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tickFormatter={(v) => `${v}`} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="stress_ana" name="Analytical" dot={false} stroke="#dc2626" strokeWidth={2} />
              <Line type="monotone" dataKey="stress_fea" name="FEA" dot={false} stroke="#9333ea" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
