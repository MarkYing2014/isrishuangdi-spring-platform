"use client";

// ENGINEERING CONTRACT: Z_UP_AXIAL
// Plane: XY (Installation Flange)
// Axis: Z (Spring Stroke / Load Direction)
// Plate Normal: Z
// This ensures compatibility with Phase 4 Engineering Audit physics.

import React, { useMemo, useRef, useLayoutEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AutoFitControls } from "./AutoFitControls";
import { Html, Grid, Line, Text } from "@react-three/drei"; // Added Grid, Line, Text
import { AxialPackInput } from "@/lib/spring-platform/types";
import { buildCompressionSpringGeometry } from "@/lib/spring3d/compressionSpringGeometry";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// Colors
const SPRING_COLOR = "#3b82f6";
const PLATE_COLOR = "#94a3b8";
const WARN_COLOR = "#f59e0b";
const FAIL_COLOR = "#ef4444";
const PASS_COLOR = "#10b981";

interface AxialPackVisualizerProps {
    input: AxialPackInput;
    stroke: number; // Current stroke (mm)
    showClearance?: boolean;
}

// Helper: Engineering Dimension Arrow
function DimensionArrow({ start, end, label, color="black" }: { start: [number,number,number], end: [number,number,number], label: string, color?: string }) {
    return (
        <group>
            {/* Arrow Line */}
            <Line points={[start, end]} color={color} lineWidth={2} />
            {/* End Caps (simple T lines) */}
            <Line points={[[start[0]-2, start[1], start[2]], [start[0]+2, start[1], start[2]]]} color={color} lineWidth={2} />
            <Line points={[[end[0]-2, end[1], end[2]], [end[0]+2, end[1], end[2]]]} color={color} lineWidth={2} />
            
            {/* Label */}
            <Html position={[(start[0]+end[0])/2 + 4, (start[1]+end[1])/2, (start[2]+end[2])/2]}>
                <div className="bg-white/90 backdrop-blur px-2 py-0.5 rounded shadow text-[10px] font-mono whitespace-nowrap border border-slate-200" style={{ color }}>
                    {label}
                </div>
            </Html>
        </group>
    );
}

function SpringPackInstanced({ input, stroke, showClearance }: { input: AxialPackInput, stroke: number, showClearance?: boolean }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { baseSpring, pack } = input;
    const { plateThickness = 5 } = pack;

    // 1. Build Shared Geometry (At Free Length)
    const geometry = useMemo(() => {
        const params = {
            totalCoils: (baseSpring.Na || 5) + 2,
            activeCoils: baseSpring.Na,
            meanDiameter: baseSpring.Dm,
            wireDiameter: baseSpring.d,
            freeLength: baseSpring.L0,
            currentDeflection: 0,
            scale: 1,
        };
        const geoData = buildCompressionSpringGeometry(params, 10);
        
        // Optimize: Center geometry base at Z=0 for easier scaling? 
        // Standard builder centers it or starts at 0? 
        // Typically starts at 0. Let's assume it does.
        return geoData?.tubeGeometry;
    }, [baseSpring.d, baseSpring.Dm, baseSpring.Na, baseSpring.L0]);

    // 2. Update Instances
    useLayoutEffect(() => {
        if (!meshRef.current || !pack.N) return;
        
        const tempObj = new THREE.Object3D();
        const N = Math.min(Math.max(pack.N, 1), 80); 
        const R = pack.Rbc;
        const currentLength = Math.max(0.1, baseSpring.L0 - stroke);
        const scaleZ = currentLength / baseSpring.L0;

        for (let i = 0; i < N; i++) {
            const angle = (2 * Math.PI * i) / N;
            const x = R * Math.cos(angle);
            const y = R * Math.sin(angle);
            
            // Position: On top of Bottom Plate
            // Bottom Plate surface is at Z = 0 (if we consider plateThickness, maybe Z = plateThickness/2? No, let's keep Plate Center logic or Top Surface logic)
            // Let's define Z=0 as the Contact Surface between Bottom Plate and Spring.
            
            tempObj.position.set(x, y, 0); 
            tempObj.rotation.set(0, 0, Math.PI/2); // Rotate spring to point along Z? No, standard cylinder is Y-up usually... 
            // Wait, buildCompressionSpringGeometry builds along X? Y? Z?
            // Usually Z or X. Assuming Z for now since we scaled Z.
            tempObj.rotation.set(0, 0, 0);

            tempObj.scale.set(1, 1, scaleZ); 
            
            tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObj.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [pack.N, pack.Rbc, stroke, baseSpring.L0, geometry]);

    if (!geometry) return null;

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, undefined, pack.N]} 
            castShadow receiveShadow
        >
             <meshStandardMaterial 
                color={SPRING_COLOR} 
                metalness={0.4} 
                roughness={0.4}
             />
        </instancedMesh>
    );
}

function PlatesAndContext({ input, stroke, showClearance }: { input: AxialPackInput, stroke: number, showClearance?: boolean }) {
    const { pack, baseSpring } = input;
    const currentLength = Math.max(0.1, baseSpring.L0 - stroke);
    const tPlate = pack.plateThickness || 5;
    const OD_spring = baseSpring.Dm + baseSpring.d;
    
    // Plate Dimensions
    const plateOD = (pack.ringOD || (pack.Rbc + OD_spring) * 1.3);
    const plateID = (pack.ringID || Math.max(0, (pack.Rbc - OD_spring) * 0.5));
    
    // Derived Calculations for Clearance Rings
    const ssGap = (input.pack.Rbc * Math.sin(Math.PI/input.pack.N)*2 - OD_spring);
    const clearanceColor = ssGap < 0 ? FAIL_COLOR : ssGap < 0.5 ? WARN_COLOR : PASS_COLOR;

    return (
        <group>
            {/* 1. Bottom Plate (Fixed) */}
            {/* Surface at Z=0, so center at Z = -tPlate/2. Cylinder defaults Y-up, so rotate X. */}
            <mesh position={[0, 0, -tPlate/2]} rotation={[Math.PI/2, 0, 0]} receiveShadow>
                <cylinderGeometry args={[plateOD/2, plateOD/2, tPlate, 64]} />
                <meshStandardMaterial color={PLATE_COLOR} />
            </mesh>

            {/* 2. Top Plate (Moving) */}
            {/* Surface at Z=currentLength, so center at Z = currentLength + tPlate/2. Rotate X. */}
            <mesh position={[0, 0, currentLength + tPlate/2]} rotation={[Math.PI/2, 0, 0]} castShadow>
                 <cylinderGeometry args={[plateOD/2, plateOD/2, tPlate, 64]} />
                 <meshStandardMaterial color={PLATE_COLOR} transparent opacity={0.9} />
            </mesh>

            {/* 3. Clearance Overlay (Projected on Bottom Plate) */}
            {showClearance && (
                <mesh position={[0, 0, 0.1]} rotation={[0, 0, 0]}>
                    <ringGeometry args={[pack.Rbc - OD_spring/2 - 2, pack.Rbc + OD_spring/2 + 2, 64]} />
                    <meshBasicMaterial color={clearanceColor} transparent opacity={0.15} side={THREE.DoubleSide} />
                </mesh>
            )}
            
            {/* 4. Dimensions Arrow */}
            {/* Shows Stroke Used */}
            <DimensionArrow 
                start={[plateOD/2 + 10, 0, currentLength + tPlate]} 
                end={[plateOD/2 + 10, 0, currentLength]} 
                label={`H_curr: ${currentLength.toFixed(1)}mm`}
                color="#64748b"
            />
            
            <DimensionArrow
                start={[plateOD/2 + 10, 0, baseSpring.L0]}
                end={[plateOD/2 + 10, 0, 0]}
                label={`L0: ${baseSpring.L0.toFixed(1)}mm`}
                color="#94a3b8"
            />
            
            {/* Stroke Arrow (Dynamic) */}
             <DimensionArrow
                start={[plateOD/2 + 25, 0, baseSpring.L0 + tPlate]}
                end={[plateOD/2 + 25, 0, currentLength + tPlate]}
                label={`Stroke: ${stroke.toFixed(2)}mm`}
                color="#ef4444"
            />

        </group>
    );
}

export function AxialPackVisualizer({ input, stroke, showClearance = true }: AxialPackVisualizerProps) {
    const [view, setView] = useState<"iso" | "top" | "front">("iso");
    const controlsRef = useRef<any>(null);
    const groupRef = useRef<THREE.Group>(null);

    const handleView = (v: "iso" | "top" | "front") => {
        if (!controlsRef.current) return;
        const controls = controlsRef.current;
        if (v === "top") {
             controls.object.position.set(0, 0, 300);
             controls.object.up.set(0,1,0); // Y is up in camera view, but we look down Z
        } else if (v === "front") {
             controls.object.position.set(0, -300, 50);
             controls.object.up.set(0,0,1);
        } else { // iso
             controls.object.position.set(200, 200, 200);
             controls.object.up.set(0,0,1);
        }
        controls.update();
        setView(v);
    };

    return (
        <div className="relative w-full h-full bg-slate-50/50 rounded-lg overflow-hidden border border-slate-200">
            <Canvas shadows camera={{ position: [200, 200, 200], fov: 45, up: [0,0,1] }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[100, 50, 200]} intensity={1.5} castShadow shadow-mapSize={[2048,2048]} />
                <pointLight position={[-100, -50, 50]} intensity={0.5} />

                <group ref={groupRef} rotation={[0, 0, 0]}> 
                   {/* Standard setup: Z is Up (Axial). XY is mounting plane. */}
                   
                   <SpringPackInstanced input={input} stroke={stroke} showClearance={showClearance} />
                   <PlatesAndContext input={input} stroke={stroke} showClearance={showClearance} />
                   
                   {/* Engineering Grid (Installation Plane) */}
                   <Grid 
                        position={[0, 0, -(input.pack.plateThickness||5)/2 - 0.1]} 
                        args={[300, 300]} 
                        cellSize={10} 
                        cellThickness={0.6} 
                        sectionSize={50} 
                        sectionThickness={1}
                        rotation={[Math.PI/2, 0, 0]} 
                        fadeDistance={400} 
                        infiniteGrid
                   />
                </group>

                {/* No default axes needed if grid is clear, but keep for debug */}
                <axesHelper args={[20]} />

                <AutoFitControls ref={controlsRef} targetRef={groupRef} />
            </Canvas>

            {/* View Controls */}
            <div className="absolute bottom-4 left-4 flex gap-2">
                <Button size="sm" variant={view === "iso" ? "default" : "secondary"} onClick={() => handleView("iso")} className="bg-white/90 backdrop-blur shadow-sm text-xs h-7">ISO</Button>
                <Button size="sm" variant={view === "top" ? "default" : "secondary"} onClick={() => handleView("top")} className="bg-white/90 backdrop-blur shadow-sm text-xs h-7">Top</Button>
                <Button size="sm" variant={view === "front" ? "default" : "secondary"} onClick={() => handleView("front")} className="bg-white/90 backdrop-blur shadow-sm text-xs h-7">Front</Button>
            </div>
        </div>
    );
}
