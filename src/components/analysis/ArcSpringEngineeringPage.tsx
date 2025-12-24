"use client";

import React, { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Calculator, FileOutput, CheckCircle2 } from "lucide-react";
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
import { calculateArcSpringStress, toFactoryTorqueNm } from "@/lib/arcSpring/ArcSpringStress";

export function ArcSpringEngineeringPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // -- State for interactive elements that aren't in searchParams --
  const [assemblyFactor, setAssemblyFactor] = React.useState(4);
  const [stressBeta, setStressBeta] = React.useState(1.15);
  const [allowFactor, setAllowFactor] = React.useState(0.65);
  // Default Sy for Generic Spring Steel if not provided
  const [Sy, setSy] = React.useState(1600); 

  // -- Parse inputs from URL --
  const input = useMemo<ArcSpringInput>(() => {
    const getNum = (key: string, def: number) => {
      const v = searchParams.get(key);
      return v ? parseFloat(v) : def;
    };
    
    return {
      d: getNum("d", 3.7),
      D: getNum("D", 12.2),
      n: getNum("n", 50.3),
      r: getNum("r", 60),
      alpha0: getNum("alpha0", 127),
      alphaWork: getNum("alphaWork", 103),
      alphaLimit: getNum("alphaLimit", 103), // Same as work if not specified
      alphaC: getNum("alphaC", 10),
      countParallel: assemblyFactor, 
      materialKey: (searchParams.get("mat") as any) ?? "EN10270_2",
      samples: 100
    };
  }, [searchParams, assemblyFactor]);

  // -- Base Calculations (Stiffness) --
  const baseResult = useMemo(() => computeArcSpringCurve(input), [input]);

  // -- Stress Calculation (New Engineering Model) --
  const stressResult = useMemo(() => {
    // k_theta from math.ts is in Nmm/deg? 
    // computeArcSpringCurve returns R_deg in Nmm/deg.
    // Let's verify units from math.ts source.
    // R_deg = k * r^2 * (pi/180) * nParallel
    // This implies Total System stiffness if input.countParallel is used.
    
    // However, input.countParallel is passed to computeArcSpringCurve.
    // So R_deg IS total system stiffness.
    
    // We need to pass system stiffness to calculateArcSpringStress.
    // R_deg is Nmm/deg.
    // calculateArcSpringStress expects kTheta. Unit defaults "Nm" unless specified.
    // Let's pass Nmm and specify unit.
    
    return calculateArcSpringStress(
      { 
        d: input.d, 
        D: input.D // Pass Mean Diameter
      },
      { 
        Sy: Sy,
        allowFactor: allowFactor
      },
      {
        thetaFree: input.alpha0,
        thetaWork: input.alphaWork ?? input.alpha0,
        kTheta: baseResult.R_deg, // Nmm/deg
        kThetaUnit: "Nmm",
        parallelCount: input.countParallel,
        beta: stressBeta,
        rWork: input.r // Pass Working Radius
      }
    );
  }, [input, baseResult, Sy, allowFactor, stressBeta]);

  // -- Chart Data --
  const chartData = useMemo(() => {
    // Generate linear curve from 0 to Delta_Work + 10 deg
    const maxDelta = (stressResult.dThetaDeg || 10) * 1.2;
    const points = [];
    const steps = 20;
    for (let i = 0; i<=steps; i++) {
      const d = (maxDelta * i) / steps;
      // T_total = k * d
      const T_Nmm = stressResult.kTheta_Nmm_per_deg * d;
      const T_single_Nmm = T_Nmm / (input.countParallel || 1);
      
      // Re-calc stress for curve
      const sig = calculateArcSpringStress(
         { d: input.d }, 
         { Sy, allowFactor }, 
         { 
             thetaFree: input.alpha0, 
             thetaWork: input.alpha0 - d, // Current angle
             kTheta: baseResult.R_deg,
             kThetaUnit: "Nmm",
             parallelCount: input.countParallel,
             beta: stressBeta,
             rWork: input.r
         }
      ).sigmaMax_MPa;

      points.push({
        delta: d.toFixed(1),
        Torque: (T_Nmm / 1000).toFixed(1),
        Stress: sig.toFixed(0)
      });
    }
    return points;
  }, [stressResult, input, baseResult, Sy, allowFactor, stressBeta]);

  // -- Styling Helpers --
  const getStatusColor = (ratio: number) => {
    if (ratio > 100) return "bg-red-600";
    if (ratio > 85) return "bg-orange-500";
    return "bg-green-600";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Arc Spring Engineering Analysis</h1>
          <p className="text-muted-foreground">Engineering Grade Δθ–M–σ Model</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline">v2.0 Engineering</Badge>
            <Badge className={getStatusColor(stressResult.stressRatio_pct)}>
                Stress Ratio: {stressResult.stressRatio_pct.toFixed(1)}%
            </Badge>
        </div>
      </div>

      {/* Warnings */}
      {stressResult.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Computation Warnings</AlertTitle>
            <AlertDescription>
                {stressResult.warnings.map(w => <div key={w}>{w}</div>)}
            </AlertDescription>
          </Alert>
      )}

      <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN: INPUTS */}
          <div className="col-span-4 space-y-4">
              
              {/* Card A: Geometry */}
              <Card>
                  <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground">A. Geometry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                          <Label>Wire Diameter (d)</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.d} mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <Label>Mean Diameter (D)</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.D} mm</span>
                      </div>
                       <div className="flex justify-between items-center">
                          <Label>Working Radius (r)</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.r} mm</span>
                      </div>
                      <div className="pt-2 text-xs text-muted-foreground border-t flex justify-between">
                          <span>Z_ref ≈ {stressResult.Z_ref_mm3.toFixed(2)}</span>
                          <span className="font-bold text-slate-700">Z_eff ≈ {stressResult.Z_eff_mm3.toFixed(1)}</span>
                      </div>
                  </CardContent>
              </Card>

              {/* Card B: Loadcase */}
              <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground">B. Loadcase</CardTitle>
                  </CardHeader>
                   <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                          <Label>Free Angle (θ_free)</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.alpha0}°</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <Label>Work Angle (θ_work)</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.alphaWork}°</span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
                          <Label className="text-blue-700 font-bold">Used Travel (Δθ)</Label>
                          <span className="font-mono font-bold text-blue-700">{stressResult.dThetaDeg.toFixed(1)}°</span>
                      </div>
                  </CardContent>
              </Card>

              {/* Card C: System */}
              <Card>
                  <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground">C. System</CardTitle>
                  </CardHeader>
                   <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                          <Label>Assembly Factor (N)</Label>
                          <Select value={assemblyFactor.toString()} onValueChange={(v) => setAssemblyFactor(parseInt(v))}>
                              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="1">1 (Single)</SelectItem>
                                  <SelectItem value="2">2 (Pair)</SelectItem>
                                  <SelectItem value="4">4 (DMF Set)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="flex justify-between items-center">
                          <Label>Stress Beta (β)</Label>
                          <Select value={stressBeta.toString()} onValueChange={(v) => setStressBeta(parseFloat(v))}>
                              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="1.0">1.0 (None)</SelectItem>
                                  <SelectItem value="1.15">1.15 (Mild)</SelectItem>
                                  <SelectItem value="1.25">1.25 (Curved)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="pt-2 text-xs text-muted-foreground border-t">
                          System k_theta = {(stressResult.kTheta_Nmm_per_deg/1000).toFixed(2)} Nm/deg
                      </div>
                  </CardContent>
              </Card>

              {/* Card D: Material */}
              <Card>
                  <CardHeader className="pb-2">
                       <CardTitle className="text-sm font-bold uppercase text-muted-foreground">D. Material</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                          <Label>Yield Strength S_y</Label>
                          <div className="flex items-center gap-1">
                             <input type="number" 
                                className="w-16 h-8 text-right border rounded px-1 text-xs"
                                value={Sy} onChange={e => setSy(parseFloat(e.target.value))} 
                             />
                             <span className="text-xs text-muted-foreground">MPa</span>
                          </div>
                      </div>
                       <div className="flex justify-between items-center">
                          <Label>Allow Factor</Label>
                           <Select value={allowFactor.toString()} onValueChange={(v) => setAllowFactor(parseFloat(v))}>
                              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="0.6">0.60 (Consv)</SelectItem>
                                  <SelectItem value="0.65">0.65 (Std)</SelectItem>
                                  <SelectItem value="0.7">0.70 (Aggr)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="text-right text-xs text-green-600 font-medium">
                          σ_allow = {(Sy * allowFactor).toFixed(0)} MPa
                      </div>
                  </CardContent>
              </Card>

          </div>

          {/* RIGHT COLUMN: RESULTS & TOOLS */}
          <div className="col-span-8 space-y-6">
              
              {/* Card E: Results */}
              <Card>
                  <CardHeader>
                      <CardTitle>Results Summary</CardTitle>
                      <CardDescription>Incremental Bending Stress Analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="p-4 bg-slate-50 rounded border">
                              <div className="text-xs text-muted-foreground uppercase">Torsional Stiffness</div>
                              <div className="text-2xl font-bold mt-1">{(stressResult.kTheta_Nmm_per_deg / 1000).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">Nm/deg</div>
                              <div className="text-[10px] text-slate-400 mt-1">{stressResult.kTheta_Nmm_per_deg.toFixed(0)} Nmm/deg</div>
                          </div>
                           <div className="p-4 bg-slate-50 rounded border">
                              <div className="text-xs text-muted-foreground uppercase">Work Torque</div>
                              <div className="text-2xl font-bold mt-1">{(stressResult.T_total_Nmm / 1000).toFixed(1)}</div>
                              <div className="text-xs text-muted-foreground">Nm @ {stressResult.dThetaDeg.toFixed(1)}°</div>
                              <div className="text-[10px] text-slate-400 mt-1">{(stressResult.T_single_Nmm / 1000).toFixed(1)} Nm/strip</div>
                          </div>
                           <div className="p-4 bg-slate-50 rounded border">
                              <div className="text-xs text-muted-foreground uppercase">Max Stress</div>
                              <div className="text-2xl font-bold mt-1 text-slate-900">{stressResult.sigmaMax_MPa.toFixed(0)}</div>
                              <div className="text-xs text-muted-foreground">MPa</div>
                              <div className="text-[10px] text-slate-400 mt-1">Allow: {stressResult.sigmaAllow_MPa.toFixed(0)} MPa</div>
                          </div>
                           <div className={`p-4 rounded border text-white ${getStatusColor(stressResult.stressRatio_pct)}`}>
                              <div className="text-xs opacity-80 uppercase">Stress Ratio</div>
                              <div className="text-3xl font-bold mt-1">{stressResult.stressRatio_pct.toFixed(1)}%</div>
                              <div className="text-xs opacity-80">
                                  {stressResult.stressRatio_pct <= 100 ? "SAFE" : "FAIL"}
                              </div>
                          </div>
                      </div>

                      {/* Charts */}
                      <Tabs defaultValue="load" className="w-full">
                          <TabsList>
                              <TabsTrigger value="load">Torque – Angle</TabsTrigger>
                              <TabsTrigger value="stress">Stress – Angle</TabsTrigger>
                          </TabsList>
                          <TabsContent value="load" className="h-[300px] border rounded mt-2 p-4">
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                      <CartesianGrid strokeDasharray="3 3"/>
                                      <XAxis dataKey="delta" label={{ value: "Delta Angle (deg)", position: 'insideBottom', offset: -5 }}/>
                                      <YAxis label={{ value: "Torque (Nm)", angle: -90, position: 'insideLeft' }}/>
                                      <Tooltip />
                                      <Line type="monotone" dataKey="Torque" stroke="#2563eb" strokeWidth={3} dot={false} />
                                      <ReferenceLine x={stressResult.dThetaDeg} stroke="green" strokeDasharray="3 3" label="Work" />
                                  </LineChart>
                              </ResponsiveContainer>
                          </TabsContent>
                           <TabsContent value="stress" className="h-[300px] border rounded mt-2 p-4">
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                      <CartesianGrid strokeDasharray="3 3"/>
                                      <XAxis dataKey="delta" label={{ value: "Delta Angle (deg)", position: 'insideBottom', offset: -5 }}/>
                                      <YAxis label={{ value: "Stress (MPa)", angle: -90, position: 'insideLeft' }}/>
                                      <Tooltip />
                                      <Line type="monotone" dataKey="Stress" stroke="#dc2626" strokeWidth={3} dot={false} />
                                      <ReferenceLine y={stressResult.sigmaAllow_MPa} stroke="orange" strokeDasharray="3 3" label="Allow" />
                                      <ReferenceLine x={stressResult.dThetaDeg} stroke="green" strokeDasharray="3 3" label="Work" />
                                  </LineChart>
                              </ResponsiveContainer>
                          </TabsContent>
                      </Tabs>
                  </CardContent>
              </Card>

              {/* Card F: Tools */}
              <Card>
                  <CardHeader className="pb-2">
                       <CardTitle className="text-sm font-bold uppercase text-muted-foreground">F. Engineering Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                      <Button variant="outline" className="gap-2">
                          <FileOutput className="h-4 w-4"/> Export Report (PDF)
                      </Button>
                      <Button variant="outline" className="gap-2" disabled>
                          <Calculator className="h-4 w-4"/> FEA Verification (Coming Soon)
                      </Button>
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
}
