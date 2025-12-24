"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileOutput } from "lucide-react";
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

import { computeArcSpring, ARC_SPRING_FACTORY_POLICY, ArcSpringResults } from "@/lib/arcSpring/ArcSpringStress";

export function ArcSpringEngineeringPage() {
  const searchParams = useSearchParams();
  
  // -- State for interactive elements --
  const [assemblyFactor, setAssemblyFactor] = React.useState(4);
  const [Sy, setSy] = React.useState(1600); 

  // -- Parse inputs from URL --
  const input = useMemo(() => {
    const getNum = (key: string, def: number) => {
      const v = searchParams.get(key);
      return v ? parseFloat(v) : def;
    };
    
    return {
      d: getNum("d", 3.7),
      D: getNum("D", 12.2),
      n: getNum("n", 50.3), // active coils Na
      r: getNum("r", 60),
      alpha0: getNum("alpha0", 127),
      alphaWork: getNum("alphaWork", 103),
      countParallel: assemblyFactor
    };
  }, [searchParams, assemblyFactor]);

  // -- Engineering Calculation (Final Factory Model) --
  const engResult: ArcSpringResults = useMemo(() => {
    return computeArcSpring(
      { 
        d: input.d, 
        Dm: input.D, // Mean Diameter
        Na: input.n,
        r: input.r,
        nParallel: input.countParallel
      },
      {
        thetaFreeDeg: input.alpha0,
        thetaWorkDeg: input.alphaWork
      },
      { 
        id: "custom", 
        name: "Custom Steel", 
        G: 79000, 
        Sy: Sy 
      },
      ARC_SPRING_FACTORY_POLICY
    );
  }, [input, Sy]);

  // -- Status Color --
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
          <p className="text-muted-foreground">Factory Standard Audit Model (Helical Shear)</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline">v3.0 Final</Badge>
            <Badge className={getStatusColor(engResult.stressRatio_pct)}>
                Ratio: {engResult.stressRatio_pct.toFixed(1)}%
            </Badge>
        </div>
      </div>

      {/* Warnings */}
      {engResult.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Computation Warnings</AlertTitle>
            <AlertDescription>
                {engResult.warnings.map((w, i) => <div key={i}>{w.message}</div>)}
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
                          <Label>Active Coils (Na)</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.n}</span>
                      </div>
                       <div className="flex justify-between items-center">
                          <Label>Working Radius (r)</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.r} mm</span>
                      </div>
                      <div className="pt-2 text-xs text-muted-foreground border-t flex justify-between">
                          <span>Index C = {engResult.C.toFixed(2)}</span>
                          <span>Kw = {engResult.Kw.toFixed(3)}</span>
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
                          <Label>Free Angle</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.alpha0}°</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <Label>Work Angle</Label>
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded">{input.alphaWork}°</span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
                          <Label className="text-blue-700 font-bold">Used Travel (Δθ)</Label>
                          <span className="font-mono font-bold text-blue-700">{engResult.dThetaDeg.toFixed(1)}°</span>
                      </div>
                      {engResult.direction === "Extend" && (
                          <div className="text-[10px] text-orange-600 bg-orange-50 p-1 rounded border border-orange-200">
                             ⚠️ Reverse/Extend Load detected. (Work &gt; Free). Calculation shows magnitude.
                          </div>
                      )}
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
                      <div className="pt-2 text-xs text-muted-foreground border-t">
                          Total k_theta = {engResult.kThetaTotal_NmPerDeg.toFixed(2)} Nm/deg
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
                      <div className="text-right text-xs text-green-600 font-medium">
                          Allowable Shear = {engResult.tauAllow_MPa.toFixed(0)} MPa (0.65 Sy)
                      </div>
                  </CardContent>
              </Card>

          </div>

          {/* RIGHT COLUMN: RESULTS & TOOLS */}
          <div className="col-span-8 space-y-6">
              
              {/* Card E: Results */}
              <Card>
                  <CardHeader>
                      <CardTitle>Results Summary (Factory Model)</CardTitle>
                      <CardDescription>Primary Failure Mode: Helical Shear Stress</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="p-4 bg-slate-50 rounded border">
                              <div className="text-xs text-muted-foreground uppercase">Torsional Stiffness</div>
                              <div className="text-2xl font-bold mt-1">{engResult.kThetaTotal_NmPerDeg.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">Nm/deg</div>
                              <div className="text-[10px] text-slate-400 mt-1">{engResult.kThetaTotal_NmmPerDeg.toFixed(0)} Nmm/deg</div>
                          </div>
                           <div className="p-4 bg-slate-50 rounded border">
                              <div className="text-xs text-muted-foreground uppercase">Work Torque</div>
                              <div className="text-2xl font-bold mt-1">{engResult.TworkTotal_Nm.toFixed(1)}</div>
                              <div className="text-xs text-muted-foreground flex gap-1">
                                  <span>Nm @ {engResult.dThetaDeg.toFixed(1)}°</span>
                                  <span className={engResult.direction === "Compress" ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>
                                      ({engResult.direction})
                                  </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">{engResult.TworkPerStrip_Nm.toFixed(1)} Nm/strip</div>
                          </div>
                           <div className="p-4 bg-slate-50 rounded border">
                              <div className="text-xs text-muted-foreground uppercase">Max Shear Stress</div>
                              <div className="text-2xl font-bold mt-1 text-slate-900">{engResult.tauWork_MPa.toFixed(0)}</div>
                              <div className="text-xs text-muted-foreground">MPa (Wahl)</div>
                              <div className="text-[10px] text-slate-400 mt-1">Allow: {engResult.tauAllow_MPa.toFixed(0)} MPa</div>
                          </div>
                           <div className={`p-4 rounded border text-white ${getStatusColor(engResult.stressRatio_pct)}`}>
                              <div className="text-xs opacity-80 uppercase">Stress Ratio</div>
                              <div className="text-3xl font-bold mt-1">{engResult.stressRatio_pct.toFixed(1)}%</div>
                              <div className="text-xs opacity-80">
                                  SF = {engResult.safetyFactor.toFixed(2)}
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
                                  <LineChart data={engResult.curves.torqueAngle}>
                                      <CartesianGrid strokeDasharray="3 3"/>
                                      <XAxis dataKey="thetaDeg" label={{ value: "Angle (deg)", position: 'insideBottom', offset: -5 }} reversed/>
                                      <YAxis label={{ value: "Total Torque (Nm)", angle: -90, position: 'insideLeft' }}/>
                                      <Tooltip />
                                      <Line type="monotone" dataKey="torqueTotalNm" stroke="#2563eb" strokeWidth={3} dot={false} name="Torque (Total)" />
                                      <ReferenceLine x={input.alphaWork} stroke="green" strokeDasharray="3 3" label="Work" />
                                  </LineChart>
                              </ResponsiveContainer>
                          </TabsContent>
                           <TabsContent value="stress" className="h-[300px] border rounded mt-2 p-4">
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={engResult.curves.stressAngle}>
                                      <CartesianGrid strokeDasharray="3 3"/>
                                      <XAxis dataKey="thetaDeg" label={{ value: "Angle (deg)", position: 'insideBottom', offset: -5 }} reversed/>
                                      <YAxis label={{ value: "Shear Stress (MPa)", angle: -90, position: 'insideLeft' }}/>
                                      <Tooltip />
                                      <Line type="monotone" dataKey="tauMPa" stroke="#dc2626" strokeWidth={3} dot={false} name="Shear Stress" />
                                      <ReferenceLine y={engResult.tauAllow_MPa} stroke="orange" strokeDasharray="3 3" label="Allow" />
                                      <ReferenceLine x={input.alphaWork} stroke="green" strokeDasharray="3 3" label="Work" />
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
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
}
