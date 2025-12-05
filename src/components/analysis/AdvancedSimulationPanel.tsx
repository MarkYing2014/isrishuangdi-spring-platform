"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/language-context";

import type { SpringGeometry, CompressionSpringGeometry, WorkingConditions } from "@/lib/engine/types";
import {
  calculateNonlinearStress,
  calculateNonlinearFatigueLife,
  calculateNonlinearSafetyFactor,
} from "@/lib/engine/nonlinearMaterial";
import {
  calculateHeatTreatmentRecovery,
  calculateThermalCyclingFatigue,
  generateHeatTreatmentCurve,
} from "@/lib/engine/thermalEffects";
import {
  evaluateShockFatigue,
  parseShockLoadsCSV,
  generateRandomShockSequence,
  type ShockFatigueResult,
} from "@/lib/engine/shockFatigue";
import {
  calculateNVH,
  type NVHResult,
} from "@/lib/engine/nvhModel";
import {
  calculateCyclicCreep,
  type CyclicCreepResult,
} from "@/lib/engine/cyclicCreep";
import {
  calculateNonlinearBuckling,
  generateBucklingCurve,
  findCriticalDeflection,
  type NonlinearBucklingResult,
} from "@/lib/engine/nonlinearBuckling";
import {
  exportFEAMesh,
  downloadFEAMesh,
  type FEAExportFormat,
  type FEAMeshData,
} from "@/lib/engine/feaExport";

interface AdvancedSimulationPanelProps {
  geometry: SpringGeometry;
  springRate: number;
  maxStress: number;
  naturalFrequency: number;
  workingConditions: WorkingConditions;
}

export function AdvancedSimulationPanel({
  geometry,
  springRate,
  maxStress,
  naturalFrequency,
  workingConditions,
}: AdvancedSimulationPanelProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // State for various inputs
  const [soakTime, setSoakTime] = useState(2);
  const [soakTemp, setSoakTemp] = useState(250);
  const [minTemp, setMinTemp] = useState(20);
  const [maxTemp, setMaxTemp] = useState(150);
  const [shockCSV, setShockCSV] = useState("");
  const [operatingFreq, setOperatingFreq] = useState(10);
  const [operatingHours, setOperatingHours] = useState(5000);
  const [cyclesPerHour, setCyclesPerHour] = useState(100);
  const [feaFormat, setFeaFormat] = useState<FEAExportFormat>("abaqus");
  const [nodesPerCoil, setNodesPerCoil] = useState(36);

  // Nonlinear stress analysis
  const nonlinearResult = useMemo(() => {
    try {
      const stressResult = calculateNonlinearStress(maxStress, geometry.materialId);
      const fatigueResult = calculateNonlinearFatigueLife(
        maxStress,
        maxStress * 0.3,
        geometry.materialId
      );
      const safetyResult = calculateNonlinearSafetyFactor(maxStress, geometry.materialId);
      return { stressResult, fatigueResult, safetyResult };
    } catch {
      return null;
    }
  }, [maxStress, geometry.materialId]);

  // Heat treatment recovery
  const heatTreatmentResult = useMemo(() => {
    try {
      return calculateHeatTreatmentRecovery(springRate, soakTime, soakTemp, geometry.materialId);
    } catch {
      return null;
    }
  }, [springRate, soakTime, soakTemp, geometry.materialId]);

  // Thermal cycling fatigue
  const thermalCyclingResult = useMemo(() => {
    try {
      const strainAmplitude = maxStress / 207000; // Approximate
      return calculateThermalCyclingFatigue(geometry.materialId, minTemp, maxTemp, strainAmplitude);
    } catch {
      return null;
    }
  }, [geometry.materialId, minTemp, maxTemp, maxStress]);

  // Shock fatigue
  const [shockResult, setShockResult] = useState<ShockFatigueResult | null>(null);
  
  const runShockAnalysis = useCallback(() => {
    try {
      let loads;
      if (shockCSV.trim()) {
        loads = parseShockLoadsCSV(shockCSV);
      } else {
        loads = generateRandomShockSequence(springRate * 10, springRate * 3, 100);
      }
      
      const meanDiameter = 'meanDiameter' in geometry ? geometry.meanDiameter : 20;
      const result = evaluateShockFatigue(
        loads,
        geometry.wireDiameter,
        meanDiameter,
        geometry.materialId
      );
      setShockResult(result);
    } catch (error) {
      console.error("Shock analysis error:", error);
    }
  }, [shockCSV, geometry, springRate]);

  // NVH analysis
  const nvhResult = useMemo<NVHResult | null>(() => {
    if (geometry.type !== 'compression') return null;
    try {
      return calculateNVH(
        geometry,
        workingConditions.maxDeflection,
        springRate,
        naturalFrequency,
        operatingFreq
      );
    } catch {
      return null;
    }
  }, [geometry, workingConditions.maxDeflection, springRate, naturalFrequency, operatingFreq]);

  // Cyclic creep
  const cyclicCreepResult = useMemo<CyclicCreepResult | null>(() => {
    try {
      const freeLength = 'freeLength' in geometry ? (geometry as CompressionSpringGeometry).freeLength : 50;
      return calculateCyclicCreep(
        maxStress,
        maxStress * 0.3,
        (minTemp + maxTemp) / 2,
        operatingHours,
        cyclesPerHour,
        freeLength,
        geometry.materialId
      );
    } catch {
      return null;
    }
  }, [maxStress, minTemp, maxTemp, operatingHours, cyclesPerHour, geometry]);

  // Nonlinear buckling
  const bucklingResult = useMemo<NonlinearBucklingResult | null>(() => {
    if (geometry.type !== 'compression') return null;
    try {
      return calculateNonlinearBuckling(
        geometry as CompressionSpringGeometry,
        springRate,
        workingConditions.maxDeflection,
        79300 // Shear modulus
      );
    } catch {
      return null;
    }
  }, [geometry, springRate, workingConditions.maxDeflection]);

  // FEA mesh preview
  const [meshPreview, setMeshPreview] = useState<FEAMeshData | null>(null);
  
  const generateMeshPreview = useCallback(() => {
    try {
      const { mesh } = exportFEAMesh(geometry, feaFormat, { nodesPerCoil });
      setMeshPreview(mesh);
    } catch (error) {
      console.error("Mesh generation error:", error);
    }
  }, [geometry, feaFormat, nodesPerCoil]);

  const handleDownloadFEA = useCallback(() => {
    downloadFEAMesh(geometry, feaFormat, { nodesPerCoil });
  }, [geometry, feaFormat, nodesPerCoil]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isZh ? "高级仿真分析" : "Advanced Simulation Analysis"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="nonlinear" className="w-full">
          <TabsList className="grid w-full grid-cols-6 text-xs">
            <TabsTrigger value="nonlinear">{isZh ? "非线性" : "Nonlinear"}</TabsTrigger>
            <TabsTrigger value="thermal">{isZh ? "热效应" : "Thermal"}</TabsTrigger>
            <TabsTrigger value="shock">{isZh ? "冲击" : "Shock"}</TabsTrigger>
            <TabsTrigger value="nvh">NVH</TabsTrigger>
            <TabsTrigger value="creep">{isZh ? "蠕变" : "Creep"}</TabsTrigger>
            <TabsTrigger value="fea">FEA</TabsTrigger>
          </TabsList>

          {/* Nonlinear Material Tab */}
          <TabsContent value="nonlinear" className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <h4 className="font-medium mb-2">{isZh ? "Ramberg-Osgood 非线性分析" : "Ramberg-Osgood Nonlinear Analysis"}</h4>
              <p className="text-sm text-muted-foreground">
                ε = σ/E + K×(σ)^n
              </p>
            </div>
            
            {nonlinearResult && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">{isZh ? "应力分析" : "Stress Analysis"}</h5>
                  <div className="rounded-lg border p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{isZh ? "线性应力" : "Linear Stress"}</span>
                      <span className="font-mono">{nonlinearResult.stressResult.linearStress.toFixed(1)} MPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "非线性应力" : "Nonlinear Stress"}</span>
                      <span className={`font-mono ${nonlinearResult.stressResult.isNonlinear ? "text-orange-600" : ""}`}>
                        {nonlinearResult.stressResult.nonlinearStress.toFixed(1)} MPa
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "塑性应变" : "Plastic Strain"}</span>
                      <span className="font-mono">{(nonlinearResult.stressResult.plasticStrain * 100).toFixed(4)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "非线性区域" : "Nonlinear Region"}</span>
                      <span className={nonlinearResult.stressResult.isNonlinear ? "text-orange-600" : "text-green-600"}>
                        {nonlinearResult.stressResult.isNonlinear ? (isZh ? "是" : "Yes") : (isZh ? "否" : "No")}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">{isZh ? "疲劳与安全" : "Fatigue & Safety"}</h5>
                  <div className="rounded-lg border p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{isZh ? "线性寿命" : "Linear Life"}</span>
                      <span className="font-mono">{nonlinearResult.fatigueResult.linearLife.toExponential(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "非线性寿命" : "Nonlinear Life"}</span>
                      <span className="font-mono">{nonlinearResult.fatigueResult.nonlinearLife.toExponential(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "线性安全系数" : "Linear SF"}</span>
                      <span className="font-mono">{nonlinearResult.safetyResult.linearSF.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "非线性安全系数" : "Nonlinear SF"}</span>
                      <span className="font-mono">{nonlinearResult.safetyResult.nonlinearSF.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Thermal Effects Tab */}
          <TabsContent value="thermal" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h5 className="text-sm font-medium">{isZh ? "热处理恢复" : "Heat Treatment Recovery"}</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{isZh ? "浸泡时间 (h)" : "Soak Time (h)"}</Label>
                    <Input type="number" value={soakTime} onChange={e => setSoakTime(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">{isZh ? "浸泡温度 (°C)" : "Soak Temp (°C)"}</Label>
                    <Input type="number" value={soakTemp} onChange={e => setSoakTemp(Number(e.target.value))} />
                  </div>
                </div>
                {heatTreatmentResult && (
                  <div className="rounded-lg border p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{isZh ? "恢复百分比" : "Recovery %"}</span>
                      <span className="font-mono text-green-600">+{heatTreatmentResult.recoveryPercent.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "恢复刚度" : "Recovered k"}</span>
                      <span className="font-mono">{heatTreatmentResult.recoveredStiffness.toFixed(2)} N/mm</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <h5 className="text-sm font-medium">{isZh ? "温度循环疲劳" : "Thermal Cycling Fatigue"}</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{isZh ? "最低温度 (°C)" : "Min Temp (°C)"}</Label>
                    <Input type="number" value={minTemp} onChange={e => setMinTemp(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">{isZh ? "最高温度 (°C)" : "Max Temp (°C)"}</Label>
                    <Input type="number" value={maxTemp} onChange={e => setMaxTemp(Number(e.target.value))} />
                  </div>
                </div>
                {thermalCyclingResult && (
                  <div className="rounded-lg border p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>ΔT</span>
                      <span className="font-mono">{thermalCyclingResult.deltaT}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "热应变范围" : "Thermal Strain"}</span>
                      <span className="font-mono">{(thermalCyclingResult.thermalStrainRange * 1e6).toFixed(1)} µε</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "寿命降低" : "Life Reduction"}</span>
                      <span className={`font-mono ${thermalCyclingResult.lifeReductionFactor < 0.5 ? "text-red-600" : ""}`}>
                        {(thermalCyclingResult.lifeReductionFactor * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isZh ? "风险等级" : "Risk Level"}</span>
                      <span className={`font-bold ${
                        thermalCyclingResult.riskLevel === 'critical' ? 'text-red-600' :
                        thermalCyclingResult.riskLevel === 'high' ? 'text-orange-600' :
                        thermalCyclingResult.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {thermalCyclingResult.riskLevel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Shock Fatigue Tab */}
          <TabsContent value="shock" className="space-y-4">
            <div className="space-y-3">
              <Label>{isZh ? "冲击载荷数据 (CSV: 每行一个力值)" : "Shock Load Data (CSV: one force per line)"}</Label>
              <Textarea
                placeholder="100&#10;150&#10;120&#10;..."
                value={shockCSV}
                onChange={e => setShockCSV(e.target.value)}
                rows={4}
              />
              <Button onClick={runShockAnalysis}>
                {isZh ? "运行冲击分析" : "Run Shock Analysis"}
              </Button>
            </div>
            
            {shockResult && (
              <div className={`rounded-lg p-4 ${
                shockResult.status === 'pass' ? 'bg-green-100' :
                shockResult.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <div className="font-bold mb-2">
                  {isZh ? shockResult.message.zh : shockResult.message.en}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isZh ? "冲击次数" : "Shock Count"}</span>
                    <div className="font-mono">{shockResult.shockCount}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "总损伤" : "Total Damage"}</span>
                    <div className="font-mono">{shockResult.totalDamage.toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "最大应力" : "Max Stress"}</span>
                    <div className="font-mono">{shockResult.maxStress.toFixed(0)} MPa</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* NVH Tab */}
          <TabsContent value="nvh" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{isZh ? "工作频率 (Hz)" : "Operating Frequency (Hz)"}</Label>
                <Input type="number" value={operatingFreq} onChange={e => setOperatingFreq(Number(e.target.value))} />
              </div>
            </div>
            
            {nvhResult && (
              <div className={`rounded-lg p-4 ${
                nvhResult.riskLevel === 'low' ? 'bg-green-100' :
                nvhResult.riskLevel === 'medium' ? 'bg-yellow-100' :
                nvhResult.riskLevel === 'high' ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                <div className="font-bold mb-2">
                  {isZh ? nvhResult.message.zh : nvhResult.message.en}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isZh ? "预估噪声" : "Est. Noise"}</span>
                    <div className="font-mono text-xl">{nvhResult.estimatedNoiseLevel.toFixed(0)} dB</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "谐波尖叫风险" : "Squeal Risk"}</span>
                    <div className={`font-bold ${
                      nvhResult.harmonicSquealRisk === 'high' ? 'text-red-600' :
                      nvhResult.harmonicSquealRisk === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {nvhResult.harmonicSquealRisk.toUpperCase()}
                    </div>
                  </div>
                </div>
                {nvhResult.recommendations.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm font-medium">{isZh ? "建议" : "Recommendations"}:</span>
                    <ul className="text-sm list-disc list-inside mt-1">
                      {nvhResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Cyclic Creep Tab */}
          <TabsContent value="creep" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">{isZh ? "运行时间 (h)" : "Operating Hours"}</Label>
                <Input type="number" value={operatingHours} onChange={e => setOperatingHours(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">{isZh ? "每小时循环数" : "Cycles/Hour"}</Label>
                <Input type="number" value={cyclesPerHour} onChange={e => setCyclesPerHour(Number(e.target.value))} />
              </div>
            </div>
            
            {cyclicCreepResult && (
              <div className={`rounded-lg p-4 ${
                cyclicCreepResult.riskLevel === 'low' ? 'bg-green-100' :
                cyclicCreepResult.riskLevel === 'medium' ? 'bg-yellow-100' :
                cyclicCreepResult.riskLevel === 'high' ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                <div className="font-bold mb-2">
                  {isZh ? cyclicCreepResult.message.zh : cyclicCreepResult.message.en}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isZh ? "蠕变应变" : "Creep Strain"}</span>
                    <div className="font-mono">{(cyclicCreepResult.totalCreepStrain * 100).toFixed(4)}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "尺寸漂移" : "Dimensional Drift"}</span>
                    <div className="font-mono">{cyclicCreepResult.dimensionalDrift.toFixed(3)} mm</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "维护间隔" : "Maintenance Interval"}</span>
                    <div className="font-mono">{cyclicCreepResult.maintenanceInterval.toFixed(0)} h</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "稳定性评分" : "Stability Rating"}</span>
                    <div className="font-mono">{cyclicCreepResult.stabilityRating}/100</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* FEA Export Tab */}
          <TabsContent value="fea" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">{isZh ? "导出格式" : "Export Format"}</Label>
                <Select value={feaFormat} onValueChange={(v) => setFeaFormat(v as FEAExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abaqus">Abaqus (.inp)</SelectItem>
                    <SelectItem value="ansys">ANSYS (.ans)</SelectItem>
                    <SelectItem value="nastran">NASTRAN (.bdf)</SelectItem>
                    <SelectItem value="step">STEP (.step)</SelectItem>
                    <SelectItem value="iges">IGES (.igs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isZh ? "每圈节点数" : "Nodes per Coil"}</Label>
                <Input type="number" value={nodesPerCoil} onChange={e => setNodesPerCoil(Number(e.target.value))} />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={generateMeshPreview}>
                {isZh ? "预览网格" : "Preview Mesh"}
              </Button>
              <Button onClick={handleDownloadFEA}>
                {isZh ? "下载 FEA 文件" : "Download FEA File"}
              </Button>
            </div>
            
            {meshPreview && (
              <div className="rounded-lg border p-4 space-y-2">
                <h5 className="font-medium">{isZh ? "网格预览" : "Mesh Preview"}</h5>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isZh ? "节点数" : "Nodes"}</span>
                    <div className="font-mono text-lg">{meshPreview.nodeCount}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "单元数" : "Elements"}</span>
                    <div className="font-mono text-lg">{meshPreview.elementCount}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "线长" : "Wire Length"}</span>
                    <div className="font-mono text-lg">{meshPreview.wireLength.toFixed(1)} mm</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {isZh ? "网格质量" : "Mesh Quality"}: 
                  {isZh ? "最小单元" : "Min"}: {meshPreview.quality.minElementLength.toFixed(2)}mm, 
                  {isZh ? "最大单元" : "Max"}: {meshPreview.quality.maxElementLength.toFixed(2)}mm, 
                  {isZh ? "长宽比" : "Aspect"}: {meshPreview.quality.aspectRatio.toFixed(2)}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
