"use client";

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { 
  useSpringSimulationStore,
  type CompressionDesignMeta,
  type ExtensionDesignMeta,
  type TorsionDesignMeta,
  type ConicalDesignMeta,
  type LinearCurvePoint,
} from "@/lib/stores/springSimulationStore";
import { CompressionSpringVisualizer } from "@/components/three/CompressionSpringVisualizer";
import { ExtensionSpringVisualizer } from "@/components/three/ExtensionSpringVisualizer";
import { TorsionSpringVisualizer } from "@/components/three/TorsionSpringVisualizer";
import { ConicalSpringVisualizer } from "@/components/three/ConicalSpringVisualizer";
import { VariablePitchCompressionSpringVisualizer } from "@/components/three/VariablePitchCompressionSpringVisualizer";
import type { ExtensionHookType } from "@/lib/springTypes";

export interface SpringPreviewParams {
  type: 'compression' | 'extension' | 'torsion' | 'conical' | 'variablePitchCompression';
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  totalCoils?: number;
  freeLength?: number;
  shearModulus?: number;
  springRate?: number;
  hookType?: ExtensionHookType;
  initialTension?: number;
  bodyLength?: number;
  legLength1?: number;
  legLength2?: number;
  windingDirection?: 'left' | 'right';
  largeDiameter?: number;
  smallDiameter?: number;
  topGround?: boolean;
  bottomGround?: boolean;
  // Torsion-specific: free leg angle in degrees
  freeAngle?: number;
}

interface CadPreview3DProps {
  params: SpringPreviewParams;
  className?: string;
  deflectionOverride?: number;
}

function generateLinearCurve(springRate: number, maxDeflection: number): LinearCurvePoint[] {
  const points: LinearCurvePoint[] = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const deflection = (i / steps) * maxDeflection;
    points.push({ deflection, load: springRate * deflection });
  }
  return points;
}

export function CadPreview3D({ params, className = "", deflectionOverride }: CadPreview3DProps) {
  const initializeCompression = useSpringSimulationStore(state => state.initializeCompression);
  const initializeExtension = useSpringSimulationStore(state => state.initializeExtension);
  const initializeTorsion = useSpringSimulationStore(state => state.initializeTorsion);
  const initializeConical = useSpringSimulationStore(state => state.initializeConical);
  const reset = useSpringSimulationStore(state => state.reset);
  const setDeflection = useSpringSimulationStore(state => state.setDeflection);
  const currentDesign = useSpringSimulationStore(state => state.design);
  
  // Update deflection from override without re-initializing
  useEffect(() => {
    if (deflectionOverride !== undefined) {
      setDeflection(deflectionOverride);
    }
  }, [deflectionOverride, setDeflection]);

  // Force re-render on deflection change by using it as a key for an internal effect or just relying on store
  // The issue might be that the store update is not propagating fast enough or is being blocked.
  // Let's add a direct imperative update potentially or check if we receive it.


  useEffect(() => {
    const {
      type, wireDiameter, meanDiameter, activeCoils,
      freeLength = 50, shearModulus = 79300, springRate = 10,
      hookType = 'machine', initialTension = 5, bodyLength,
      legLength1 = 25, legLength2 = 25, windingDirection = 'right',
      freeAngle = 90,
      largeDiameter, smallDiameter,
    } = params;
    
    // Calculate max deflection for simulation range
    // Ensure it's at least enough to cover the override
    const calculatedMax = freeLength * (type === 'compression' || type === 'conical' ? 0.8 : 0.5);
    const maxDeflection = Math.max(calculatedMax, deflectionOverride ?? 0);

    const curve = generateLinearCurve(springRate, maxDeflection);
    
    switch (type) {
      case 'compression': {
        const design: CompressionDesignMeta = {
          type: 'compression', wireDiameter, meanDiameter, activeCoils,
          freeLength, shearModulus, springRate,
        };
        initializeCompression(curve, design, maxDeflection);
        break;
      }
      case 'extension': {
        const outerDiameter = meanDiameter + wireDiameter;
        const calculatedBodyLength = bodyLength ?? activeCoils * wireDiameter;
        const freeLengthInsideHooks = freeLength ?? (calculatedBodyLength + wireDiameter * 4);
        const design: ExtensionDesignMeta = {
          type: 'extension', wireDiameter, outerDiameter, activeCoils,
          bodyLength: calculatedBodyLength,
          freeLengthInsideHooks,
          shearModulus, springRate, initialTension, hookType,
        };
        initializeExtension(curve, design, maxDeflection);
        break;
      }
      case 'torsion': {
        const calculatedBodyLength = bodyLength ?? activeCoils * wireDiameter * 1.1;
        const design: TorsionDesignMeta = {
          type: 'torsion', wireDiameter, meanDiameter, activeCoils,
          bodyLength: calculatedBodyLength, pitch: wireDiameter * 1.1,
          legLength1, legLength2, freeAngle,
          shearModulus, springRate, windingDirection,
        };
        initializeTorsion(curve, design, maxDeflection);
        break;
      }
      case 'conical': {
        const largeOD = largeDiameter ?? meanDiameter * 1.5;
        const smallOD = smallDiameter ?? meanDiameter * 0.5;
        const design: ConicalDesignMeta = {
          type: 'conical', wireDiameter,
          largeOuterDiameter: largeOD, smallOuterDiameter: smallOD,
          activeCoils, freeLength,
          solidHeight: activeCoils * wireDiameter,
          totalDeflectionCapacity: freeLength - activeCoils * wireDiameter,
        };
        const conicalCurve = curve.map((p) => ({
          x: p.deflection, load: p.load, k: springRate,
          collapsedCoils: 0, activeCoils, stageIndex: 0,
        }));
        initializeConical(conicalCurve, design, maxDeflection);
        break;
      }
    }
    return () => { reset(); };
  }, [params, initializeCompression, initializeExtension, initializeTorsion, initializeConical, reset]);
  
  if (!currentDesign) {
    return (
      <div className={"flex items-center justify-center bg-slate-50 rounded-lg " + className}>
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }
  
  return (
    <div className={className}>
      {params.type === 'compression' && <CompressionSpringVisualizer previewStrokeMm={deflectionOverride} />}
      {params.type === 'extension' && <ExtensionSpringVisualizer previewStrokeMm={deflectionOverride} />}
      {params.type === 'torsion' && <TorsionSpringVisualizer previewStrokeMm={deflectionOverride} />}
      {params.type === 'conical' && <ConicalSpringVisualizer hideControls={deflectionOverride !== undefined} />}
      {params.type === 'variablePitchCompression' && (
        <VariablePitchCompressionSpringVisualizer 
          previewStrokeMm={deflectionOverride} 
          deflection={deflectionOverride ?? 0} 
          segments={[]} 
          wireDiameter={params.wireDiameter} 
          meanDiameter={params.meanDiameter} 
          shearModulus={params.shearModulus ?? 79000} 
          activeCoils0={params.activeCoils} 
          totalCoils={params.totalCoils ?? params.activeCoils + 2} 
        />
      )}
    </div>
  );
}

export default CadPreview3D;
