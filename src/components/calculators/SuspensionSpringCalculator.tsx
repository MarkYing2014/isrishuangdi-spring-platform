"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SuspensionSpringVisualizer } from "@/components/three/SuspensionSpringVisualizer";
import { buildPipelineUrl } from "@/lib/pipeline/springPipelines";
import {
  calculateSuspensionSpring,
  calculateStressRatioAtDeflection,
  checkSuspensionSpringDesignRules,
  getOverallStatus,
  SUSPENSION_SPRING_MATERIAL_PRESETS,
  type SuspensionSpringInput,
  type EndType,
} from "@/lib/suspensionSpring";
import type { PitchMode, DiameterMode } from "@/lib/springTypes";

type LoadcaseMode = "preload" | "ride" | "bump";

export function SuspensionSpringCalculator() {
  const [wireDiameter, setWireDiameter] = useState(12);
  const [od, setOd] = useState(100);
  const [activeCoils, setActiveCoils] = useState(6);
  const [freeLength, setFreeLength] = useState(300);
  const [endType, setEndType] = useState<EndType>("closed_ground");

  const [holeDiameter, setHoleDiameter] = useState<number | undefined>(undefined);
  const [rodDiameter, setRodDiameter] = useState<number | undefined>(undefined);

  const [materialPreset, setMaterialPreset] = useState(SUSPENSION_SPRING_MATERIAL_PRESETS[0].name);
  const material = SUSPENSION_SPRING_MATERIAL_PRESETS.find((m) => m.name === materialPreset) || SUSPENSION_SPRING_MATERIAL_PRESETS[0];

  const [preloadN, setPreloadN] = useState(500);
  const [rideLoadN, setRideLoadN] = useState(2000);
  const [bumpTravel, setBumpTravel] = useState(80);
  const [solidMargin, setSolidMargin] = useState(3);

  const [cornerMass, setCornerMass] = useState<number | undefined>(undefined);
  const [motionRatio, setMotionRatio] = useState(1);
  const [targetFreq, setTargetFreq] = useState<number | undefined>(undefined);

  const [dynamicsOpen, setDynamicsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [progressiveOpen, setProgressiveOpen] = useState(false);
  const [variableDiameterOpen, setVariableDiameterOpen] = useState(false);

  // Advanced Geometry State
  const [pitchMode, setPitchMode] = useState<PitchMode>("uniform");
  const [pitchCenter, setPitchCenter] = useState<number>(0); // 0 means auto
  const [pitchEnd, setPitchEnd] = useState<number>(0); 
  const [endClosedTurns, setEndClosedTurns] = useState<number>(1);
  const [transitionTurns, setTransitionTurns] = useState<number>(0.75);
  const [groundTurnsPerEnd, setGroundTurnsPerEnd] = useState<number>(0.5);

  const [diameterMode, setDiameterMode] = useState<DiameterMode>("constant");
  const [dmStart, setDmStart] = useState<number>(0);
  const [dmMid, setDmMid] = useState<number>(0);
  const [dmEnd, setDmEnd] = useState<number>(0);

  // Init/Update defaults
  React.useEffect(() => {
    // Only set if 0 (uninitialized)
    const currentMean = od - wireDiameter;
    if (dmStart === 0) setDmStart(currentMean);
    if (dmMid === 0) setDmMid(currentMean * 1.1); // slightly barrel by default
    if (dmEnd === 0) setDmEnd(currentMean);
    
    // Auto pitch estimation
    // if pitchCenter is 0
  }, [od, wireDiameter]);

  const [currentDeflection, setCurrentDeflection] = useState(0);
  const [loadcaseMode, setLoadcaseMode] = useState<LoadcaseMode>("ride");

  const meanDiameter = od - wireDiameter;
  const totalCoils = activeCoils + 2;

  const input: SuspensionSpringInput = useMemo(
    () => ({
      geometry: {
        od_mm: od,
        wireDiameter_mm: wireDiameter,
        activeCoils_Na: activeCoils,
        totalCoils_Nt: totalCoils,
        freeLength_Hf_mm: freeLength,
        endType,
        guide: {
          holeDiameter_mm: holeDiameter,
          rodDiameter_mm: rodDiameter,
        },
      },
      material: {
        shearModulus_G_MPa: material.shearModulus_G_MPa,
        yieldStrength_MPa: material.yieldStrength_MPa,
        fatigueLimit_MPa: material.fatigueLimit_MPa,
        preset: material.name,
      },
      loadcase: {
        preload_N: preloadN,
        rideLoad_N: rideLoadN,
        bumpTravel_mm: bumpTravel,
        solidMargin_mm: solidMargin,
        cornerMass_kg: cornerMass,
        motionRatio,
        targetFreq_Hz: targetFreq,
      },
    }),
    [
      od,
      wireDiameter,
      activeCoils,
      totalCoils,
      freeLength,
      endType,
      holeDiameter,
      rodDiameter,
      material,
      preloadN,
      rideLoadN,
      bumpTravel,
      solidMargin,
      cornerMass,
      motionRatio,
      targetFreq,
    ]
  );

  const result = useMemo(() => calculateSuspensionSpring(input), [input]);
  const findings = useMemo(
    () => (result.errors.length === 0 ? checkSuspensionSpringDesignRules(input, result) : []),
    [input, result]
  );
  const overallStatus = getOverallStatus(findings);

  // Build URLs for pipeline navigation
  const designParams = useMemo(() => ({
    d: String(wireDiameter),
    od: String(od),
    Na: String(activeCoils),
    Nt: String(totalCoils),
    Hf: String(freeLength),
    endType,
    material: materialPreset,
    preload: String(preloadN),
    rideLoad: String(rideLoadN),
    bumpTravel: String(bumpTravel),
    solidMargin: String(solidMargin),
    holeDia: holeDiameter !== undefined ? String(holeDiameter) : undefined,
    rodDia: rodDiameter !== undefined ? String(rodDiameter) : undefined,
    cornerMass: cornerMass !== undefined ? String(cornerMass) : undefined,
    motionRatio: String(motionRatio),
    targetFreq: targetFreq !== undefined ? String(targetFreq) : undefined,
  }), [wireDiameter, od, activeCoils, totalCoils, freeLength, endType, materialPreset, preloadN, rideLoadN, bumpTravel, solidMargin, holeDiameter, rodDiameter, cornerMass, motionRatio, targetFreq]);

  const analysisUrl = useMemo(() => 
    buildPipelineUrl("/tools/analysis?type=suspensionSpring", designParams), 
    [designParams]
  );

  const cadExportUrl = useMemo(() => 
    buildPipelineUrl("/tools/cad-export?type=suspensionSpring", designParams), 
    [designParams]
  );

  const currentStressRatio = useMemo(() => {
    if (result.errors.length > 0) return 0;
    return calculateStressRatioAtDeflection(
      result.springRate_N_per_mm,
      result.stress.wahlFactor_Kw,
      result.derived.meanDiameter_mm,
      input.geometry.wireDiameter_mm,
      input.material.yieldStrength_MPa,
      currentDeflection
    );
  }, [result, input, currentDeflection]);

  const currentLoad = result.springRate_N_per_mm * currentDeflection;

  const handleLoadcaseChange = useCallback(
    (mode: LoadcaseMode) => {
      setLoadcaseMode(mode);
      switch (mode) {
        case "preload":
          setCurrentDeflection(result.preloadDeflection_mm);
          break;
        case "ride":
          setCurrentDeflection(result.rideDeflection_mm);
          break;
        case "bump":
          setCurrentDeflection(bumpTravel);
          break;
      }
    },
    [result, bumpTravel]
  );

  React.useEffect(() => {
    if (result.errors.length === 0) {
      handleLoadcaseChange(loadcaseMode);
    }
  }, [result.rideDeflection_mm, result.preloadDeflection_mm, bumpTravel]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (overallStatus) {
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Warning</Badge>;
      default:
        return <Badge variant="secondary" className="bg-green-100 text-green-800">OK</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">几何参数 / Geometry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wireDiameter">线径 d (mm)</Label>
                <Input
                  id="wireDiameter"
                  type="number"
                  value={wireDiameter}
                  onChange={(e) => setWireDiameter(Number(e.target.value))}
                  step={0.5}
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="od">外径 OD (mm)</Label>
                <Input
                  id="od"
                  type="number"
                  value={od}
                  onChange={(e) => setOd(Number(e.target.value))}
                  step={1}
                  min={10}
                />
              </div>
              <div>
                <Label htmlFor="activeCoils">有效圈数 Na</Label>
                <Input
                  id="activeCoils"
                  type="number"
                  value={activeCoils}
                  onChange={(e) => setActiveCoils(Number(e.target.value))}
                  step={0.5}
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="freeLength">自由长度 Hf (mm)</Label>
                <Input
                  id="freeLength"
                  type="number"
                  value={freeLength}
                  onChange={(e) => setFreeLength(Number(e.target.value))}
                  step={5}
                  min={10}
                />
              </div>
            </div>
            <div>
              <Label>端部类型 / End Type</Label>
              <Select value={endType} onValueChange={(v) => setEndType(v as EndType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed_ground">并紧磨平 / Closed & Ground</SelectItem>
                  <SelectItem value="closed">并紧 / Closed</SelectItem>
                  <SelectItem value="open">开放 / Open</SelectItem>
                </SelectContent>
              </Select>
              {/* Design hint for end type */}
              <p className="text-xs text-muted-foreground mt-1">
                {endType === "closed_ground" && "端面贴平用于稳定接触/降低偏载"}
                {endType === "closed" && "并紧端适合多数悬架弹簧座圈装配"}
                {endType === "open" && "开放端更像通用弹簧，需注意座圈接触"}
              </p>
            </div>
            {/* Conditional groundTurnsPerEnd for Closed & Ground */}
            {endType === "closed_ground" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="groundTurns">磨平影响圈数 / Ground Turns</Label>
                  <Input
                    id="groundTurns"
                    type="number"
                    value={groundTurnsPerEnd}
                    onChange={(e) => setGroundTurnsPerEnd(Number(e.target.value))}
                    step={0.25}
                    min={0.25}
                    max={1.5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">每端磨平影响范围（圈）</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">载荷工况 / Loadcase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="preloadN">预载 F₀ (N)</Label>
                <Input
                  id="preloadN"
                  type="number"
                  value={preloadN}
                  onChange={(e) => setPreloadN(Number(e.target.value))}
                  step={50}
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="rideLoadN">行驶载荷 F_ride (N)</Label>
                <Input
                  id="rideLoadN"
                  type="number"
                  value={rideLoadN}
                  onChange={(e) => setRideLoadN(Number(e.target.value))}
                  step={100}
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="bumpTravel">触底行程 x_bump (mm)</Label>
                <Input
                  id="bumpTravel"
                  type="number"
                  value={bumpTravel}
                  onChange={(e) => setBumpTravel(Number(e.target.value))}
                  step={5}
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="solidMargin">固高余量 (mm)</Label>
                <Input
                  id="solidMargin"
                  type="number"
                  value={solidMargin}
                  onChange={(e) => setSolidMargin(Number(e.target.value))}
                  step={1}
                  min={0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">材料 / Material</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={materialPreset} onValueChange={setMaterialPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUSPENSION_SPRING_MATERIAL_PRESETS.map((m) => (
                  <SelectItem key={m.name} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-xs text-muted-foreground">
              G = {material.shearModulus_G_MPa.toLocaleString()} MPa, Sy = {material.yieldStrength_MPa} MPa
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader 
            className="pb-3 cursor-pointer hover:bg-muted/50"
            onClick={() => setGuideOpen(!guideOpen)}
          >
            <CardTitle className="text-lg flex items-center justify-between">
              导向 / Guide
              <ChevronDown className={`h-4 w-4 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
          {guideOpen && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="holeDiameter">导向孔径 (mm)</Label>
                  <Input
                    id="holeDiameter"
                    type="number"
                    value={holeDiameter ?? ""}
                    onChange={(e) => setHoleDiameter(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <Label htmlFor="rodDiameter">导向杆径 (mm)</Label>
                  <Input
                    id="rodDiameter"
                    type="number"
                    value={rodDiameter ?? ""}
                    onChange={(e) => setRodDiameter(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="可选"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader 
            className="pb-3 cursor-pointer hover:bg-muted/50"
            onClick={() => setDynamicsOpen(!dynamicsOpen)}
          >
            <CardTitle className="text-lg flex items-center justify-between">
              动态参数 / Dynamics
              <ChevronDown className={`h-4 w-4 transition-transform ${dynamicsOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
          {dynamicsOpen && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cornerMass">簧下质量 (kg)</Label>
                  <Input
                    id="cornerMass"
                    type="number"
                    value={cornerMass ?? ""}
                    onChange={(e) => setCornerMass(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <Label htmlFor="motionRatio">运动比 MR</Label>
                  <Input
                    id="motionRatio"
                    type="number"
                    value={motionRatio}
                    onChange={(e) => setMotionRatio(Number(e.target.value))}
                    step={0.1}
                    min={0.1}
                  />
                </div>
                <div>
                  <Label htmlFor="targetFreq">目标频率 (Hz)</Label>
                  <Input
                    id="targetFreq"
                    type="number"
                    value={targetFreq ?? ""}
                    onChange={(e) => setTargetFreq(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="可选"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Progressive Geometry Section */}
        <Card>
          <CardHeader 
            className="pb-3 cursor-pointer hover:bg-muted/50"
            onClick={() => setProgressiveOpen(!progressiveOpen)}
          >
            <CardTitle className="text-lg flex items-center justify-between">
              渐进节距 / Progressive Pitch
              <ChevronDown className={`h-4 w-4 transition-transform ${progressiveOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
          {progressiveOpen && (
            <CardContent className="space-y-3">
              <div>
                <Label>模式 / Mode</Label>
                <Select value={pitchMode} onValueChange={(v) => setPitchMode(v as PitchMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform">均匀 (Uniform)</SelectItem>
                    <SelectItem value="twoStage">两段式 (Two-Stage)</SelectItem>
                    <SelectItem value="threeStage">三段式 (Three-Stage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {pitchMode !== "uniform" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>端部并紧圈数</Label>
                    <Input 
                      type="number" 
                      value={endClosedTurns} 
                      onChange={e => setEndClosedTurns(Number(e.target.value))}
                      step={0.25}
                    />
                  </div>
                  <div>
                    <Label>过渡圈数</Label>
                    <Input 
                      type="number" 
                      value={transitionTurns} 
                      onChange={e => setTransitionTurns(Number(e.target.value))}
                      step={0.25}
                    />
                  </div>
                  <div>
                    <Label>中间节距 (mm)</Label>
                    <Input 
                      type="number" 
                      value={pitchCenter || ""} 
                      placeholder="Auto"
                      onChange={e => setPitchCenter(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>端部节距 (mm)</Label>
                    <Input 
                      type="number" 
                      value={pitchEnd || ""} 
                      placeholder="Auto"
                      onChange={e => setPitchEnd(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Variable Diameter Section */}
        <Card>
          <CardHeader 
            className="pb-3 cursor-pointer hover:bg-muted/50"
            onClick={() => setVariableDiameterOpen(!variableDiameterOpen)}
          >
            <CardTitle className="text-lg flex items-center justify-between">
              变中径 / Variable Diameter
              <ChevronDown className={`h-4 w-4 transition-transform ${variableDiameterOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
          {variableDiameterOpen && (
            <CardContent className="space-y-3">
              <div>
                <Label>模式 / Mode</Label>
                <Select value={diameterMode} onValueChange={(v) => setDiameterMode(v as DiameterMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="constant">恒定 (Constant)</SelectItem>
                    <SelectItem value="barrel">桶形 (Barrel)</SelectItem>
                    <SelectItem value="conical">锥形 (Conical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {diameterMode !== "constant" && (
                <div className="grid grid-cols-2 gap-3">
                   <div>
                    <Label>起始中径 Dm_start</Label>
                    <Input 
                      type="number" 
                      value={dmStart} 
                      onChange={e => setDmStart(Number(e.target.value))}
                    />
                  </div>
                  
                  {diameterMode === "barrel" && (
                    <div>
                      <Label>中间中径 Dm_mid</Label>
                      <Input 
                        type="number" 
                        value={dmMid} 
                        onChange={e => setDmMid(Number(e.target.value))}
                      />
                    </div>
                  )}

                  <div>
                    <Label>结束中径 Dm_end</Label>
                    <Input 
                      type="number" 
                      value={dmEnd} 
                      onChange={e => setDmEnd(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              3D 预览
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] rounded-lg overflow-hidden border">
              {result.errors.length === 0 ? (
                <SuspensionSpringVisualizer
                  wireDiameter={wireDiameter}
                  meanDiameter={meanDiameter}
                  activeCoils={activeCoils}
                  totalCoils={totalCoils}
                  freeLength={freeLength}
                  currentDeflection={currentDeflection}
                  stressRatio={currentStressRatio}
                  solidHeight={result.derived.solidHeight_Hs_mm}
                  currentLoad={currentLoad}
                  springRate={result.springRate_N_per_mm}
                  pitchProfile={{
                    mode: pitchMode,
                    pitchCenter: pitchCenter || undefined,
                    pitchEnd: pitchEnd || undefined,
                    endClosedTurns,
                    transitionTurns,
                    endType,
                    endSpec: {
                      type: endType,
                      closedTurnsPerEnd: endClosedTurns,
                      groundTurnsPerEnd: endType === "closed_ground" ? groundTurnsPerEnd : 0,
                      seatDrop: 0,
                      endAngleExtra: endType === "closed_ground" ? 0.25 : 0, // Longer contact arc for ground ends
                    },
                  }}
                  diameterProfile={{
                    mode: diameterMode,
                    DmStart: dmStart,
                    DmMid: dmMid,
                    DmEnd: dmEnd,
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-100">
                  <div className="text-center text-red-600">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">{result.errors[0]}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={loadcaseMode === "preload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLoadcaseChange("preload")}
                  disabled={result.errors.length > 0}
                >
                  Preload
                </Button>
                <Button
                  variant={loadcaseMode === "ride" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLoadcaseChange("ride")}
                  disabled={result.errors.length > 0}
                >
                  Ride
                </Button>
                <Button
                  variant={loadcaseMode === "bump" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLoadcaseChange("bump")}
                  disabled={result.errors.length > 0}
                >
                  Bump
                </Button>
              </div>

              <div>
                <Label>压缩量 Δx: {currentDeflection.toFixed(1)} mm</Label>
                <Slider
                  value={[currentDeflection]}
                  onValueChange={([v]) => {
                    setCurrentDeflection(v);
                    setLoadcaseMode("ride");
                  }}
                  min={0}
                  max={bumpTravel}
                  step={0.5}
                  disabled={result.errors.length > 0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">计算结果 / Results</CardTitle>
          </CardHeader>
          <CardContent>
            {result.errors.length > 0 ? (
              <div className="text-red-600 space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{e}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">刚度 k:</span>
                  <span className="font-medium">{result.springRate_N_per_mm.toFixed(2)} N/mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">弹簧指数 C:</span>
                  <span className="font-medium">{result.derived.springIndex_C.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">固体高度 Hs:</span>
                  <span className="font-medium">{result.derived.solidHeight_Hs_mm.toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wahl 系数:</span>
                  <span className="font-medium">{result.stress.wahlFactor_Kw.toFixed(3)}</span>
                </div>

                <div className="col-span-2 border-t pt-2 mt-2">
                  <div className="font-medium mb-1">工况应力</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">τ_ride:</span>
                  <span className="font-medium">{result.stress.tauRide_MPa.toFixed(0)} MPa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">τ_bump:</span>
                  <span className="font-medium">{result.stress.tauBump_MPa.toFixed(0)} MPa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SF_ride:</span>
                  <span className="font-medium">{result.stress.yieldSafetyFactor_ride.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SF_bump:</span>
                  <span className={`font-medium ${result.stress.yieldSafetyFactor_bump < 1.2 ? "text-amber-600" : ""}`}>
                    {result.stress.yieldSafetyFactor_bump.toFixed(2)}
                  </span>
                </div>

                {result.dynamics && (
                  <>
                    <div className="col-span-2 border-t pt-2 mt-2">
                      <div className="font-medium mb-1">动态特性</div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">轮端刚度:</span>
                      <span className="font-medium">{result.dynamics.wheelRate_N_per_mm.toFixed(2)} N/mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">固有频率:</span>
                      <span className="font-medium">{result.dynamics.naturalFreq_Hz.toFixed(2)} Hz</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {findings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">设计规则 / Design Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {findings.map((f) => (
                  <div key={f.id} className="flex items-start gap-2 text-sm">
                    {getSeverityIcon(f.severity)}
                    <div>
                      <span className="font-medium">{f.name}:</span>{" "}
                      <span className="text-muted-foreground">{f.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons - 工程分析和CAD出图 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">工程工具 / Engineering Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              asChild 
              variant="outline" 
              className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10"
            >
              <a href={analysisUrl}>
                Send to Engineering Analysis / 发送到工程分析
              </a>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="w-full border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10"
              disabled={result.errors.length > 0}
            >
              <a href={cadExportUrl}>
                Export CAD / 导出 CAD
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
