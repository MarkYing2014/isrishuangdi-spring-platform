"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useFeaStore } from "@/lib/stores/feaStore";
import { findMaxSigmaNodeIndex, findMaxDispNodeIndex } from "@/lib/fea/feaTypes";

interface FeaMaxStressMarkerProps {
  scale?: number;
  showTooltip?: boolean;
}

/**
 * 3D marker showing the location of maximum stress or displacement
 * Renders a small sphere at the critical node position
 */
export function FeaMaxStressMarker({ 
  scale = 1, 
  showTooltip = true 
}: FeaMaxStressMarkerProps) {
  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);

  const isFeaMode = colorMode !== "formula" && feaResult !== null;

  const markerData = useMemo(() => {
    if (!feaResult || !isFeaMode) return null;

    const nodes = feaResult.nodes;
    if (nodes.length === 0) return null;

    let nodeIndex: number;
    let value: number;
    let label: string;
    let unit: string;
    let color: string;

    switch (colorMode) {
      case "fea_sigma":
        nodeIndex = findMaxSigmaNodeIndex(nodes);
        value = nodes[nodeIndex].sigma_vm;
        label = "σ_max";
        unit = "MPa";
        color = "#ff0000";
        break;
      case "fea_disp":
        nodeIndex = findMaxDispNodeIndex(nodes);
        const node = nodes[nodeIndex];
        value = Math.sqrt(node.ux ** 2 + node.uy ** 2 + node.uz ** 2);
        label = "u_max";
        unit = "mm";
        color = "#ff6600";
        break;
      case "fea_sf":
        // For safety factor, show the minimum (most critical)
        let minSF = Infinity;
        let minIndex = 0;
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].sigma_vm > 0) {
            const sf = feaResult.maxSigma > 0 ? 
              (feaResult.safetyFactor || 1) * (feaResult.maxSigma / nodes[i].sigma_vm) : 1;
            if (sf < minSF) {
              minSF = sf;
              minIndex = i;
            }
          }
        }
        nodeIndex = minIndex;
        value = minSF === Infinity ? 0 : minSF;
        label = "SF_min";
        unit = "";
        color = "#ff0000";
        break;
      default:
        return null;
    }

    const targetNode = nodes[nodeIndex];
    // Scale the position to match the Three.js geometry
    // Note: The FEA nodes are in original mm coordinates, 
    // but the visualizer uses a scale factor
    return {
      position: new THREE.Vector3(
        targetNode.x * scale,
        targetNode.y * scale,
        targetNode.z * scale
      ),
      value,
      label,
      unit,
      color,
    };
  }, [feaResult, colorMode, isFeaMode, scale]);

  if (!markerData) return null;

  const sphereRadius = 1.5; // Adjust based on spring size

  return (
    <group position={markerData.position}>
      {/* Marker sphere */}
      <mesh>
        <sphereGeometry args={[sphereRadius, 16, 16]} />
        <meshStandardMaterial
          color={markerData.color}
          emissive={markerData.color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Pulsing ring effect */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[sphereRadius * 1.2, sphereRadius * 1.5, 32]} />
        <meshBasicMaterial
          color={markerData.color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Tooltip using Html from drei */}
      {showTooltip && (
        <Html
          position={[0, sphereRadius * 2, 0]}
          center
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            className="px-2 py-1 rounded bg-black/80 text-white text-xs whitespace-nowrap"
            style={{ transform: "translateY(-100%)" }}
          >
            <span className="font-medium">{markerData.label}</span>
            {" = "}
            <span className="font-mono">{markerData.value.toFixed(1)}</span>
            {markerData.unit && <span className="text-gray-300"> {markerData.unit}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}
