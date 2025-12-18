"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

import { previewTheme } from "@/lib/three/previewTheme";

function SceneContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <color attach="background" args={[previewTheme.background]} />
      <ambientLight intensity={previewTheme.lights.ambient} />
      <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} />
      <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
      <group position={[0, -0.2, 0]}>{children}</group>
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
      <OrbitControls enableDamping enablePan enableZoom target={[0, 0, 0]} />
    </>
  );
}

export function BasicScene({ children }: { children: React.ReactNode }) {
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
        <SceneContent>{children}</SceneContent>
      </Canvas>
    </div>
  );
}
