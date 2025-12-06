'use client';

/**
 * Advanced Analysis Page - Phase 6 & 7
 * 高级分析页面 - 数字孪生系统
 * 
 * Manufacturing simulation, AI recommendations, standards compliance, and Digital Twin
 */

import { useState, useMemo, useEffect } from 'react';
import { useSpringAnalysisStore } from '@/lib/stores/springAnalysisStore';
import { useSpringSimulationStore } from '@/lib/stores/springSimulationStore';
import { getSpringMaterial } from '@/lib/materials/springMaterials';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Factory, 
  Shield, 
  Brain, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Download,
  Cpu,
  Activity,
  DollarSign,
  Waves,
  Target
} from 'lucide-react';
import Link from 'next/link';

// Phase 6 engines
import { simulateCoilingProcess } from '@/lib/engine/coilingProcess';
import { simulateShotPeening } from '@/lib/engine/shotPeening';
import { simulateScragTest } from '@/lib/engine/scragTest';
import { checkManufacturability } from '@/lib/engine/manufacturabilityCheck';
import { runAllStandardChecks } from '@/lib/engine/standardsCheck';
import { recommendMaterials } from '@/lib/engine/materialRecommendation';
import { predictFatigueLife, createFeaturesFromSpring } from '@/lib/engine/mlFatiguePredictor';

// Phase 7 engines
import {
  generateFEAScripts,
  downloadFEAScript,
  calculateCrackInitiationProbability,
  analyzeCorrosion,
  simulateCoating,
  predictCostAndYield,
  analyzeHarmonicResponse,
  modelHealthDegradation,
  analyzeFractureHotspots,
  type FEAScriptResult,
  type CrackInitiationResult,
  type CorrosionAnalysisResult,
  type CoatingSimulationResult,
  type CostYieldPredictionResult,
  type HarmonicResponseResult,
  type HealthDegradationResult,
  type HotspotTrackingResult,
} from '@/lib/engine/phase7';

// Torsion spring advanced analysis
import {
  runTorsionAdvancedAnalysis,
  type TorsionAdvancedAnalysisResult,
} from '@/lib/engine/torsionAdvancedAnalysis';

export default function AdvancedAnalysisPage() {
  const [activeTab, setActiveTab] = useState('manufacturing');
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);

  // Global analysis store
  const {
    geometry,
    workingConditions,
    materialId,
    analysisResult,
    phase6Manufacturing,
    phase6Quality,
    phase6AI,
    setPhase6Manufacturing,
    setPhase6Quality,
    setPhase6AI,
    hasValidGeometry,
    hasAnalysisResult,
  } = useSpringAnalysisStore();

  // Simulation store for 3D visualization sync
  const simulationStore = useSpringSimulationStore();

  // Get material data
  const material = useMemo(() => {
    return materialId ? getSpringMaterial(materialId) : null;
  }, [materialId]);

  // Check if we have valid data to analyze
  const canAnalyze = hasValidGeometry() && hasAnalysisResult() && material !== null;

  // Torsion spring advanced analysis state
  const [torsionAnalysis, setTorsionAnalysis] = useState<TorsionAdvancedAnalysisResult | null>(null);

  // Check if this is a torsion spring
  const isTorsionSpring = geometry?.type === 'torsion';

  // Run all Phase 6 analyses
  const runPhase6Analysis = async () => {
    if (!geometry || !analysisResult || !material || !workingConditions) return;

    setIsRunning(true);
    setRunProgress(0);

    try {
      // Special handling for torsion springs
      if (geometry.type === 'torsion') {
        setRunProgress(20);
        
        const torsionGeom = geometry as any;
        const torsionResult = runTorsionAdvancedAnalysis({
          wireDiameter: geometry.wireDiameter,
          meanDiameter: torsionGeom.meanDiameter,
          activeCoils: geometry.activeCoils,
          bodyLength: torsionGeom.bodyLength || geometry.wireDiameter * geometry.activeCoils,
          legLength1: torsionGeom.legLength1 || 25,
          legLength2: torsionGeom.legLength2 || 25,
          freeAngle: torsionGeom.legAngle || 90,
          workingAngle: workingConditions.maxDeflection || 45,
          materialId: geometry.materialId,
        }, 20);
        
        setTorsionAnalysis(torsionResult);
        setRunProgress(50);
        
        // Still run some generic analyses for torsion springs
        const shotPeeningResult = simulateShotPeening({
          wireDiameter: geometry.wireDiameter,
          peakStress: 600,
          attenuationDepth: 0.1,
          coverage: 200,
          shotDiameter: 0.6,
          almenIntensity: '0.25A',
        }, material.snCurve?.tau2 || 400, analysisResult.stress.tauEffective);
        
        setPhase6Manufacturing({
          coilingProcess: null as any,
          shotPeening: shotPeeningResult,
          scragTest: null as any,
        });
        
        setRunProgress(100);
        setIsRunning(false);
        return;
      }

      // 1. Manufacturing Analysis (30%) - for compression/extension springs
      setRunProgress(10);
      
      const coilingResult = simulateCoilingProcess({
        wireDiameter: geometry.wireDiameter,
        mandrelDiameter: (geometry as any).meanDiameter - geometry.wireDiameter,
        targetMeanDiameter: (geometry as any).meanDiameter || (geometry as any).largeOuterDiameter - geometry.wireDiameter,
        targetPitch: ((geometry as any).freeLength - geometry.wireDiameter * 2) / geometry.activeCoils,
        feedRate: 20,
        pitchCamAngle: 15,
        materialId: geometry.materialId,
      });

      setRunProgress(20);

      const shotPeeningResult = simulateShotPeening({
        wireDiameter: geometry.wireDiameter,
        peakStress: 600,
        attenuationDepth: 0.1,
        coverage: 200,
        shotDiameter: 0.6,
        almenIntensity: '0.25A',
      }, material.snCurve?.tau2 || 400, analysisResult.stress.tauEffective);

      setRunProgress(30);

      const meanDiam = (geometry as any).meanDiameter || (geometry as any).largeOuterDiameter - geometry.wireDiameter;
      const freeLen = (geometry as any).freeLength;
      const scragDeflection = freeLen * 0.3; // 30% deflection for scrag
      const scragForce = analysisResult.springRate * scragDeflection;

      const scragResult = simulateScragTest({
        originalFreeLength: freeLen,
        originalSpringRate: analysisResult.springRate,
        wireDiameter: geometry.wireDiameter,
        meanDiameter: meanDiam,
        activeCoils: geometry.activeCoils,
        scragForce,
        scragDeflection,
        materialId: geometry.materialId,
        scragCycles: 3,
        scragTemperature: 20,
      });

      setPhase6Manufacturing({
        coilingProcess: coilingResult,
        shotPeening: shotPeeningResult,
        scragTest: scragResult,
      });

      // 2. Quality & Standards (60%)
      setRunProgress(40);

      const pitch = ((geometry as any).freeLength - geometry.wireDiameter * 2) / geometry.activeCoils;
      const meanDiameter = (geometry as any).meanDiameter || (geometry as any).largeOuterDiameter - geometry.wireDiameter;
      const outerDiameter = meanDiameter + geometry.wireDiameter;
      const innerDiameter = meanDiameter - geometry.wireDiameter;

      const manufacturabilityResult = checkManufacturability({
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        outerDiameter,
        innerDiameter,
        freeLength: (geometry as any).freeLength,
        activeCoils: geometry.activeCoils,
        totalCoils: (geometry as any).totalCoils || geometry.activeCoils + 2,
        pitch,
        endType: 'closed_ground',
        springType: geometry.type as any,
        productionVolume: 'medium',
      });

      setRunProgress(50);

      const standardsResult = runAllStandardChecks({
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        outerDiameter,
        freeLength: (geometry as any).freeLength,
        activeCoils: geometry.activeCoils,
        totalCoils: (geometry as any).totalCoils || geometry.activeCoils + 2,
        springRate: analysisResult.springRate,
        maxStress: analysisResult.stress.tauEffective,
        meanStress: analysisResult.fatigue.tauMean,
        alternatingStress: analysisResult.fatigue.tauAlt,
        safetyFactor: analysisResult.safety.staticSafetyFactor,
        materialId: geometry.materialId,
        operatingTemperature: 20,
        fatigueLife: analysisResult.fatigue.estimatedCycles,
      });

      setRunProgress(60);

      setPhase6Quality({
        manufacturability: manufacturabilityResult,
        standardsCheck: {
          asme: standardsResult.asme,
          sae: standardsResult.sae,
          din: standardsResult.din,
        },
      });

      // 3. AI/ML Analysis (100%)
      setRunProgress(70);

      const materialRecResult = recommendMaterials({
        desiredFatigueLife: workingConditions.targetCycles || 1e6,
        operatingTemperature: 20,
        corrosionEnvironment: 'none',
        targetSpringRate: analysisResult.springRate,
        maxWorkingStress: analysisResult.stress.tauEffective,
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        budgetLevel: 'medium',
      }, geometry.materialId);

      setRunProgress(85);

      const fatigueFeatures = createFeaturesFromSpring(
        geometry.wireDiameter,
        meanDiameter,
        (geometry as any).totalCoils || geometry.activeCoils + 2,
        geometry.activeCoils,
        analysisResult.stress.tauEffective * 0.3,
        geometry.materialId,
        analysisResult.fatigue.tauMean,
        analysisResult.fatigue.tauAlt,
        20,
        0,
        shotPeeningResult ? 2 : 0
      );

      const mlPrediction = predictFatigueLife(fatigueFeatures, 'ensemble');

      setRunProgress(100);

      setPhase6AI({
        materialRecommendation: materialRecResult,
        mlFatiguePrediction: mlPrediction,
      });

    } catch (error) {
      console.error('Phase 6 analysis error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run analysis if we have data but no Phase 6 results
  useEffect(() => {
    if (canAnalyze && !phase6Manufacturing && !isRunning) {
      // Don't auto-run, let user trigger it
    }
  }, [canAnalyze, phase6Manufacturing, isRunning]);

  // No data state
  if (!canAnalyze) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/tools/analysis">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回工程分析
            </Button>
          </Link>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>需要弹簧数据</AlertTitle>
          <AlertDescription>
            请先在计算器或工程分析页面设计弹簧，然后返回此页面进行高级分析。
            <br />
            <Link href="/tools/calculator" className="text-blue-600 hover:underline">
              前往弹簧计算器 →
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/tools/analysis">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">高级分析 Advanced Analysis</h1>
            <p className="text-muted-foreground text-sm">
              Phase 6 & 7: 制造仿真 · AI推荐 · 数字孪生
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={runPhase6Analysis} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                分析中... {runProgress}%
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {phase6Manufacturing ? '重新分析' : '开始分析'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar when running */}
      {isRunning && (
        <Progress value={runProgress} className="mb-6 h-2" />
      )}

      {/* Current Spring Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">当前弹簧 Current Spring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">类型</span>
              <p className="font-medium">{geometry?.type === 'compression' ? '压缩弹簧' : geometry?.type === 'conical' ? '锥形弹簧' : geometry?.type}</p>
            </div>
            <div>
              <span className="text-muted-foreground">线径 d</span>
              <p className="font-medium">{geometry?.wireDiameter} mm</p>
            </div>
            <div>
              <span className="text-muted-foreground">中径 Dm</span>
              <p className="font-medium">{(geometry as any)?.meanDiameter?.toFixed(2) || '-'} mm</p>
            </div>
            <div>
              <span className="text-muted-foreground">有效圈数</span>
              <p className="font-medium">{geometry?.activeCoils}</p>
            </div>
            <div>
              <span className="text-muted-foreground">材料</span>
              <p className="font-medium">{material?.nameZh || materialId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">刚度 k</span>
              <p className="font-medium">{analysisResult?.springRate.toFixed(2)} N/mm</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
          <TabsTrigger value="manufacturing" className="gap-1">
            <Factory className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">制造工艺</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-1">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">质量标准</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">AI分析</span>
          </TabsTrigger>
          <TabsTrigger value="digital-twin" className="gap-1">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">数字孪生</span>
          </TabsTrigger>
          <TabsTrigger value="fea" className="gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">FEA仿真</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">综合报告</span>
          </TabsTrigger>
        </TabsList>

        {/* Manufacturing Tab */}
        <TabsContent value="manufacturing">
          {isTorsionSpring && torsionAnalysis ? (
            <TorsionAnalysisTab data={torsionAnalysis} isRunning={isRunning} />
          ) : (
            <ManufacturingTab data={phase6Manufacturing} isRunning={isRunning} />
          )}
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality">
          <QualityTab data={phase6Quality} isRunning={isRunning} />
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <AITab data={phase6AI} isRunning={isRunning} />
        </TabsContent>

        {/* Digital Twin Tab - Phase 7 */}
        <TabsContent value="digital-twin">
          <DigitalTwinTab 
            geometry={geometry}
            analysisResult={analysisResult}
            material={material}
          />
        </TabsContent>

        {/* FEA Tab - Phase 7 */}
        <TabsContent value="fea">
          <FEATab 
            geometry={geometry}
            analysisResult={analysisResult}
            material={material}
          />
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <SummaryTab 
            manufacturing={phase6Manufacturing}
            quality={phase6Quality}
            ai={phase6AI}
            analysisResult={analysisResult}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Manufacturing Tab Component
function ManufacturingTab({ data, isRunning }: { data: any; isRunning: boolean }) {
  if (isRunning) {
    return <LoadingCard title="制造工艺分析" />;
  }

  if (!data) {
    return <EmptyCard title="制造工艺分析" message='点击"开始分析"运行制造工艺仿真' />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Coiling Process */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">卷绕工艺 Coiling</CardTitle>
          <CardDescription>CNC卷绕残余应力分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataRow label="残余弯曲应力" value={`${data.coilingProcess?.residualBendingStress?.toFixed(1)} MPa`} />
          <DataRow label="残余扭转应力" value={`${data.coilingProcess?.residualTorsionalStress?.toFixed(1)} MPa`} />
          <DataRow label="回弹角" value={`${data.coilingProcess?.springbackAngle?.toFixed(2)}°`} />
          <DataRow label="补偿芯棒直径" value={`${data.coilingProcess?.compensatedMandrelDiameter?.toFixed(2)} mm`} />
          <DataRow 
            label="疲劳寿命折减" 
            value={`${((1 - data.coilingProcess?.fatigueLifeReductionFactor) * 100)?.toFixed(1)}%`}
            status={data.coilingProcess?.fatigueLifeReductionFactor > 0.8 ? 'good' : 'warning'}
          />
        </CardContent>
      </Card>

      {/* Shot Peening */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">喷丸强化 Shot Peening</CardTitle>
          <CardDescription>表面残余压应力分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataRow 
            label="表面压应力" 
            value={`${data.shotPeening?.surfaceStress?.toFixed(0)} MPa`}
            status="good"
          />
          <DataRow label="压应力层深度" value={`${data.shotPeening?.effectiveDepth?.toFixed(3)} mm`} />
          <DataRow 
            label="疲劳寿命提升" 
            value={`${data.shotPeening?.enduranceEnhancementFactor?.toFixed(2)}×`}
            status="good"
          />
          <DataRow label="新疲劳极限" value={`${data.shotPeening?.newEnduranceLimit?.toFixed(0)} MPa`} />
          <DataRow label="修正有效应力" value={`${data.shotPeening?.correctedEffectiveStress?.toFixed(0)} MPa`} />
        </CardContent>
      </Card>

      {/* Scrag Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">立定处理 Scrag Test</CardTitle>
          <CardDescription>预压稳定化分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataRow label="塑性应变" value={`${(data.scragTest?.residualPlasticStrain * 100)?.toFixed(3)}%`} />
          <DataRow label="永久变形" value={`${data.scragTest?.permanentSet?.toFixed(3)} mm`} />
          <DataRow label="新自由长度" value={`${data.scragTest?.newFreeLength?.toFixed(2)} mm`} />
          <DataRow label="刚度变化" value={`${data.scragTest?.springRateChange > 0 ? '+' : ''}${data.scragTest?.springRateChange?.toFixed(2)}%`} />
          <DataRow 
            label="稳定化" 
            value={data.scragTest?.stabilizationAchieved ? '已达成' : '未达成'}
            status={data.scragTest?.stabilizationAchieved ? 'good' : 'warning'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Quality Tab Component
function QualityTab({ data, isRunning }: { data: any; isRunning: boolean }) {
  if (isRunning) {
    return <LoadingCard title="质量标准检查" />;
  }

  if (!data) {
    return <EmptyCard title="质量标准检查" message='点击"开始分析"运行标准符合性检查' />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Manufacturability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            可制造性评估
            <Badge variant={data.manufacturability?.isManufacturable ? 'default' : 'destructive'}>
              {data.manufacturability?.isManufacturable ? '可制造' : '不可制造'}
            </Badge>
          </CardTitle>
          <CardDescription>{data.manufacturability?.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">难度评分</span>
            <div className="flex items-center gap-2">
              <Progress value={100 - data.manufacturability?.difficultyScore} className="w-24 h-2" />
              <span className="text-sm font-medium">{data.manufacturability?.difficultyScore}/100</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-red-50 dark:bg-red-950">
              <p className="text-2xl font-bold text-red-600">{data.manufacturability?.criticalCount || 0}</p>
              <p className="text-xs text-muted-foreground">严重</p>
            </div>
            <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-950">
              <p className="text-2xl font-bold text-yellow-600">{data.manufacturability?.majorCount || 0}</p>
              <p className="text-xs text-muted-foreground">主要</p>
            </div>
            <div className="p-2 rounded bg-blue-50 dark:bg-blue-950">
              <p className="text-2xl font-bold text-blue-600">{data.manufacturability?.minorCount || 0}</p>
              <p className="text-xs text-muted-foreground">次要</p>
            </div>
          </div>

          {data.manufacturability?.issues?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">问题清单:</p>
              {data.manufacturability.issues.slice(0, 3).map((issue: any, i: number) => (
                <div key={i} className={`text-xs p-2 rounded ${
                  issue.severity === 'critical' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' :
                  issue.severity === 'major' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                  'bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                }`}>
                  <span className="font-medium">{issue.severity.toUpperCase()}:</span> {issue.description}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standards Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">标准符合性</CardTitle>
          <CardDescription>ASME / SAE J157 / DIN 2089</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {['asme', 'sae', 'din'].map((std) => {
            const check = data.standardsCheck?.[std];
            if (!check) return null;
            
            return (
              <div key={std} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{check.standard}</span>
                  <Badge variant={
                    check.overallStatus === 'pass' ? 'default' :
                    check.overallStatus === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {check.overallStatus === 'pass' ? '通过' :
                     check.overallStatus === 'warning' ? '警告' : '失败'}
                  </Badge>
                </div>
                <Progress value={check.compliancePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {check.passCount}/{check.checks.length} 项通过
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// AI Tab Component
function AITab({ data, isRunning }: { data: any; isRunning: boolean }) {
  if (isRunning) {
    return <LoadingCard title="AI智能分析" />;
  }

  if (!data) {
    return <EmptyCard title="AI智能分析" message='点击"开始分析"运行AI材料推荐和疲劳预测' />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Material Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI材料推荐
          </CardTitle>
          <CardDescription>{data.materialRecommendation?.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.materialRecommendation?.recommendations?.slice(0, 5).map((rec: any, i: number) => (
              <div key={i} className={`p-3 rounded-lg border ${i === 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    #{rec.rank} {rec.material.nameZh}
                  </span>
                  <Badge variant={rec.performance.meetsRequirements ? 'default' : 'secondary'}>
                    {rec.performance.overallScore.toFixed(0)}分
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rec.material.nameEn}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <span>安全系数: {rec.performance.safetyFactor.toFixed(2)}</span>
                  <span>疲劳寿命: {rec.performance.predictedFatigueLife.toExponential(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ML Fatigue Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            ML疲劳寿命预测
          </CardTitle>
          <CardDescription>基于机器学习的疲劳寿命预测</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">
              {data.mlFatiguePrediction?.predictedCycles?.toExponential(2)}
            </p>
            <p className="text-sm text-muted-foreground">预测疲劳寿命 (cycles)</p>
          </div>

          <div className="space-y-2">
            <DataRow 
              label="95%置信区间" 
              value={`${data.mlFatiguePrediction?.confidenceInterval?.lower?.toExponential(1)} - ${data.mlFatiguePrediction?.confidenceInterval?.upper?.toExponential(1)}`}
            />
            <DataRow 
              label="传统计算值" 
              value={`${data.mlFatiguePrediction?.comparison?.calculatedLife?.toExponential(2)}`}
            />
            <DataRow 
              label="差异" 
              value={`${data.mlFatiguePrediction?.comparison?.differencePercent > 0 ? '+' : ''}${data.mlFatiguePrediction?.comparison?.differencePercent?.toFixed(1)}%`}
            />
            <DataRow 
              label="预测可靠度" 
              value={`${data.mlFatiguePrediction?.reliabilityScore}/100`}
              status={data.mlFatiguePrediction?.reliabilityScore >= 70 ? 'good' : 'warning'}
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">特征重要性:</p>
            <div className="space-y-1">
              {Object.entries(data.mlFatiguePrediction?.featureImportance || {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([feature, importance]) => (
                  <div key={feature} className="flex items-center gap-2">
                    <span className="text-xs w-28 truncate">{feature}</span>
                    <Progress value={(importance as number) * 100} className="flex-1 h-2" />
                    <span className="text-xs w-10">{((importance as number) * 100).toFixed(0)}%</span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Summary Tab Component
function SummaryTab({ manufacturing, quality, ai, analysisResult }: any) {
  if (!manufacturing && !quality && !ai) {
    return <EmptyCard title="综合报告" message="完成分析后查看综合报告" />;
  }

  const overallScore = useMemo(() => {
    let score = 100;
    
    // Deduct for manufacturability issues
    if (quality?.manufacturability) {
      score -= quality.manufacturability.criticalCount * 20;
      score -= quality.manufacturability.majorCount * 10;
      score -= quality.manufacturability.minorCount * 2;
    }
    
    // Deduct for standards failures
    if (quality?.standardsCheck) {
      ['asme', 'sae', 'din'].forEach(std => {
        const check = quality.standardsCheck[std];
        if (check?.overallStatus === 'fail') score -= 15;
        else if (check?.overallStatus === 'warning') score -= 5;
      });
    }
    
    // Bonus for good fatigue life
    if (ai?.mlFatiguePrediction?.predictedCycles > 1e7) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }, [quality, ai]);

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 60) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const gradeInfo = getGrade(overallScore);

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-8">
            <div className={`w-24 h-24 rounded-full ${gradeInfo.bg} flex items-center justify-center`}>
              <span className={`text-4xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
            </div>
            <div>
              <p className="text-4xl font-bold">{overallScore}</p>
              <p className="text-muted-foreground">综合评分 / 100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          title="可制造性"
          value={quality?.manufacturability?.isManufacturable ? '通过' : '不通过'}
          icon={quality?.manufacturability?.isManufacturable ? CheckCircle2 : XCircle}
          status={quality?.manufacturability?.isManufacturable ? 'good' : 'bad'}
        />
        <SummaryCard 
          title="标准符合"
          value={`${quality?.standardsCheck?.asme?.passCount || 0}/${quality?.standardsCheck?.asme?.checks?.length || 0}`}
          icon={FileCheck}
          status={quality?.standardsCheck?.asme?.overallStatus === 'pass' ? 'good' : 'warning'}
        />
        <SummaryCard 
          title="疲劳寿命"
          value={ai?.mlFatiguePrediction?.predictedCycles?.toExponential(1) || '-'}
          icon={Brain}
          status={ai?.mlFatiguePrediction?.predictedCycles > 1e6 ? 'good' : 'warning'}
        />
        <SummaryCard 
          title="安全系数"
          value={analysisResult?.safety?.staticSafetyFactor?.toFixed(2) || '-'}
          icon={Shield}
          status={analysisResult?.safety?.staticSafetyFactor >= 1.5 ? 'good' : 'warning'}
        />
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          导出完整报告
        </Button>
      </div>
    </div>
  );
}

// Helper Components
function DataRow({ label, value, status }: { label: string; value: string; status?: 'good' | 'warning' | 'bad' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${
        status === 'good' ? 'text-green-600' :
        status === 'warning' ? 'text-yellow-600' :
        status === 'bad' ? 'text-red-600' : ''
      }`}>{value}</span>
    </div>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">正在分析 {title}...</p>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-4" />
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ title, value, icon: Icon, status }: { 
  title: string; 
  value: string; 
  icon: any;
  status: 'good' | 'warning' | 'bad';
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            status === 'good' ? 'bg-green-100 text-green-600' :
            status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-600'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Phase 7 Components
// ============================================================

// Digital Twin Tab Component
function DigitalTwinTab({ geometry, analysisResult, material }: any) {
  const [crackResult, setCrackResult] = useState<CrackInitiationResult | null>(null);
  const [corrosionResult, setCorrosionResult] = useState<CorrosionAnalysisResult | null>(null);
  const [costResult, setCostResult] = useState<CostYieldPredictionResult | null>(null);
  const [harmonicResult, setHarmonicResult] = useState<HarmonicResponseResult | null>(null);
  const [healthResult, setHealthResult] = useState<HealthDegradationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runDigitalTwinAnalysis = () => {
    if (!geometry || !analysisResult || !material) return;
    setIsAnalyzing(true);

    try {
      const meanDiameter = (geometry as any).meanDiameter || (geometry as any).largeOuterDiameter - geometry.wireDiameter;
      const freeLength = (geometry as any).freeLength || 50;

      // Crack initiation probability
      const crack = calculateCrackInitiationProbability(
        {
          meanStress: analysisResult.fatigue?.tauMean || 300,
          alternatingStress: analysisResult.fatigue?.tauAlt || 200,
          maxStress: analysisResult.stress?.tauEffective || 500,
          residualStress: -100,
        },
        { roughnessRa: 1.6, shotPeened: false },
        { corrosive: false, corrosionSeverity: 0, temperature: 20, humidity: 50 },
        'music_wire',
        material.tensileStrength || 1600
      );
      setCrackResult(crack);

      // Corrosion analysis
      const corrosion = analyzeCorrosion(
        { type: 'indoor_humid', humidity: 60, temperature: 25 },
        geometry.materialId,
        geometry.wireDiameter,
        material.snCurve?.tau2 || 400,
        analysisResult.stress?.tauEffective || 500,
        10
      );
      setCorrosionResult(corrosion);

      // Cost prediction
      const cost = predictCostAndYield({
        materialGrade: 'music_wire',
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength,
        toleranceClass: 'standard',
        surfaceTreatment: 'none',
        shotPeening: false,
        stressRelief: true,
        batchVolume: 1000,
        endType: 'closed_ground',
      });
      setCostResult(cost);

      // Harmonic response
      const harmonic = analyzeHarmonicResponse(
        {
          wireDiameter: geometry.wireDiameter,
          meanDiameter,
          activeCoils: geometry.activeCoils,
          freeLength,
          springRate: analysisResult.springRate,
          density: material.density || 7850,
          shearModulus: material.shearModulus || 79300,
          elasticModulus: material.elasticModulus || 207000,
        },
        { frequencyRange: { min: 1, max: 500 }, operatingRPM: 3000 }
      );
      setHarmonicResult(harmonic);

      // Health degradation
      const health = modelHealthDegradation(
        geometry.wireDiameter,
        freeLength,
        analysisResult.springRate,
        material.tensileStrength || 1600,
        material.snCurve?.tau2 || 400,
        {
          corrosionRate: 0.02,
          temperature: 25,
          meanStress: analysisResult.fatigue?.tauMean || 300,
          alternatingStress: analysisResult.fatigue?.tauAlt || 200,
          frequency: 10,
          cyclesPerYear: 1e6,
          humidity: 50,
        },
        'music_wire',
        20
      );
      setHealthResult(health);

    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!geometry || !analysisResult) {
    return <EmptyCard title="数字孪生分析" message="需要弹簧数据" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Phase 7: 数字孪生分析</h3>
        <Button onClick={runDigitalTwinAnalysis} disabled={isAnalyzing} className="gap-2">
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
          {crackResult ? '重新分析' : '运行分析'}
        </Button>
      </div>

      {!crackResult && !isAnalyzing && (
        <EmptyCard title="数字孪生" message='点击"运行分析"开始数字孪生仿真' />
      )}

      {isAnalyzing && <LoadingCard title="数字孪生分析" />}

      {crackResult && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Crack Initiation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                裂纹萌生概率
              </CardTitle>
              <CardDescription>Weibull分布疲劳分析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <DataRow label="B10寿命" value={`${crackResult.B10Life.toExponential(1)} cycles`} />
              <DataRow label="B50寿命" value={`${crackResult.B50Life.toExponential(1)} cycles`} />
              <DataRow label="特征寿命" value={`${crackResult.characteristicLife.toExponential(1)} cycles`} />
              <DataRow 
                label="风险等级" 
                value={crackResult.riskLevel.toUpperCase()}
                status={crackResult.riskLevel === 'low' ? 'good' : crackResult.riskLevel === 'medium' ? 'warning' : 'bad'}
              />
            </CardContent>
          </Card>

          {/* Corrosion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">腐蚀分析</CardTitle>
              <CardDescription>环境腐蚀影响评估</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <DataRow label="腐蚀速率" value={`${corrosionResult?.effectiveCorrosionRate.toFixed(4)} mm/年`} />
              <DataRow label="腐蚀疲劳因子" value={`${corrosionResult?.corrosionFatigueFactor.toFixed(2)}`} />
              <DataRow label="临界时间" value={`${corrosionResult?.timeToCritical.toFixed(1)} 年`} />
              <DataRow 
                label="点蚀风险" 
                value={corrosionResult?.pittingRisk || '-'}
                status={corrosionResult?.pittingRisk === 'low' ? 'good' : 'warning'}
              />
            </CardContent>
          </Card>

          {/* Cost Prediction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                成本与良率预测
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DataRow label="单件成本" value={`$${costResult?.costBreakdown.totalCostPerPiece.toFixed(3)}`} />
              <DataRow label="预期良率" value={`${costResult?.yieldPrediction.expectedYield.toFixed(1)}%`} status="good" />
              <DataRow label="Cpk" value={`${costResult?.yieldPrediction.cpk.toFixed(2)}`} />
              <DataRow 
                label="风险等级" 
                value={costResult?.riskFactors.riskLevel || '-'}
                status={costResult?.riskFactors.riskLevel === 'low' ? 'good' : 'warning'}
              />
            </CardContent>
          </Card>

          {/* Harmonic Response */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Waves className="h-4 w-4" />
                共振分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DataRow label="检测模态数" value={`${harmonicResult?.detectedModes.length || 0}`} />
              <DataRow 
                label="基频" 
                value={`${harmonicResult?.detectedModes[0]?.frequency.toFixed(0) || '-'} Hz`} 
              />
              <DataRow label="共振风险数" value={`${harmonicResult?.resonanceRisks.length || 0}`} />
              <DataRow 
                label="总体风险" 
                value={harmonicResult?.overallRisk || '-'}
                status={harmonicResult?.overallRisk === 'low' ? 'good' : 'warning'}
              />
            </CardContent>
          </Card>

          {/* Health Degradation */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">结构健康退化预测</CardTitle>
              <CardDescription>服役寿命预测</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{healthResult?.endOfLife.predictedEOL.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">预测寿命 (年)</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{healthResult?.endOfLife.recommendedReplacement.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">建议更换 (年)</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{healthResult?.endOfLife.limitingFactor}</p>
                  <p className="text-xs text-muted-foreground">限制因素</p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{(healthResult?.endOfLife.confidence || 0) * 100}%</p>
                  <p className="text-xs text-muted-foreground">置信度</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// FEA Tab Component
function FEATab({ geometry, analysisResult, material }: any) {
  const [feaScripts, setFeaScripts] = useState<FEAScriptResult | null>(null);
  const [hotspotResult, setHotspotResult] = useState<HotspotTrackingResult | null>(null);

  const generateScripts = () => {
    if (!geometry || !analysisResult || !material) return;

    const meanDiameter = (geometry as any).meanDiameter || (geometry as any).largeOuterDiameter - geometry.wireDiameter;
    const freeLength = (geometry as any).freeLength || 50;

    const scripts = generateFEAScripts({
      geometry,
      loadCases: [
        { name: 'Preload', type: 'axial', axialDisplacement: freeLength * 0.1 },
        { name: 'Working', type: 'axial', axialDisplacement: freeLength * 0.2 },
        { name: 'Max_Load', type: 'axial', axialDisplacement: freeLength * 0.3 },
      ],
      meshSettings: {
        globalSize: geometry.wireDiameter / 4,
        refinementFactor: 3,
        elementType: 'quadratic',
        circumferentialDivisions: 16,
      },
      materialModel: 'elastoplastic',
      outputRequests: {
        stress: true,
        displacement: true,
        strain: true,
        fatigueLife: true,
        safetyFactor: true,
        contourImages: true,
      },
    });
    setFeaScripts(scripts);

    // Hotspot analysis
    const hotspots = analyzeFractureHotspots(
      {
        type: geometry.type,
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength,
        endType: 'closed_ground',
      },
      {
        maxShearStress: analysisResult.stress?.tauEffective || 500,
        meanShearStress: analysisResult.fatigue?.tauMean || 300,
        alternatingShearStress: analysisResult.fatigue?.tauAlt || 200,
      },
      material.tensileStrength || 1600
    );
    setHotspotResult(hotspots);
  };

  if (!geometry || !analysisResult) {
    return <EmptyCard title="FEA仿真" message="需要弹簧数据" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">FEA 自动求解器</h3>
        <Button onClick={generateScripts} className="gap-2">
          <Target className="h-4 w-4" />
          生成FEA脚本
        </Button>
      </div>

      {!feaScripts && (
        <EmptyCard title="FEA脚本生成" message='点击"生成FEA脚本"创建Abaqus/ANSYS求解器脚本' />
      )}

      {feaScripts && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Abaqus Script */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Abaqus CAE 脚本</CardTitle>
              <CardDescription>Python脚本用于Abaqus求解器</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs font-mono max-h-40 overflow-auto">
                {feaScripts.abaqusScript.slice(0, 500)}...
              </div>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => downloadFEAScript(feaScripts.abaqusScript, feaScripts.filename.abaqus, 'abaqus')}
              >
                <Download className="h-4 w-4" />
                下载 Abaqus 脚本 (.py)
              </Button>
            </CardContent>
          </Card>

          {/* ANSYS Script */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ANSYS APDL 脚本</CardTitle>
              <CardDescription>APDL命令文件用于ANSYS求解器</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs font-mono max-h-40 overflow-auto">
                {feaScripts.ansysScript.slice(0, 500)}...
              </div>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => downloadFEAScript(feaScripts.ansysScript, feaScripts.filename.ansys, 'ansys')}
              >
                <Download className="h-4 w-4" />
                下载 ANSYS 脚本 (.inp)
              </Button>
            </CardContent>
          </Card>

          {/* Hotspot Analysis */}
          {hotspotResult && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">应力热点分析</CardTitle>
                <CardDescription>断裂风险区域识别</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-2xl font-bold">{hotspotResult.hotspots.length}</p>
                    <p className="text-xs text-muted-foreground">总热点数</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{hotspotResult.criticalHotspots.length}</p>
                    <p className="text-xs text-muted-foreground">高风险热点</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{hotspotResult.nucleationSites.length}</p>
                    <p className="text-xs text-muted-foreground">裂纹萌生点</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${
                    hotspotResult.overallRisk === 'low' ? 'bg-green-50 dark:bg-green-950' :
                    hotspotResult.overallRisk === 'medium' ? 'bg-yellow-50 dark:bg-yellow-950' :
                    'bg-red-50 dark:bg-red-950'
                  }`}>
                    <p className={`text-2xl font-bold ${
                      hotspotResult.overallRisk === 'low' ? 'text-green-600' :
                      hotspotResult.overallRisk === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>{hotspotResult.overallRisk.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">总体风险</p>
                  </div>
                </div>

                {hotspotResult.recommendations.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm font-medium mb-2">建议:</p>
                    <ul className="text-xs space-y-1">
                      {hotspotResult.recommendations.map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Torsion Spring Analysis Tab Component
function TorsionAnalysisTab({ data, isRunning }: { data: TorsionAdvancedAnalysisResult | null; isRunning: boolean }) {
  if (isRunning) {
    return <LoadingCard title="扭簧高级分析" />;
  }

  if (!data) {
    return <EmptyCard title="扭簧高级分析" message='点击"开始分析"运行扭簧高级分析' />;
  }

  const { mass, frequency, stressDistribution, dynamic, fatigue } = data;

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            高级工程分析
            <Badge variant={data.overallStatus === 'PASS' ? 'default' : data.overallStatus === 'CAUTION' ? 'secondary' : 'destructive'}>
              {data.overallStatus}
            </Badge>
          </CardTitle>
          <CardDescription>动力学·温度·蠕变·环境判定</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold">{mass.totalMass.toFixed(2)} g</p>
              <p className="text-xs text-muted-foreground">弹簧质量</p>
            </div>
            <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold">{frequency.naturalFrequency.toFixed(1)} Hz</p>
              <p className="text-xs text-muted-foreground">固有频率 fn</p>
            </div>
            <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold">{frequency.shockWaveVelocity.toFixed(0)} m/s</p>
              <p className="text-xs text-muted-foreground">冲击波速度</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${
              dynamic.riskLevel === 'LOW RISK' ? 'bg-green-50 dark:bg-green-950' :
              dynamic.riskLevel === 'MEDIUM RISK' ? 'bg-yellow-50 dark:bg-yellow-950' :
              'bg-red-50 dark:bg-red-950'
            }`}>
              <p className={`text-lg font-bold ${
                dynamic.riskLevel === 'LOW RISK' ? 'text-green-600' :
                dynamic.riskLevel === 'MEDIUM RISK' ? 'text-yellow-600' :
                'text-red-600'
              }`}>{dynamic.riskLevel}</p>
              <p className="text-xs text-muted-foreground">智能诊断</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stress Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">应力分布分析</CardTitle>
            <CardDescription>弯曲应力分布与热点识别</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow label="最大应力" value={`${stressDistribution.maxStress.toFixed(0)} MPa`} />
            <DataRow label="平均应力" value={`${stressDistribution.avgStress.toFixed(0)} MPa`} />
            <DataRow label="应力修正系数 Ki" value={stressDistribution.stressCorrectionFactor.toFixed(3)} />
            <DataRow 
              label="临界区域" 
              value={`${stressDistribution.criticalRegions}`}
              status={stressDistribution.criticalRegions === 0 ? 'good' : 'warning'}
            />
            <DataRow 
              label="热点数" 
              value={`${stressDistribution.hotspotCount}`}
              status={stressDistribution.hotspotCount === 0 ? 'good' : 'warning'}
            />
          </CardContent>
        </Card>

        {/* Fatigue Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">疲劳与安全</CardTitle>
            <CardDescription>疲劳寿命与安全系数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow 
              label="估计寿命" 
              value={fatigue.estimatedLife >= 1e9 ? '∞ (无限)' : `${fatigue.estimatedLife.toExponential(2)} 次`}
              status={fatigue.estimatedLife >= 1e6 ? 'good' : 'warning'}
            />
            <DataRow 
              label="安全系数" 
              value={fatigue.safetyFactor.toFixed(2)}
              status={fatigue.safetyFactor >= 1.5 ? 'good' : fatigue.safetyFactor >= 1.0 ? 'warning' : 'bad'}
            />
            <DataRow label="安全率" value={`${fatigue.safetyFactorPercent.toFixed(0)}%`} />
            <DataRow label="平均应力" value={`${fatigue.meanStress.toFixed(1)} MPa`} />
            <DataRow label="交变应力" value={`${fatigue.alternatingStress.toFixed(1)} MPa`} />
          </CardContent>
        </Card>

        {/* Mass & Geometry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">质量与几何</CardTitle>
            <CardDescription>弹簧质量分布</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow label="总质量" value={`${mass.totalMass.toFixed(2)} g`} />
            <DataRow label="线圈质量" value={`${mass.bodyMass.toFixed(2)} g`} />
            <DataRow label="腿1质量" value={`${mass.leg1Mass.toFixed(2)} g`} />
            <DataRow label="腿2质量" value={`${mass.leg2Mass.toFixed(2)} g`} />
            <DataRow label="总线长" value={`${mass.totalWireLength.toFixed(1)} mm`} />
          </CardContent>
        </Card>

        {/* Dynamic Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">动力学分析</CardTitle>
            <CardDescription>频率与惯性</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow label="固有频率" value={`${frequency.naturalFrequency.toFixed(1)} Hz`} />
            <DataRow label="角频率" value={`${frequency.angularFrequency.toFixed(1)} rad/s`} />
            <DataRow label="转动惯量" value={`${frequency.momentOfInertia.toFixed(4)} kg·mm²`} />
            <DataRow label="扭转刚度" value={`${frequency.torsionalStiffness.toFixed(2)} N·mm/rad`} />
          </CardContent>
        </Card>

        {/* Environmental */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">环境影响</CardTitle>
            <CardDescription>温度与蠕变</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow label="温度影响" value={`${dynamic.temperatureEffect.toFixed(2)}%`} />
            <DataRow label="蠕变系数" value={dynamic.creepFactor.toFixed(4)} />
            <DataRow 
              label="环境评级" 
              value={dynamic.environmentalRating}
              status={dynamic.environmentalRating === 'PASS' ? 'good' : dynamic.environmentalRating === 'CAUTION' ? 'warning' : 'bad'}
            />
          </CardContent>
        </Card>

        {/* Stress Hotspots Table */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">应力热点</CardTitle>
            <CardDescription>高应力区域位置</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 max-h-40 overflow-auto">
              <div className="grid grid-cols-3 font-medium border-b pb-1">
                <span>位置</span>
                <span>圈数</span>
                <span>应力</span>
              </div>
              {stressDistribution.points
                .filter(p => p.isHotspot)
                .slice(0, 5)
                .map((point, i) => (
                  <div key={i} className="grid grid-cols-3 py-1">
                    <span>θ = {point.theta.toFixed(0)}°</span>
                    <span>{point.coilNumber.toFixed(1)}</span>
                    <span className="text-red-600">{point.bendingStress.toFixed(0)} MPa</span>
                  </div>
                ))}
              {stressDistribution.hotspotCount === 0 && (
                <p className="text-green-600 py-2">无高应力热点 ✓</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
