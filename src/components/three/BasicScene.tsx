"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { AutoFitControls } from "./AutoFitControls";

import { previewTheme } from "@/lib/three/previewTheme";

function SceneContent({ children, targetRef }: { children: React.ReactNode, targetRef: React.RefObject<THREE.Group | null> }) {
  return (
    <>
      <color attach="background" args={[previewTheme.background]} />
      <ambientLight intensity={previewTheme.lights.ambient} />
      <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} />
      <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
      <group ref={targetRef} position={[0, -0.2, 0]}>{children}</group>
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
      <AutoFitControls targetRef={targetRef} />
    </>
  );
}

export function BasicScene({ children }: { children: React.ReactNode }) {
  const targetRef = useRef<THREE.Group>(null);
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [1.2, 0.8, 2.2], fov: 45 }}
        gl={{ 
          localClippingEnabled: true,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: "default",
        }}
        frameloop="always"
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.setClearColor(previewTheme.background);
        }}
      >
        <SceneContent targetRef={targetRef}>{children}</SceneContent>
      </Canvas>
    </div>
  );
}
