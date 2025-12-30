"use client";

import React, { useEffect, useRef, useLayoutEffect, forwardRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export interface AutoFitControlsProps {
  /** Ref to the object or group to fit in view */
  targetRef: React.RefObject<THREE.Object3D | null>;
  /** Whether to auto-fit on mount / target change */
  autoFit?: boolean;
  /** View preset override (if any) */
  viewType?: string;
  /** OrbitControls props */
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  /** Trigger fit manually by changing this value */
  fitTrigger?: any;
}

/**
 * Enhanced OrbitControls that automatically fits the target object into the camera view.
 * 增强型 OrbitControls，自动将目标对象适配到相机视野中。
 */
export const AutoFitControls = forwardRef<any, AutoFitControlsProps>(({
  targetRef,
  autoFit = true,
  viewType,
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
  minDistance = 0.1,
  maxDistance = 10000,
  autoRotate = false,
  autoRotateSpeed = 1.0,
  fitTrigger,
}, ref) => {
  const { camera } = useThree();
  const internalControlsRef = useRef<any>(null);
  const hasAutoFitted = useRef(false);

  // Use the forwarded ref if provided, otherwise use internal
  const controlsRef = (ref as React.MutableRefObject<any>) || internalControlsRef;

  // Core fitting logic
  const performFit = () => {
    const obj = targetRef.current;
    if (!obj) return;

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return;

    // FOV adjustment for distance
    const fov = (camera as THREE.PerspectiveCamera).fov || 45;
    
    // Calculate distance based on FOV
    // dist = (maxDim / 2) / tan(fov / 2)
    const extraPadding = 1.5; // Padding factor
    const dist = (maxDim / 2) / Math.tan((fov * Math.PI) / 360) * extraPadding;

    // Position camera at an angle
    // Default perspective angle: [1, 0.7, 1] normalized
    const direction = new THREE.Vector3(1, 0.7, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, dist);
    
    // Update camera limits based on object size
    camera.near = Math.max(0.01, maxDim / 1000);
    camera.far = Math.max(10000, maxDim * 100);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
    
    hasAutoFitted.current = true;
  };

  // Run on mount or when specifically triggered
  useEffect(() => {
    if (autoFit && targetRef.current) {
      // Delay slightly to ensure geometry is fully uploaded/computed
      const timeout = setTimeout(performFit, 50);
      return () => clearTimeout(timeout);
    }
  }, [autoFit, fitTrigger]);

  // Run when targetRef becomes available (if it was null)
  useLayoutEffect(() => {
    if (autoFit && targetRef.current && !hasAutoFitted.current) {
      performFit();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={enablePan}
      enableZoom={enableZoom}
      enableRotate={enableRotate}
      minDistance={minDistance}
      maxDistance={maxDistance}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
    />
  );
});

AutoFitControls.displayName = "AutoFitControls";
