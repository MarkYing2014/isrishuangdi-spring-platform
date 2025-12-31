"use client";

/**
 * Shock Absorber Spring Calculator
 * 减震器弹簧计算器
 * 
 * Advanced parametric calculator for shock absorber springs with:
 * - Variable wire diameter
 * - Variable mean diameter (bulge/hourglass/linear)
 * - Variable pitch with closed end transitions
 * - End grinding by turns (not height)
 * - Debug visualization
 * - FreeCAD export
 */

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, AlertTriangle, CheckCircle2, Copy, ChevronDown, Info } from "lucide-react";

import { ShockSpringVisualizer } from "@/components/three/ShockSpringVisualizer";
import {
  type ShockSpringParams,
  type MeanDiameterShape,
  type PitchStyle,
  DEFAULT_SHOCK_SPRING_PARAMS,
  validateParams,
  buildShockSpringCenterline,
  computeShockSpringMetrics,
  computeGrindCutPlanes,
} from "@/lib/spring3d/shock";
import { generateShockSpringFreeCADScript } from "@/lib/cad/shockSpringCad";

// ============================================================================
// Component
// ============================================================================

export function ShockSpringCalculator() {
  // ========================================
  // State
  // ========================================
  
  // Basic
  const [totalTurns, setTotalTurns] = useState(DEFAULT_SHOCK_SPRING_PARAMS.totalTurns);
  const [samplesPerTurn, setSamplesPerTurn] = useState(DEFAULT_SHOCK_SPRING_PARAMS.samplesPerTurn);
  
  // Mean Diameter
  const [meanDiaStart, setMeanDiaStart] = useState(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.start);
  const [meanDiaMid, setMeanDiaMid] = useState(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.mid);
  const [meanDiaEnd, setMeanDiaEnd] = useState(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.end);
  const [meanDiaShape, setMeanDiaShape] = useState<MeanDiameterShape>(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.shape);
  
  // Wire Diameter
  const [wireDiaStart, setWireDiaStart] = useState(DEFAULT_SHOCK_SPRING_PARAMS.wireDia.start);
  const [wireDiaMid, setWireDiaMid] = useState(DEFAULT_SHOCK_SPRING_PARAMS.wireDia.mid);
  const [wireDiaEnd, setWireDiaEnd] = useState(DEFAULT_SHOCK_SPRING_PARAMS.wireDia.end);
  
  // Pitch
  const [pitchStyle, setPitchStyle] = useState<PitchStyle>(DEFAULT_SHOCK_SPRING_PARAMS.pitch.style ?? "symmetric");
  const [closedTurns, setClosedTurns] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.closedTurns);
  const [workingMin, setWorkingMin] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.workingMin);
  const [workingMax, setWorkingMax] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.workingMax);
  const [transitionSharpness, setTransitionSharpness] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.transitionSharpness);
  const [closedPitchFactor, setClosedPitchFactor] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.closedPitchFactor ?? 1.0);
  
  // Grinding
  const [grindTop, setGrindTop] = useState(DEFAULT_SHOCK_SPRING_PARAMS.grind.top);
  const [grindBottom, setGrindBottom] = useState(DEFAULT_SHOCK_SPRING_PARAMS.grind.bottom);
  const [grindOffsetTurns, setGrindOffsetTurns] = useState(DEFAULT_SHOCK_SPRING_PARAMS.grind.offsetTurns);
  
  // Debug
  const [showCenterline, setShowCenterline] = useState(false);
  const [showFrames, setShowFrames] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showGrindingPlanes, setShowGrindingPlanes] = useState(DEFAULT_SHOCK_SPRING_PARAMS.debug.showGrindingPlanes);
  
  // UI State
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    pitch: true,
    wire: false,
    ends: false,
    debug: false,
  });
  
  // ========================================
  // Build Parameters
  // ========================================
  
  const params: ShockSpringParams = useMemo(() => ({
    totalTurns,
    samplesPerTurn,
    meanDia: {
      start: meanDiaStart,
      mid: meanDiaMid,
      end: meanDiaEnd,
      shape: meanDiaShape,
    },
    wireDia: {
      start: wireDiaStart,
      mid: wireDiaMid,
      end: wireDiaEnd,
    },
    pitch: {
      style: pitchStyle,
      closedTurns,
      workingMin,
      workingMax,
      transitionSharpness,
      closedPitchFactor,
    },
    grind: {
      top: grindTop,
      bottom: grindBottom,
      offsetTurns: grindOffsetTurns,
    },
    debug: {
      showCenterline,
      showFrames,
      showSections,
      showGrindingPlanes,
    },
  }), [
    totalTurns, samplesPerTurn,
    meanDiaStart, meanDiaMid, meanDiaEnd, meanDiaShape,
    wireDiaStart, wireDiaMid, wireDiaEnd,
    pitchStyle, closedTurns, workingMin, workingMax, transitionSharpness, closedPitchFactor,
    grindTop, grindBottom, grindOffsetTurns,
    showCenterline, showFrames, showSections, showGrindingPlanes,
  ]);
  
  // ========================================
  // Validation
  // ========================================
  
  const validation = useMemo(() => validateParams(params), [params]);
  const hasErrors = validation.errors.length > 0;
  
  // ========================================
  // Metrics
  // ========================================
  
  const metrics = useMemo(() => {
    if (hasErrors) return null;
    
    try {
      const centerline = buildShockSpringCenterline(params);
      const computedMetrics = computeShockSpringMetrics(centerline, params);
      const grindPlanes = computeGrindCutPlanes(params, centerline);
      
      return {
        ...computedMetrics,
        totalHeight: centerline.totalHeight,
        zCutBottom: grindPlanes.zCutBottom,
        zCutTop: grindPlanes.zCutTop,
      };
    } catch {
      return null;
    }
  }, [params, hasErrors]);
  
  // ========================================
  // Handlers
  // ========================================
  
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);
  
  const handleCopyScript = useCallback(async () => {
    try {
      const script = generateShockSpringFreeCADScript(params);
      await navigator.clipboard.writeText(script);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error("Failed to copy script:", err);
    }
  }, [params]);
  
  // ========================================
  // Render
  // ========================================
  
  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Parameters */}
        <div className="space-y-4">
          {/* Info Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">基本参数 / Basic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="totalTurns">总圈数 / Total Turns</Label>
                  <NumericInput
                    id="totalTurns"
                    value={totalTurns}
                    onChange={(v) => setTotalTurns(v ?? 8)}
                    step={0.5}
                    min={2}
                  />
                </div>
                <div>
                  <Label htmlFor="samplesPerTurn">每圈采样 / Samples/Turn</Label>
                  <NumericInput
                    id="samplesPerTurn"
                    value={samplesPerTurn}
                    onChange={(v) => setSamplesPerTurn(v ?? 60)}
                    step={10}
                    min={20}
                    max={120}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Geometry Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("geometry")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                中径 / Mean Diameter
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.geometry ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.geometry && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Start (mm)</Label>
                    <NumericInput
                      value={meanDiaStart}
                      onChange={(v) => setMeanDiaStart(v ?? 32)}
                      step={1}
                      min={5}
                    />
                  </div>
                  <div>
                    <Label>Mid (mm)</Label>
                    <NumericInput
                      value={meanDiaMid}
                      onChange={(v) => setMeanDiaMid(v ?? 38)}
                      step={1}
                      min={5}
                    />
                  </div>
                  <div>
                    <Label>End (mm)</Label>
                    <NumericInput
                      value={meanDiaEnd}
                      onChange={(v) => setMeanDiaEnd(v ?? 32)}
                      step={1}
                      min={5}
                    />
                  </div>
                </div>
                <div>
                  <Label>形态 / Shape</Label>
                  <Select value={meanDiaShape} onValueChange={(v) => setMeanDiaShape(v as MeanDiameterShape)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulge">鼓形 / Bulge (常见)</SelectItem>
                      <SelectItem value="hourglass">沙漏 / Hourglass (抗屈曲)</SelectItem>
                      <SelectItem value="linear">线性 / Linear</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Pitch Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("pitch")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                节距 / Pitch
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.pitch ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.pitch && (
              <CardContent className="space-y-3">
                {/* Pitch Style Selector */}
                <div>
                  <Label>节距样式 / Pitch Style</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2"
                    value={pitchStyle}
                    onChange={(e) => setPitchStyle(e.target.value as PitchStyle)}
                  >
                    <option value="symmetric">对称 (两端并紧, 中间疏) - Symmetric</option>
                    <option value="progressive">渐进 (底密 → 顶疏) - Progressive</option>
                    <option value="regressive">递减 (底疏 → 顶密) - Regressive</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>并紧圈数 (每端)</Label>
                    <NumericInput
                      value={closedTurns}
                      onChange={(v) => setClosedTurns(v ?? 2)}
                      step={0.25}
                      min={0.5}
                    />
                  </div>
                  <div>
                    <Label>并紧系数</Label>
                    <NumericInput
                      value={closedPitchFactor}
                      onChange={(v) => setClosedPitchFactor(v ?? 1)}
                      step={0.1}
                      min={0.5}
                      max={1.5}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>工作区最小节距 (mm)</Label>
                    <NumericInput
                      value={workingMin}
                      onChange={(v) => setWorkingMin(v ?? 6)}
                      step={0.5}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label>工作区最大节距 (mm)</Label>
                    <NumericInput
                      value={workingMax}
                      onChange={(v) => setWorkingMax(v ?? 12)}
                      step={0.5}
                      min={1}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>过渡锐度 / Transition Sharpness</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">控制从并紧到工作区的过渡软硬程度。</p>
                        <p className="max-w-xs">值越小 → 更平缓（推荐减震器）</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[transitionSharpness]}
                      onValueChange={([v]) => setTransitionSharpness(v)}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      className="flex-1"
                    />
                    <span className="text-sm w-12 text-right">{transitionSharpness.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Wire Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("wire")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                线径 / Wire Diameter
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.wire ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.wire && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Start (mm)</Label>
                    <NumericInput
                      value={wireDiaStart}
                      onChange={(v) => setWireDiaStart(v ?? 3.2)}
                      step={0.1}
                      min={0.5}
                    />
                  </div>
                  <div>
                    <Label>Mid (mm)</Label>
                    <NumericInput
                      value={wireDiaMid}
                      onChange={(v) => setWireDiaMid(v ?? 4)}
                      step={0.1}
                      min={0.5}
                    />
                  </div>
                  <div>
                    <Label>End (mm)</Label>
                    <NumericInput
                      value={wireDiaEnd}
                      onChange={(v) => setWireDiaEnd(v ?? 3.2)}
                      step={0.1}
                      min={0.5}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  使用 C¹ 连续正弦混合，端部细、中间粗（橄榄形）
                </p>
              </CardContent>
            )}
          </Card>
          
          {/* Ends Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("ends")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                端面磨平 / End Grinding
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.ends ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.ends && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="grindBottom"
                      checked={grindBottom}
                      onCheckedChange={setGrindBottom}
                    />
                    <Label htmlFor="grindBottom">底端磨平</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="grindTop"
                      checked={grindTop}
                      onCheckedChange={setGrindTop}
                    />
                    <Label htmlFor="grindTop">顶端磨平</Label>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>磨削偏移 (圈)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">从每端沿螺旋方向切除的圈数。</p>
                        <p className="max-w-xs">典型值：0.5~0.75 turns</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <NumericInput
                    value={grindOffsetTurns}
                    onChange={(v) => setGrindOffsetTurns(v ?? 0.6)}
                    step={0.1}
                    min={0}
                    max={2}
                  />
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Debug Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("debug")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                调试可视化 / Debug
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.debug ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.debug && (
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showCenterline"
                      checked={showCenterline}
                      onCheckedChange={setShowCenterline}
                    />
                    <Label htmlFor="showCenterline">显示中心线</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showFrames"
                      checked={showFrames}
                      onCheckedChange={setShowFrames}
                    />
                    <Label htmlFor="showFrames">显示 PTF 坐标系</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showSections"
                      checked={showSections}
                      onCheckedChange={setShowSections}
                    />
                    <Label htmlFor="showSections">显示截面圆</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showGrindingPlanes"
                      checked={showGrindingPlanes}
                      onCheckedChange={setShowGrindingPlanes}
                    />
                    <Label htmlFor="showGrindingPlanes">显示磨平切面</Label>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
        
        {/* Right Column: Preview & Results */}
        <div className="space-y-4">
          {/* 3D Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                3D 预览
                {hasErrors ? (
                  <Badge variant="destructive">错误</Badge>
                ) : validation.warnings.length > 0 ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">警告</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">OK</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] rounded-lg overflow-hidden border bg-slate-50">
                {!hasErrors ? (
                  <ShockSpringVisualizer params={params} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>请修正参数错误</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Validation Messages */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {validation.errors.map((err, i) => (
                  <div key={`err-${i}`} className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{err}</span>
                  </div>
                ))}
                {validation.warnings.map((warn, i) => (
                  <div key={`warn-${i}`} className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{warn}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Metrics */}
          {metrics && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">计算结果 / Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">总高度</span>
                    <p className="font-medium">{metrics.totalHeight.toFixed(2)} mm</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">线材长度</span>
                    <p className="font-medium">{metrics.wireLength.toFixed(1)} mm</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">线径范围</span>
                    <p className="font-medium">{(metrics.minRadius * 2).toFixed(2)} ~ {(metrics.maxRadius * 2).toFixed(2)} mm</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">节距范围</span>
                    <p className="font-medium">{metrics.minPitch.toFixed(2)} ~ {metrics.maxPitch.toFixed(2)} mm</p>
                  </div>
                  {metrics.zCutBottom !== null && (
                    <div>
                      <span className="text-muted-foreground">底端切削 z</span>
                      <p className="font-medium">{metrics.zCutBottom.toFixed(2)} mm</p>
                    </div>
                  )}
                  {metrics.zCutTop !== null && (
                    <div>
                      <span className="text-muted-foreground">顶端切削 z</span>
                      <p className="font-medium">{metrics.zCutTop.toFixed(2)} mm</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* CAD Export */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">CAD 导出</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCopyScript}
                disabled={hasErrors}
                className="w-full"
              >
                {copiedToClipboard ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    已复制!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    复制 FreeCAD 脚本
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                复制 Python 脚本到 FreeCAD 运行，生成 STEP/STL 文件
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ShockSpringCalculator;
