"use client";

import { useMemo } from "react";
import { FileText, Printer } from "lucide-react";

import {
  calculateVariablePitchCompressionAtDeflection,
  generateVariablePitchForceDeflectionCurve,
  invertVariablePitchCompressionForce,
  type VariablePitchSegment,
} from "@/lib/springMath";
import {
  getSpringMaterial,
  getDefaultSpringMaterial,
  type SpringMaterial,
} from "@/lib/materials/springMaterials";

import { useVariablePitchCompressionStore } from "@/lib/stores/variablePitchCompressionStore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { MaterialSelector } from "@/components/calculators/MaterialSelector";

import {
  VariablePitchCurvesChart,
  type VariablePitchCurveMode,
} from "@/components/charts/VariablePitchCurvesChart";

import { mapToVariablePitchCompressionReportPayload } from "@/lib/reports/variablePitchCompressionReport";
import {
  downloadVariablePitchCompressionPDF,
  printVariablePitchCompressionReport,
} from "@/lib/reports/variablePitchCompressionReportGenerator";

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function VariablePitchCompressionCalculator() {
  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  const wireDiameter = useVariablePitchCompressionStore((s) => s.wireDiameter);
  const meanDiameter = useVariablePitchCompressionStore((s) => s.meanDiameter);
  const shearModulus = useVariablePitchCompressionStore((s) => s.shearModulus);
  const activeCoils0 = useVariablePitchCompressionStore((s) => s.activeCoils0);
  const totalCoils = useVariablePitchCompressionStore((s) => s.totalCoils);
  const freeLength = useVariablePitchCompressionStore((s) => s.freeLength);
  const materialId = useVariablePitchCompressionStore((s) => s.materialId);
  const segments = useVariablePitchCompressionStore((s) => s.segments);
  const mode = useVariablePitchCompressionStore((s) => s.mode);
  const deflection = useVariablePitchCompressionStore((s) => s.deflection);
  const load = useVariablePitchCompressionStore((s) => s.load);
  const chartModeStore = useVariablePitchCompressionStore((s) => s.chartMode);
  const workingPoints = useVariablePitchCompressionStore((s) => s.workingPoints);

  const setWireDiameter = useVariablePitchCompressionStore((s) => s.setWireDiameter);
  const setMeanDiameter = useVariablePitchCompressionStore((s) => s.setMeanDiameter);
  const setShearModulus = useVariablePitchCompressionStore((s) => s.setShearModulus);
  const setActiveCoils0 = useVariablePitchCompressionStore((s) => s.setActiveCoils0);
  const setTotalCoils = useVariablePitchCompressionStore((s) => s.setTotalCoils);
  const setFreeLength = useVariablePitchCompressionStore((s) => s.setFreeLength);
  const setMaterialId = useVariablePitchCompressionStore((s) => s.setMaterialId);
  const setMode = useVariablePitchCompressionStore((s) => s.setMode);
  const setDeflection = useVariablePitchCompressionStore((s) => s.setDeflection);
  const setLoad = useVariablePitchCompressionStore((s) => s.setLoad);
  const setChartMode = useVariablePitchCompressionStore((s) => s.setChartMode);
  const setSegmentValue = useVariablePitchCompressionStore((s) => s.setSegmentValue);
  const addSegment = useVariablePitchCompressionStore((s) => s.addSegment);
  const removeSegment = useVariablePitchCompressionStore((s) => s.removeSegment);
  const addWorkingPoint = useVariablePitchCompressionStore((s) => s.addWorkingPoint);
  const setWorkingPoint = useVariablePitchCompressionStore((s) => s.setWorkingPoint);
  const removeWorkingPoint = useVariablePitchCompressionStore((s) => s.removeWorkingPoint);

  const selectedMaterial: SpringMaterial = useMemo(() => {
    return (materialId ? getSpringMaterial(materialId) : undefined) ?? getDefaultSpringMaterial();
  }, [materialId]);

  const handleMaterialChange = (material: SpringMaterial) => {
    setMaterialId(material.id);
    setShearModulus(material.shearModulus);
  };

  const variablePitchBase = useMemo(() => {
    return {
      wireDiameter,
      meanDiameter,
      shearModulus,
      activeCoils0,
      totalCoils,
      freeLength,
      segments,
    };
  }, [wireDiameter, meanDiameter, shearModulus, activeCoils0, totalCoils, freeLength, segments]);

  const computedDeflection = useMemo(() => {
    if (mode !== "load") return undefined;
    const inv = invertVariablePitchCompressionForce({
      ...variablePitchBase,
      load,
    });
    return inv.deflection;
  }, [variablePitchBase, load, mode]);

  const deflectionUsed = mode === "load" ? computedDeflection ?? 0 : deflection;

  const result = useMemo(() => {
    return calculateVariablePitchCompressionAtDeflection({
      ...variablePitchBase,
      deflection: deflectionUsed,
    });
  }, [variablePitchBase, deflectionUsed]);

  const chartData = useMemo(() => {
    const maxDeflection =
      result.deltaMax !== undefined ? result.deltaMax : Math.max(1, deflectionUsed * 1.3);
    const step = Math.max(0.2, maxDeflection / 40);
    return generateVariablePitchForceDeflectionCurve({
      ...variablePitchBase,
      maxDeflection,
      step,
    });
  }, [variablePitchBase, deflectionUsed, result.deltaMax]);

  const coilsSum = useMemo(() => {
    return segments.reduce((acc, s) => acc + (isFinite(s.coils) ? s.coils : 0), 0);
  }, [segments]);

  const coilsMismatch =
    isFinite(activeCoils0) && Math.abs(coilsSum - activeCoils0) > 1e-6;

  const issues = useMemo(() => {
    const set = new Set<string>();
    for (const msg of result.issues) set.add(msg);
    if (mode === "load") {
      const inv = invertVariablePitchCompressionForce({
        ...variablePitchBase,
        load,
      });
      for (const msg of inv.issues) set.add(msg);
    }
    return Array.from(set);
  }, [result.issues, mode, variablePitchBase, load]);

  const eventMarkers = useMemo(() => {
    const d = wireDiameter;
    const sorted = segments
      .map((s, idx) => ({ idx, coils: s.coils, pitch: s.pitch }))
      .filter((s) => isFinite(s.coils) && isFinite(s.pitch) && s.coils > 0)
      .sort((a, b) => a.pitch - b.pitch);

    let cum = 0;
    const markers: Array<{ deflection: number; label: string; color?: string }> = [];
    let stage = 1;

    for (const s of sorted) {
      const spacing = s.pitch - d;
      if (!(spacing > 0)) continue;
      const cap = s.coils * spacing;
      if (!(cap > 0)) continue;
      cum += cap;
      markers.push({
        deflection: Number(cum.toFixed(6)),
        label: `S${stage}`,
        color: "#94a3b8",
      });
      stage += 1;
    }

    return markers;
  }, [wireDiameter, segments]);

  const checkRows = useMemo(() => {
    const tauAllow = selectedMaterial.allowShearStatic;
    const deltaMax = result.deltaMax;

    const points = workingPoints
      .map((x) => Number(x))
      .filter((x) => isFinite(x) && x >= 0)
      .sort((a, b) => a - b);

    return points.map((dx) => {
      const res = calculateVariablePitchCompressionAtDeflection({
        ...variablePitchBase,
        deflection: dx,
      });

      const sf = res.shearStress > 0 ? tauAllow / res.shearStress : Infinity;
      const overSolid = deltaMax !== undefined ? dx > deltaMax + 1e-9 : false;

      let status: "PASS" | "WARN" | "FAIL" = "PASS";
      if (overSolid || sf < 1) status = "FAIL";
      else if (sf < 1.2) status = "WARN";

      return {
        deflection: dx,
        load: res.load,
        springRate: res.springRate,
        shearStress: res.shearStress,
        sf,
        overSolid,
        status,
      };
    });
  }, [selectedMaterial.allowShearStatic, result.deltaMax, workingPoints, variablePitchBase]);

  const reportPayload = useMemo(() => {
    const curve = (chartData ?? []).map((p) => ({
      deflection: p.deflection,
      load: p.load,
      springRate: p.springRate,
      shearStress: p.shearStress,
      activeCoils: p.activeCoils,
    }));

    return mapToVariablePitchCompressionReportPayload({
      spring: {
        wireDiameter,
        meanDiameter,
        freeLength,
        totalCoils,
        activeCoils0,
        shearModulus,
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.nameEn,
      },
      segments,
      curve,
      workingPoint: {
        segmentStates: result.segmentStates,
        springIndex: result.springIndex,
        wahlFactor: result.wahlFactor,
        deltaMax: result.deltaMax,
        issues: result.issues,
      },
    });
  }, [
    chartData,
    wireDiameter,
    meanDiameter,
    freeLength,
    totalCoils,
    activeCoils0,
    shearModulus,
    selectedMaterial.id,
    selectedMaterial.nameEn,
    segments,
    result.segmentStates,
    result.springIndex,
    result.wahlFactor,
    result.deltaMax,
    result.issues,
  ]);

  const chartMode = chartModeStore as VariablePitchCurveMode;

  const setSegment = (index: number, patch: Partial<VariablePitchSegment>) => {
    setSegmentValue(index, patch);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Variable Pitch Compression Spring / 变节距压缩弹簧</CardTitle>
          <p className="text-xs text-muted-foreground">
            Progressive rate via coil-to-coil contact (engineering approximation)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="space-y-2">
                <MaterialSelector
                  value={selectedMaterial.id}
                  onChange={handleMaterialChange}
                  showDetails={true}
                />
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Wire Diameter d (mm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={wireDiameter}
                      onChange={(e) => setWireDiameter(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Mean Diameter Dm (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={meanDiameter}
                      onChange={(e) => setMeanDiameter(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Active Coils Na0</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={activeCoils0}
                      onChange={(e) => setActiveCoils0(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Total Coils Nt</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={totalCoils}
                      onChange={(e) => setTotalCoils(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Shear Modulus G (MPa)</Label>
                    <Input
                      type="number"
                      step="100"
                      min="0"
                      value={shearModulus}
                      onChange={(e) => setShearModulus(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Free Length L0 (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={freeLength ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFreeLength(v === "" ? undefined : parseFloat(v) || 0);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Segments / 节距分段</Label>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Coils Ni</TableHead>
                        <TableHead className="w-[180px]">Pitch pi (mm)</TableHead>
                        <TableHead>Quick check</TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.map((seg, idx) => {
                        const gap = seg.pitch - wireDiameter;
                        const okPitch = gap > 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                value={seg.coils}
                                onChange={(e) =>
                                  setSegment(idx, {
                                    coils: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={seg.pitch}
                                onChange={(e) =>
                                  setSegment(idx, {
                                    pitch: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-xs">
                              {okPitch ? (
                                <span className="text-emerald-700">pitch &gt; d (bindable)</span>
                              ) : (
                                <span className="text-amber-700">pitch ≤ d (solid)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeSegment(idx)}
                                disabled={segments.length <= 1}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Na0 = {formatNumber(activeCoils0)} (Nt={formatNumber(totalCoils)})
                  </p>
                  <Button type="button" variant="outline" onClick={addSegment}>
                    Add segment
                  </Button>
                </div>

                {coilsMismatch && (
                  <Alert>
                    <AlertTitle>Coils mismatch</AlertTitle>
                    <AlertDescription>
                      Segment coils sum = <b>{formatNumber(coilsSum)}</b>, but Na0 = <b>{formatNumber(activeCoils0)}</b>.
                      Provide <b>Free Length</b> to auto-fill remaining coils, or adjust segments.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label>Working condition / 工况</Label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                  <TabsList className="w-fit">
                    <TabsTrigger value="deflection">By deflection</TabsTrigger>
                    <TabsTrigger value="load">By load</TabsTrigger>
                  </TabsList>
                  <TabsContent value="deflection" className="mt-3 space-y-2">
                    <Label>Deflection Δx (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={deflection}
                      onChange={(e) => setDeflection(parseFloat(e.target.value) || 0)}
                    />
                  </TabsContent>
                  <TabsContent value="load" className="mt-3 space-y-2">
                    <Label>Load F (N)</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={load}
                      onChange={(e) => setLoad(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Solved deflection: {formatNumber(computedDeflection ?? 0)} mm
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Working points Δx (mm) / 多工况点</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addWorkingPoint(deflectionUsed)}
                  >
                    Add point
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Δx (mm)</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workingPoints.map((dx, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={dx}
                              onChange={(e) =>
                                setWorkingPoint(idx, parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            τ_allow = {selectedMaterial.allowShearStatic} MPa
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeWorkingPoint(idx)}
                              disabled={workingPoints.length <= 1}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {issues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Issues</AlertTitle>
                  <AlertDescription>
                    <div className="mt-1 space-y-1 text-xs">
                      {issues.map((m, i) => (
                        <div key={i}>{m}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printVariablePitchCompressionReport(reportPayload)}
                  disabled={issues.length > 0}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print Report
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadVariablePitchCompressionPDF(reportPayload)}
                  disabled={issues.length > 0}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Export PDF
                </Button>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <ResultRow label="Active coils Na(Δx) / 活圈" value={formatNumber(result.activeCoils)} />
                <ResultRow label="Spring rate k(Δx) (N/mm) / 刚度" value={formatNumber(result.springRate)} />
                <ResultRow label="Load F(Δx) (N) / 载荷" value={formatNumber(result.load)} />
                <ResultRow label="Shear stress τ (MPa) / 剪应力" value={formatNumber(result.shearStress)} />
                <ResultRow label="τ_allow (MPa) / 许用" value={formatNumber(selectedMaterial.allowShearStatic)} />
              </div>

              <div className="space-y-2">
                <Label>Multi-point check / 多工况校核</Label>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Δx</TableHead>
                        <TableHead>F (N)</TableHead>
                        <TableHead>k (N/mm)</TableHead>
                        <TableHead>τ (MPa)</TableHead>
                        <TableHead>SF</TableHead>
                        <TableHead className="w-[110px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkRows.map((r) => (
                        <TableRow key={r.deflection}>
                          <TableCell>{formatNumber(r.deflection)}</TableCell>
                          <TableCell>{formatNumber(r.load)}</TableCell>
                          <TableCell>{formatNumber(r.springRate)}</TableCell>
                          <TableCell>{formatNumber(r.shearStress)}</TableCell>
                          <TableCell>{Number.isFinite(r.sf) ? formatNumber(r.sf) : "∞"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                r.status === "PASS"
                                  ? "bg-green-500 text-white"
                                  : r.status === "WARN"
                                    ? "bg-amber-500 text-white"
                                    : "bg-red-500 text-white"
                              }
                            >
                              {r.status}
                            </Badge>
                            {r.overSolid && (
                              <span className="ml-2 text-xs text-red-600">SOLID</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Solid / coil contact state</Label>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>#</span>
                    <span>Pitch</span>
                    <span className="text-right">Solid</span>
                  </div>
                  <div className="space-y-1 p-3 text-xs">
                    {result.segmentStates.map((st) => (
                      <div key={st.index} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                        <span className="w-6 text-muted-foreground">{st.index + 1}</span>
                        <span>
                          p={formatNumber(st.pitch)} mm, Ni={formatNumber(st.coils)}
                        </span>
                        <span className="text-right">
                          {formatNumber(st.solidCoils)} / {formatNumber(st.coils)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Curves / 曲线</Label>
                <Tabs
                  value={chartMode}
                  onValueChange={(v) => setChartMode(v as any)}
                >
                  <TabsList className="w-fit flex-wrap">
                    <TabsTrigger value="force">F-Δx</TabsTrigger>
                    <TabsTrigger value="stiffness">k-Δx</TabsTrigger>
                    <TabsTrigger value="stress">τ-Δx</TabsTrigger>
                    <TabsTrigger value="overlay_force_stress">F+τ</TabsTrigger>
                    <TabsTrigger value="overlay_force_stiffness">F+k</TabsTrigger>
                  </TabsList>
                  <TabsContent value={chartMode} className="mt-3">
                    <div className="h-[340px] rounded-md border bg-background p-3">
                      <VariablePitchCurvesChart data={chartData} mode={chartMode} markers={eventMarkers} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VariablePitchCompressionCalculator;
