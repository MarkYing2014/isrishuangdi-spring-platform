"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ArcSpringInput } from "@/lib/arcSpring/types";
import { computeArcSpringCurve } from "@/lib/arcSpring/math";
import { computeEngineeringAnalysis } from "@/lib/arcSpring/arcSpringEngineering";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

export function ArcSpringEngineeringPage() {
  const searchParams = useSearchParams();
  
  // Parse inputs from URL
  const input = useMemo<ArcSpringInput>(() => {
    const getNum = (key: string, def: number) => {
      const v = searchParams.get(key);
      return v ? parseFloat(v) : def;
    };
    
    return {
      d: getNum("d", 3),
      D: getNum("D", 25),
      n: getNum("n", 6), // Na
      Nt: getNum("Nt", getNum("n", 6) + 2),
      r: getNum("r", 60),
      alpha0: getNum("alpha0", 45),
      alphaWork: getNum("alphaWork", 45 - 20),
      alphaLimit: getNum("alphaLimit", 45 - 30),
      alphaC: getNum("alphaC", 10), // Solid Angle
      preloadTorque: getNum("preloadTorque", 0),
      alphaPreload: getNum("alphaPreload", getNum("alpha0", 45)), // Default to free if not set
      
      materialKey: (searchParams.get("mat") as any) ?? "EN10270_2",
      hand: (searchParams.get("hand") as any) ?? "right",
      // Factory Report implies 4 springs (or 2 pairs) for Stiffness target 5.25.
      // 1.29 * 4 = 5.16 ~ 5.25.
      countParallel: getNum("nParallel", 4), 
      samples: 100
    };
  }, [searchParams]);

  // Compute Results
  const baseResult = useMemo(() => computeArcSpringCurve(input), [input]);
  const engResult = useMemo(() => computeEngineeringAnalysis(input, baseResult), [input, baseResult]);

  // Chart Data
  const chartData = useMemo(() => {
    return engResult.engineeringCurve.map(p => ({
      alpha: p.alpha.toFixed(1),
      delta: p.deltaDeg.toFixed(1),
      Torque: p.T_Nm.toFixed(1),
      Force: p.F_N.toFixed(0),
      Stress: p.tau_MPa.toFixed(0),
      label: p.label
    }));
  }, [engResult]);

  // KPI Status
  const status = engResult.ptWork && engResult.ptWork.SF >= 1.1 ? "PASS" : "FAIL";
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Arc Spring Analysis</h1>
          <p className="text-muted-foreground">Factory Standard θ–T–σ Model</p>
        </div>
        <Badge className={status === "PASS" ? "bg-green-600 text-lg px-4 py-1" : "bg-red-600 text-lg px-4 py-1"}>
          {status}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        <KpiCard label="k_theta (Work)" value={engResult.k_theta_Nm_deg.toFixed(2)} unit="Nm/deg" />
        <KpiCard label="T_work" value={engResult.ptWork?.T_Nm.toFixed(1) ?? "-"} unit="Nm" />
        <KpiCard label="Stress Ratio" value={engResult.ptWork ? (800 / engResult.ptWork.SF * 100 / 800 * 100).toFixed(0) : "-"} unit="%" /> 
        {/* Stress Ratio = Tau / Allow. PtWork.SF = Allow / Tau. So Tau/Allow = 1/SF. */}
        
        <KpiCard 
          label="Angle Margin" 
          value={engResult.angleMargin.toFixed(1)} 
          unit="deg" 
          sub="(Free - Work)"
        />
        <KpiCard label="Solid Margin" value={engResult.solidMargin.toFixed(1)} unit="mm" />
        <KpiCard label="Max Stress" value={engResult.ptLimit?.tau_MPa.toFixed(0) ?? "-"} unit="MPa" />
      </div>

      <Tabs defaultValue="loadAngle" className="w-full">
        <TabsList>
          <TabsTrigger value="loadAngle">Load – Angle (θ–T)</TabsTrigger>
          <TabsTrigger value="stress">Stress Analysis (τ–θ)</TabsTrigger>
          <TabsTrigger value="packaging">Packaging</TabsTrigger>
          {/* <TabsTrigger value="fatigue">Fatigue (Phase 2)</TabsTrigger> */}
        </TabsList>

        <TabsContent value="loadAngle">
          <Card>
            <CardHeader>
              <CardTitle>Torque Characteristic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="delta" label={{ value: 'Delta Angle (deg)', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Torque (Nm)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Torque" stroke="#2563eb" strokeWidth={3} dot={false} />
                    {/* Markers */}
                    {engResult.ptWork && <ReferenceLine x={engResult.ptWork.deltaDeg.toFixed(1)} stroke="green" label="Work" />}
                    {engResult.ptLimit && <ReferenceLine x={engResult.ptLimit.deltaDeg.toFixed(1)} stroke="red" label="Limit" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded">
                  <div className="font-semibold">Stiffness Model</div>
                  <div>k_axial = {engResult.k_axial_N_mm.toFixed(2)} N/mm</div>
                  <div>R_work = {input.r} mm</div>
                  <div>k_theta = k * R² = {engResult.k_theta_Nm_deg.toFixed(3)} Nm/deg</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="font-semibold">Unit Conversion</div>
                  <div>Δθ uses relative angle (deg)</div>
                  <div>x = R * Δθ_rad</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress">
          <Card>
            <CardHeader>
              <CardTitle>Stress Check (Shear Stress)</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[300px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="delta" label={{ value: 'Delta Angle (deg)', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Stress (MPa)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Stress" stroke="#dc2626" strokeWidth={3} dot={false} />
                    <ReferenceLine y={800} stroke="orange" strokeDasharray="3 3" label="Allowable (Est)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                 <StressCard title="Work Stress" val={engResult.ptWork?.tau_MPa} limit={800} />
                 <StressCard title="Limit Stress" val={engResult.ptLimit?.tau_MPa} limit={800} />
                 <StressCard title="Solid Stress" val={engResult.ptSolid?.tau_MPa} limit={800} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packaging">
           <Card>
            <CardHeader><CardTitle>Packaging Dimensions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between border-b py-2"><span>Outer Diameter (De)</span> <span>{baseResult.De.toFixed(1)} mm</span></div>
                <div className="flex justify-between border-b py-2"><span>Inner Diameter (Di)</span> <span>{baseResult.Di.toFixed(1)} mm</span></div>
                <div className="flex justify-between border-b py-2"><span>Wire Diameter (d)</span> <span>{input.d.toFixed(2)} mm</span></div>
                <div className="flex justify-between border-b py-2"><span>Working Radius (R)</span> <span>{input.r.toFixed(1)} mm</span></div>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between border-b py-2"><span>Free Angle (θ_free)</span> <span>{input.alpha0}°</span></div>
                 <div className="flex justify-between border-b py-2"><span>Work Angle (θ_work)</span> <span>{input.alphaWork ?? "-"}°</span></div>
                 <div className="flex justify-between border-b py-2"><span>Solid Angle (θ_solid)</span> <span>{input.alphaC}°</span></div>
              </div>
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, unit, sub }: { label: string, value: string, unit: string, sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold my-1">{value}</div>
        <div className="text-xs text-muted-foreground">{unit} {sub && <span className="block text-[10px]">{sub}</span>}</div>
      </CardContent>
    </Card>
  )
}

function StressCard({ title, val, limit }: { title: string, val?: number, limit: number }) {
  if (val === undefined) return null;
  const ratio = val / limit;
  const color = ratio > 1.0 ? "text-red-600" : ratio > 0.8 ? "text-orange-500" : "text-green-600";
  return (
    <div className="p-4 border rounded bg-slate-50">
      <div className="text-sm font-medium text-slate-700">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{val.toFixed(0)} MPa</div>
      <div className="text-xs text-muted-foreground">Limit: {limit} MPa (SF: {(limit/val).toFixed(2)})</div>
    </div>
  )
}
