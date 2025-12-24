"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { SpringModel } from "@/components/three/SpringModel";
import { CoilerArms } from "@/components/three/CoilerArms";
import { WireFeed } from "@/components/three/WireFeed";
import { SpringDesign, CompressionSpringDesign, isCompressionDesign } from "@/lib/springTypes";
import { getMeanDiameter, getActiveCoils } from "@/lib/springMath";

import { previewTheme } from "@/lib/three/previewTheme";

type CoilerMachineSceneProps = {
  springDesign: SpringDesign;
  pitch: number;
  simulationSpeed: number;
};

/**
 * Placeholder canvas for the octopus-style coiling machine simulation.
 * Future work: port mandrel + guide roller kinematics, wire feed animation, and
 * machine frame motion from our standalone Vite + Three prototype into these components.
 */
export function CoilerMachineScene({ springDesign, pitch }: CoilerMachineSceneProps) {
  return (
    <div className="h-full w-full">
      <Canvas 
        camera={{ position: [2.5, 1.5, 3], fov: 45 }}
        gl={{ 
          antialias: true,
          preserveDrawingBuffer: true,
        }}
        frameloop="always"
        dpr={[1, 2]}
      >
        <color attach="background" args={[previewTheme.background]} />
        <ambientLight intensity={previewTheme.lights.ambient} />
        <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} />
        <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />

        <Suspense fallback={null}>
          <group position={[0, -0.4, 0]}>
            <WireFeed />
            <CoilerArms position={[0, 0, 0]} />
            <SpringModel
              wireDiameter={(springDesign as any).wireDiameter ?? 1.0}
              meanDiameter={getMeanDiameter(springDesign)}
              activeCoils={getActiveCoils(springDesign)}
              pitch={pitch}
            />
          </group>
        </Suspense>

        <OrbitControls enableDamping enablePan enableZoom />

        {/* TODO: hook up simulationSpeed to animation clocks when motion logic lands. */}
      </Canvas>
    </div>
  );
}
