"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

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

export function Calculator3DPreview({
  expectedType,
  heightClassName = "h-[420px]",
}: {
  expectedType: SpringType;
  heightClassName?: string;
}) {
  const geometry = useSpringDesignStore((s) => s.geometry);
  const material = useSpringDesignStore((s) => s.material);
  const analysis = useSpringDesignStore((s) => s.analysisResult);

  const preview = useMemo(() => {
    if (!geometry) return null;
    if (geometry.type !== expectedType) return null;

    if (geometry.type === "spiralTorsion") {
      return (
        <SpiralTorsionSpringVisualizer
          innerDiameter={geometry.innerDiameter}
          outerDiameter={geometry.outerDiameter}
          turns={geometry.activeCoils}
          stripWidth={geometry.stripWidth}
          stripThickness={geometry.stripThickness}
          handedness={geometry.windingDirection ?? "cw"}
          autoRotate={false}
        />
      );
    }

    // dieSpring has its own dedicated visualizer in DieSpringCalculator
    if (geometry.type === "dieSpring") {
      return null;
    }
    
    // waveSpring has its own visualizer or is not supported here yet
    if (geometry.type === "wave") {
      return null;
    }

    const shearModulus = geometry.shearModulus ?? material?.shearModulus ?? 79300;

    const springRate = analysis?.springRate ?? 10;

    const maxDeflectionUsed =
      analysis?.maxDeflection ??
      analysis?.workingDeflection ??
      (geometry.type === "torsion" ? geometry.workingAngle ?? geometry.thetaDo ?? 90 : 25);

    if (geometry.type === "compression") {
      const params: SpringPreviewParams = {
        type: "compression",
        wireDiameter: geometry.wireDiameter,
        meanDiameter: geometry.meanDiameter,
        activeCoils: geometry.activeCoils,
        totalCoils: geometry.totalCoils,
        freeLength: geometry.freeLength,
        shearModulus,
        springRate,
      };
      return <CadPreview3D params={params} className={"w-full " + heightClassName} />;
    }

    if (geometry.type === "extension") {
      const meanDiameter =
        geometry.meanDiameter ?? geometry.outerDiameter - geometry.wireDiameter;

      // Use actual freeLength from geometry (钩内自由长度), fallback to calculated value
      const freeLengthUsed = geometry.freeLength ?? Math.max(1e-6, maxDeflectionUsed * 2);

      const params: SpringPreviewParams = {
        type: "extension",
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength: freeLengthUsed,
        shearModulus,
        springRate,
        hookType: geometry.hookType,
        initialTension: geometry.initialTension ?? analysis?.initialTension,
        bodyLength: geometry.bodyLength,
      };
      return <CadPreview3D params={params} className={"w-full " + heightClassName} />;
    }

    if (geometry.type === "torsion") {
      const freeLengthUsed = Math.max(1e-6, maxDeflectionUsed * 2);
      const params: SpringPreviewParams = {
        type: "torsion",
        wireDiameter: geometry.wireDiameter,
        meanDiameter: geometry.meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength: freeLengthUsed,
        shearModulus,
        springRate,
        legLength1: geometry.legLength1,
        legLength2: geometry.legLength2,
        windingDirection: geometry.windingDirection ?? "right",
        freeAngle: geometry.freeAngle ?? geometry.workingAngle ?? 90,
        bodyLength: geometry.bodyLength,
      };
      return <CadPreview3D params={params} className={"w-full " + heightClassName} />;
    }

    if (geometry.type === "conical") {
      const meanDiameter =
        0.5 * (geometry.largeOuterDiameter + geometry.smallOuterDiameter) - geometry.wireDiameter;

      const params: SpringPreviewParams = {
        type: "conical",
        wireDiameter: geometry.wireDiameter,
        meanDiameter,
        activeCoils: geometry.activeCoils,
        freeLength: geometry.freeLength,
        shearModulus,
        springRate,
        largeDiameter: geometry.largeOuterDiameter,
        smallDiameter: geometry.smallOuterDiameter,
      };
      return <CadPreview3D params={params} className={"w-full " + heightClassName} />;
    }

    return null;
  }, [analysis?.initialTension, analysis?.maxDeflection, analysis?.springRate, analysis?.workingDeflection, expectedType, geometry, heightClassName, material?.shearModulus]);

  if (!geometry || geometry.type !== expectedType) {
    return (
      <div className={"w-full " + heightClassName + " flex items-center justify-center rounded-lg border bg-muted/20"}>
        <p className="text-sm text-muted-foreground">请先计算以生成 3D 预览</p>
      </div>
    );
  }

  return <div className={"w-full " + heightClassName + " overflow-hidden rounded-lg border bg-slate-50"}>{preview}</div>;
}
