"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

function SceneContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <color attach="background" args={["#0b1220"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1} />
      <directionalLight position={[-3, -2, -1]} intensity={0.3} />
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
          gl.setClearColor("#0b1220");
        }}
      >
        <SceneContent>{children}</SceneContent>
      </Canvas>
    </div>
  );
}
