/**
 * Shock Absorber Spring Frames
 * 减震器弹簧 Parallel Transport Frames
 * 
 * This module computes Parallel Transport Frames (PTF) for the spring centerline.
 * PTF is used instead of Frenet frames to avoid ribbon/twisting artifacts.
 * 
 * Why PTF?
 * - Frenet frames flip at inflection points
 * - PTF maintains stable orientation along the entire curve
 * - Critical for law-driven variable curvature springs
 */

import * as THREE from 'three';
import type { FramesResult } from './ShockSpringTypes';

// ============================================================================
// Parallel Transport Frames
// ============================================================================

/**
 * Compute Parallel Transport Frames for a set of points
 * 
 * Algorithm:
 * 1. Compute tangents using finite differences (forward/backward endpoints, central inside)
 * 2. Choose initial normal perpendicular to first tangent (deterministic)
 * 3. For each subsequent point:
 *    - Rotate previous normal around axis = cross(prevT, currT)
 *    - Handle degeneracy when prevT ≈ currT (no rotation needed)
 *    - Handle near-180° case with fallback axis
 *    - Re-orthonormalize
 * 
 * @param points Centerline points
 * @returns Parallel Transport Frames (tangents, normals, binormals)
 */
export function computeParallelTransportFrames(points: THREE.Vector3[]): FramesResult {
    const n = points.length;

    if (n < 2) {
        // Degenerate case: single point
        const defaultT = new THREE.Vector3(0, 0, 1);
        const defaultN = new THREE.Vector3(1, 0, 0);
        const defaultB = new THREE.Vector3(0, 1, 0);
        return {
            tangents: [defaultT],
            normals: [defaultN],
            binormals: [defaultB],
        };
    }

    const tangents: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    const binormals: THREE.Vector3[] = [];

    // ========================================
    // Step 1: Compute tangents
    // ========================================

    for (let i = 0; i < n; i++) {
        let tangent: THREE.Vector3;

        if (i === 0) {
            // Forward difference at start
            tangent = new THREE.Vector3().subVectors(points[1], points[0]);
        } else if (i === n - 1) {
            // Backward difference at end
            tangent = new THREE.Vector3().subVectors(points[n - 1], points[n - 2]);
        } else {
            // Central difference in middle
            tangent = new THREE.Vector3().subVectors(points[i + 1], points[i - 1]);
        }

        // Normalize tangent
        if (tangent.length() > 1e-10) {
            tangent.normalize();
        } else {
            // Fallback for degenerate segments
            tangent.set(0, 0, 1);
        }

        tangents.push(tangent);
    }

    // ========================================
    // Step 2: Initial normal selection (deterministic)
    // ========================================

    // Choose reference vector
    const ref = new THREE.Vector3(0, 1, 0);

    // If tangent is nearly parallel to ref, use alternative
    if (Math.abs(tangents[0].dot(ref)) > 0.9) {
        ref.set(1, 0, 0);
    }

    // Compute initial normal: ref - t0 * (t0 · ref)
    const t0 = tangents[0];
    const initial = ref.clone().sub(t0.clone().multiplyScalar(t0.dot(ref)));

    if (initial.length() > 1e-10) {
        initial.normalize();
        normals.push(initial);
    } else {
        // Fallback: find any perpendicular vector
        normals.push(findPerpendicularVector(t0));
    }

    // Initial binormal
    binormals.push(tangents[0].clone().cross(normals[0]).normalize());

    // ========================================
    // Step 3: Propagate frames
    // ========================================

    for (let i = 1; i < n; i++) {
        const prevT = tangents[i - 1];
        const currT = tangents[i];
        const prevN = normals[i - 1];

        // Rotation axis = cross(prevT, currT)
        const axis = new THREE.Vector3().crossVectors(prevT, currT);
        const axisLength = axis.length();

        let newNormal: THREE.Vector3;

        if (axisLength < 1e-10) {
            // Tangents are nearly parallel, no rotation needed
            newNormal = prevN.clone();
        } else {
            // Normalize axis
            axis.normalize();

            // Compute rotation angle
            const dot = clamp(prevT.dot(currT), -1, 1);
            const angle = Math.acos(dot);

            // Handle near-180° case
            if (dot < -0.999) {
                // Find perpendicular axis for 180° rotation
                axis.copy(findPerpendicularVector(prevT));
            }

            // Rotate prevN around axis by angle using quaternion
            const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            newNormal = prevN.clone().applyQuaternion(quaternion);
        }

        // Compute binormal
        const newBinormal = currT.clone().cross(newNormal);

        // Handle degenerate binormal
        if (newBinormal.length() < 1e-10) {
            // Fallback: use previous binormal
            newBinormal.copy(binormals[i - 1]);
        } else {
            newBinormal.normalize();
        }

        // Re-orthonormalize normal
        newNormal = newBinormal.clone().cross(currT).normalize();

        normals.push(newNormal);
        binormals.push(newBinormal);
    }

    return { tangents, normals, binormals };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find a vector perpendicular to the given vector (deterministic)
 */
function findPerpendicularVector(v: THREE.Vector3): THREE.Vector3 {
    // Try different reference vectors
    const refs = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
    ];

    let bestRef = refs[0];
    let minDot = Math.abs(v.dot(refs[0]));

    for (let i = 1; i < refs.length; i++) {
        const dot = Math.abs(v.dot(refs[i]));
        if (dot < minDot) {
            minDot = dot;
            bestRef = refs[i];
        }
    }

    // Cross product gives perpendicular vector
    const perp = new THREE.Vector3().crossVectors(v, bestRef);
    return perp.normalize();
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Frame Visualization Helpers
// ============================================================================

/**
 * Get frame axis points for visualization (RGB axes at each frame)
 * 
 * @param points Centerline points
 * @param frames PTF frames
 * @param axisLength Length of each axis line
 * @param step Step size (show every Nth frame)
 * @returns Array of axis line segments for visualization
 */
export function getFrameAxisLines(
    points: THREE.Vector3[],
    frames: FramesResult,
    axisLength: number = 2,
    step: number = 10
): {
    tangentLines: THREE.Vector3[][];
    normalLines: THREE.Vector3[][];
    binormalLines: THREE.Vector3[][];
} {
    const tangentLines: THREE.Vector3[][] = [];
    const normalLines: THREE.Vector3[][] = [];
    const binormalLines: THREE.Vector3[][] = [];

    for (let i = 0; i < points.length; i += step) {
        const p = points[i];
        const t = frames.tangents[i];
        const n = frames.normals[i];
        const b = frames.binormals[i];

        // Tangent line (red)
        tangentLines.push([
            p.clone(),
            p.clone().add(t.clone().multiplyScalar(axisLength)),
        ]);

        // Normal line (green)
        normalLines.push([
            p.clone(),
            p.clone().add(n.clone().multiplyScalar(axisLength)),
        ]);

        // Binormal line (blue)
        binormalLines.push([
            p.clone(),
            p.clone().add(b.clone().multiplyScalar(axisLength)),
        ]);
    }

    return { tangentLines, normalLines, binormalLines };
}
