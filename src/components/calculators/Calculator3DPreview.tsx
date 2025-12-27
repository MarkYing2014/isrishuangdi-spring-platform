"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useSpringDesignStore } from "@/lib/stores/springDesignStore";
import type { SpringType } from "@/lib/springTypes";

import type { SpringPreviewParams } from "@/components/cad/CadPreview3D";

const CadPreview3D = dynamic(
  () => import("@/components/cad/CadPreview3D").then((mod) => mod.CadPreview3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);

const SpiralTorsionSpringVisualizer = dynamic(
  () => import("@/components/three/SpiralTorsionSpringMesh").then((mod) => mod.SpiralTorsionSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);
const DieSpringVisualizer = dynamic(
  () => import("@/components/three/DieSpringVisualizer").then((mod) => mod.DieSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);
const VariablePitchCompressionSpringVisualizer = dynamic(
  () => import("@/components/three/VariablePitchCompressionSpringVisualizer").then((mod) => mod.VariablePitchCompressionSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);
const ArcSpringVisualizer = dynamic(
  () => import("@/components/three/ArcSpringMesh").then((mod) => mod.ArcSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);

const DiskSpringVisualizer = dynamic(
  () => import("@/components/three/DiskSpringVisualizer").then((mod) => mod.DiskSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);

const WaveSpringVisualizer = dynamic(
  () => import("@/components/three/WaveSpringVisualizer").then((mod) => mod.WaveSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);

export function Calculator3DPreview({
  expectedType,
  heightClassName = "h-[420px]",
  geometryOverride,
  showStressColors,
  stressUtilization,
  stressBeta,
}: {
  expectedType: SpringType;
  heightClassName?: string;
  geometryOverride?: any;
  showStressColors?: boolean;
  stressUtilization?: number;
  stressBeta?: number;
}) {
  const storedGeometry = useSpringDesignStore((s) => s.geometry);
  const geometry = geometryOverride ?? storedGeometry;
  
  const material = useSpringDesignStore((s) => s.material);
  const analysis = useSpringDesignStore((s) => s.analysisResult);

  // Animation State - STANDARD STROKE MODEL
  const [isAnimating, setIsAnimating] = useState(false);
  const [previewStrokeMm, setPreviewStrokeMm] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1);

  // Determine max play stroke (Engineering Cap)
  const { strokeMaxForPlay, isPlayable, disabledReason } = useMemo(() => {
    if (!geometry) return { strokeMaxForPlay: 0, isPlayable: false, disabledReason: "No geometry" };
    
    // Helper to validate number
    const isValid = (n: number | undefined | null): n is number => typeof n === 'number' && !isNaN(n) && n > 0;

    let limit = 0;
    
    // 1. Calculate Geometric Limit based on Solid Height (Physical constraint)
    // This is the most reliable "max travel"
    if (geometry.type === 'variablePitchCompression') {
        // Calculate exact gap total for playback limit
        const d = geometry.wireDiameter ?? 0;
        const segs = geometry.segments ?? [];
        const gapTotal = segs.reduce((acc: number, s: any) => {
             const n = s.coils ?? 0;
             const p = s.pitch ?? 0;
             const g = Math.max(0, p - d);
             return acc + n * g;
        }, 0);
        limit = gapTotal > 0 ? gapTotal : 0;
    } else if (geometry.type === 'compression' || geometry.type === 'conical' || geometry.type === 'dieSpring') {
       const L0 = geometry.freeLength;
       // Estimate solid height if not provided (approximate)
       const Hs = analysis?.solidHeight ?? (geometry.totalCoils ?? geometry.activeCoils ?? 0) * (geometry.wireDiameter ?? 0);
       
       if (isValid(L0) && isValid(Hs)) {
           limit = Math.max(0, L0! - Hs);
       }
    } else if (geometry.type === 'wave') {
        const L0 = geometry.freeHeight_Hf;
        // Wave spring solid height = Nt * t
        const Hs = (geometry.turns_Nt ?? 0) * (geometry.thickness_t ?? 0);
        if (isValid(L0) && isValid(Hs)) {
            limit = Math.max(0, L0! - Hs);
        }
    } else if (geometry.type === 'extension') {
       // Extension max travel is usually determined by max safe stress, but physically it's L0 * something
       if (isValid(geometry.freeLength)) limit = geometry.freeLength; 
    } else if (geometry.type === 'torsion') {
       limit = geometry.workingAngle ?? 90;
    } else if (geometry.type === 'arc') {
       // s = r * Δa (rad)
       const alphaFree = geometry.unloadedAngle;
       const alphaSolid = geometry.solidAngle ?? 0;
       const radius = geometry.workingRadius;
       if (isValid(alphaFree) && isValid(radius)) {
           // strokeMax = (alphaFree - alphaSolid) * (PI/180) * radius
           limit = Math.max(0, (alphaFree - alphaSolid) * (Math.PI / 180) * radius);
       }
    } else {
       limit = 360; // Spiral/Other
    }

    // 2. If Analysis provides a valid max deflection (e.g. limit to stress), use it IF it's within reason?
    // Actually, for "Play", we usually want to see the full stroke to solid, even if it yields.
    // So we prioritize the Physical Limit (limit) calculated above if compression.
    
    // Fallback if limit is 0 (e.g. missing data)
    if (limit <= 0) {
        if (isValid(analysis?.maxDeflection)) limit = analysis!.maxDeflection;
        else if (isValid(analysis?.workingDeflection)) limit = analysis!.workingDeflection * 1.5;
        else if (isValid(geometry.freeLength)) limit = geometry.freeLength * 0.5;
        else limit = 50;
    }

    // specific check for solid height reached
    if (limit <= 1e-3) {
        return { strokeMaxForPlay: 0, isPlayable: false, disabledReason: "No playable range (Solid Height)" };
    }

    return { strokeMaxForPlay: limit, isPlayable: true, disabledReason: null };
  }, [geometry, analysis]);

  // Animation Loop - Drives previewStrokeMm
  useEffect(() => {
    if (!isAnimating || !isPlayable) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        return;
    }

    const animate = (currentTime: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = currentTime;
        const deltaTime = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;
        
        // Speed: Traverse full range in 2 seconds
        const speed = (strokeMaxForPlay || 50) / 2; 
        const delta = (Math.min(deltaTime, 100) / 1000) * speed * directionRef.current;
        
        setPreviewStrokeMm(prev => {
            let next = prev + delta;
            if (next >= strokeMaxForPlay) {
                next = strokeMaxForPlay;
                directionRef.current = -1;
            } else if (next <= 0) {
                next = 0;
                directionRef.current = 1;
            }
            return next;
        });
        
        animationRef.current = requestAnimationFrame(animate);
    };
    
    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating, strokeMaxForPlay, isPlayable]);


  // Use animated value if playing, else static working deflection
  const displayStrokeMm = isAnimating ? previewStrokeMm : (analysis?.workingDeflection ?? 0);
  
  // Handlers
  const toggleAnimation = () => setIsAnimating(p => !p);

  // Stable CAD Params - Memoized WITHOUT displayDeflection dependency
  const cadParams = useMemo(() => {
    if (!geometry) return null;
    
    const shearModulus = geometry.shearModulus ?? material?.shearModulus ?? 79300;
    const springRate = analysis?.springRate ?? 10;

    if (geometry.type === "compression") {
      return {
        type: "compression",
        wireDiameter: geometry.wireDiameter,
        meanDiameter: geometry.meanDiameter,
        activeCoils: geometry.activeCoils,
        totalCoils: geometry.totalCoils,
        freeLength: geometry.freeLength,
        shearModulus,
        springRate,
      } as SpringPreviewParams;
    }

    if (geometry.type === "extension") {
      const meanDiameter = geometry.meanDiameter ?? geometry.outerDiameter - geometry.wireDiameter;
      return {
        type: "extension",
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength: geometry.freeLength,
        shearModulus,
        springRate,
        hookType: geometry.hookType,
        initialTension: geometry.initialTension ?? analysis?.initialTension,
        bodyLength: geometry.bodyLength,
      } as SpringPreviewParams;
    }

    if (geometry.type === "torsion") {
      return {
        type: "torsion",
        wireDiameter: geometry.wireDiameter,
        meanDiameter: geometry.meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength: 0,
        shearModulus,
        springRate,
        legLength1: geometry.legLength1,
        legLength2: geometry.legLength2,
        windingDirection: geometry.windingDirection ?? "right",
        freeAngle: geometry.freeAngle ?? geometry.workingAngle ?? 90,
        bodyLength: geometry.bodyLength,
      } as SpringPreviewParams;
    }

    if (geometry.type === "conical") {
      const meanDiameter = 0.5 * (geometry.largeOuterDiameter + geometry.smallOuterDiameter) - geometry.wireDiameter;
      return {
        type: "conical",
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength: geometry.freeLength,
        shearModulus,
        springRate,
        largeDiameter: geometry.largeOuterDiameter,
        smallDiameter: geometry.smallOuterDiameter,
      } as SpringPreviewParams;
    }

    return null;
  }, [geometry, material?.shearModulus, analysis?.springRate, analysis?.initialTension]);

  const preview = useMemo(() => {
    if (!geometry) return null;
    if (geometry.type !== expectedType) return null;

    if (geometry.type === "spiralTorsion") {
      const workingTurns = geometry.activeCoils + (displayStrokeMm) / 360;
      return (
        <SpiralTorsionSpringVisualizer
          innerDiameter={geometry.innerDiameter}
          outerDiameter={geometry.outerDiameter}
          turns={workingTurns}
          stripWidth={geometry.stripWidth}
          stripThickness={geometry.stripThickness}
          handedness={geometry.windingDirection ?? "cw"}
          autoRotate={false}
          springRate={analysis?.springRate}
        />
      );
    }

    if (geometry.type === "wave") {
      // Logic adjusted for displayDeflection
      const deflection = displayStrokeMm;
      const freeHeight = geometry.freeHeight_Hf;
      const workingHeight = Math.max(geometry.turns_Nt * geometry.thickness_t, freeHeight - deflection);
      
      const workingAmplitude = (workingHeight - (geometry.turns_Nt * geometry.thickness_t)) / (2 * geometry.turns_Nt * geometry.wavesPerTurn_Nw);

      return (
        <WaveSpringVisualizer
          meanDiameter={geometry.od - geometry.radialWall_b}
          thickness={geometry.thickness_t}
          width={geometry.radialWall_b}
          amplitude={workingAmplitude}
          waves={geometry.wavesPerTurn_Nw}
          turns={geometry.turns_Nt}
          color="#6b9bd1"
          springRate={analysis?.springRate}
          loadAtWorkingHeight={analysis?.workingLoad}
        />
      );
    }

    if (geometry.type === "dieSpring") {
       return (
        <DieSpringVisualizer
          outerDiameter={geometry.outerDiameter}
          wireThickness={geometry.wireThickness}
          wireWidth={geometry.wireWidth}
          coils={geometry.totalCoils}
          freeLength={geometry.freeLength}
          endStyle={geometry.endStyle ?? "closed_ground"}
          duty={geometry.duty ?? "MD"}
          risk={geometry.risk ?? "low"}
          autoRotate={false} 
          backgroundColor="#f8fafc"
          springRate={analysis?.springRate}
          solidHeight={analysis?.solidHeight}
          deflection={displayStrokeMm}
        />
      );
    }

    if (geometry.type === "variablePitchCompression") {
      return (
        <VariablePitchCompressionSpringVisualizer
          wireDiameter={geometry.wireDiameter}
          meanDiameter={geometry.meanDiameter}
          shearModulus={geometry.shearModulus ?? material?.shearModulus ?? 79300}
          activeCoils0={geometry.activeCoils}
          totalCoils={geometry.totalCoils}
          freeLength={geometry.freeLength}
          segments={geometry.segments}
          deflection={displayStrokeMm}
          springRate={analysis?.springRate}
          previewStrokeMm={isAnimating ? previewStrokeMm : undefined}
        />
      );
    }

    if (geometry.type === "disk") {
      return (
        <DiskSpringVisualizer
          outerDiameter={geometry.outerDiameter}
          innerDiameter={geometry.innerDiameter}
          thickness={geometry.thickness}
          freeConeHeight={geometry.freeConeHeight}
          deflection={displayStrokeMm}
          nP={geometry.parallelCount}
          nS={geometry.seriesCount}
          showStressColors={showStressColors}
          stressUtilization={stressUtilization}
          springRate={analysis?.springRate}
        />
      );
    }

    if (geometry.type === "arc") {
      return (
        <ArcSpringVisualizer
          d={geometry.wireDiameter}
          D={geometry.meanDiameter}
          n={geometry.coils}
          r={geometry.workingRadius}
          alpha0Deg={geometry.unloadedAngle}
          previewStrokeMm={isAnimating ? previewStrokeMm : (analysis?.workingDeflection ?? 0)}
          alphaFreeDeg={geometry.unloadedAngle}
          alphaSolidDeg={geometry.solidAngle}
          arcRadiusMm={geometry.workingRadius}
          colorMode={showStressColors ? "approx_stress" : "solid"}
          approxStressBeta={stressBeta ?? 0.25}
        />
      );
    }

    // For CadPreview3D types, use stable params and pass deflection override
    if (cadParams) {
      return <CadPreview3D params={cadParams} className={"w-full " + heightClassName} deflectionOverride={displayStrokeMm} />;
    }

    return null;
  }, [geometry, analysis, cadParams, expectedType, heightClassName, showStressColors, stressUtilization, displayStrokeMm]);

  if (!geometry || geometry.type !== expectedType) {
    return (
      <div className={"w-full " + heightClassName + " flex items-center justify-center rounded-lg border bg-muted/20"}>
        <p className="text-sm text-muted-foreground">请先计算以生成 3D 预览</p>
      </div>
    );
  }

  return (
    <div className={"w-full " + heightClassName + " relative overflow-hidden rounded-lg border bg-slate-50"}>
      {preview}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <Button
          variant={isAnimating ? "default" : "secondary"}
          size="sm"
          className="h-8 px-3 text-xs gap-1 opacity-90 hover:opacity-100 disabled:opacity-50"
          onClick={toggleAnimation}
          disabled={!isPlayable}
          title={disabledReason || (isAnimating ? "Stop Animation" : "Play Animation")}
        >
          {isAnimating ? "⏸ Pause" : "▶ Play"}
        </Button>
      </div>

      {/* Status Overlay - Real-time Data (数据跳动) */}
      <div className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm border rounded shadow-sm z-10 min-w-[140px] text-[10px] space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-slate-500 uppercase font-semibold">Stroke</span>
          <span className="font-mono text-blue-600">{displayStrokeMm.toFixed(2)} mm</span>
        </div>
        
        {expectedType === 'arc' && geometry.type === 'arc' && (
          <div className="flex justify-between items-center gap-4 border-t pt-1 border-slate-200">
            <span className="text-slate-500 uppercase font-semibold">Angle (α)</span>
            <span className="font-mono text-orange-600">
              {Math.max(geometry.solidAngle, geometry.unloadedAngle - (displayStrokeMm / geometry.workingRadius) * (180 / Math.PI)).toFixed(1)}°
            </span>
          </div>
        )}

        <div className="flex justify-between items-center gap-4 border-t pt-1 border-slate-200">
          <span className="text-slate-500 uppercase font-semibold">Utilization</span>
          <span className={`font-mono font-bold ${ (displayStrokeMm / (strokeMaxForPlay || 1)) > 0.9 ? 'text-red-500' : 'text-slate-700'}`}>
            {((displayStrokeMm / (strokeMaxForPlay || 1)) * 100).toFixed(1)}%
          </span>
        </div>

        {analysis?.springRate !== undefined && (
          <div className="flex justify-between items-center gap-4 border-t pt-1 border-slate-200">
            <span className="text-slate-500 uppercase font-semibold">Load (F)</span>
            <span className="font-mono text-green-600">
              {(displayStrokeMm * analysis.springRate).toFixed(1)} N
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
