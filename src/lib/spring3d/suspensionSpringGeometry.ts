/**
 * Suspension Spring 3D Geometry Builder
 * 减震器弹簧/悬架弹簧几何生成器
 * 
 * Capability:
 * - Variable Pitch (Progressive)
 * - Variable Diameter (Barrel, Conical)
 * - End Closed Coils (Dead Coils) with smooth transition
 * - Ground flattening (端面磨平贴合)
 * - Realistic Load Compression (Preload / Ride / Bump)
 */

import * as THREE from "three";
import type { PitchProfile, DiameterProfile, SuspensionEndSpec } from "@/lib/springTypes";

// ============================================================================
// Types
// ============================================================================

export interface SuspensionSpringGeometryInput {
    wireDiameter: number;
    activeCoils: number;
    totalCoils: number;
    freeLength: number;
    pitchProfile: PitchProfile;
    diameterProfile: DiameterProfile;

    // 3D Display Params
    segmentsPerCoil?: number; // default 80
    radialSegments?: number;  // default 12 for tube

    // Load State
    loadState?: "free" | "preload" | "ride" | "bump";
    targetHeight?: number; // Override height for specific load state
}

export interface SuspensionSpringGeometryResult {
    geometry: THREE.BufferGeometry;
    curvepoints: THREE.Vector3[];
    wireLength: number;
    boundingBox: THREE.Box3;
}

// ============================================================================
// Helper Functions
// ============================================================================

function smoothstep01(x: number): number {
    const t = Math.max(0, Math.min(1, x));
    return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// ============================================================================
// End Specification Resolver
// ============================================================================

function resolveEndSpec(prof: PitchProfile): SuspensionEndSpec {
    // If endSpec is provided, use it
    if (prof.endSpec) {
        return prof.endSpec;
    }

    // Fallback to simple endType + endClosedTurns
    const endType = prof.endType ?? "closed_ground";
    const closedTurnsPerEnd = prof.endClosedTurns ?? 1.0;

    return {
        type: endType,
        closedTurnsPerEnd,
        groundTurnsPerEnd: endType === "closed_ground" ? 0.5 : 0,
        seatDrop: 0,
        endAngleExtra: 0,
    };
}

// ============================================================================
// Pitch Weight Function (wPitch)
// ============================================================================

/**
 * wPitch: Returns a weight from 0 to 1 for pitch scaling.
 * - At closed end zones: 0 → 1 (ramp up)
 * - In active zone: 1
 * - At closed end zones: 1 → 0 (ramp down)
 */
function wPitch(theta: number, thetaClosed: number, thetaTotal: number): number {
    if (thetaClosed <= 0) return 1; // No closed ends

    // Start closed zone: 0 -> thetaClosed
    if (theta < thetaClosed) {
        return smoothstep01(theta / thetaClosed);
    }

    // End closed zone: (thetaTotal - thetaClosed) -> thetaTotal
    if (theta > thetaTotal - thetaClosed) {
        const u = (thetaTotal - theta) / thetaClosed;
        return smoothstep01(u);
    }

    return 1;
}

/**
 * Calculate pitch at specific theta (radians)
 * Uses wPitch weight for proper closed-coil integration
 */
function pitchAtTheta(
    theta: number,
    Nt: number,
    prof: PitchProfile,
    pitchActive: number,
    endSpec: SuspensionEndSpec
): number {
    const thetaTotal = 2 * Math.PI * Nt;
    const hasClosedEnds = endSpec.type === "closed" || endSpec.type === "closed_ground";

    if (!hasClosedEnds) {
        // Open ends: uniform pitch throughout (no dead coils)
        if (prof.mode === "uniform") {
            return pitchActive;
        }
        // Progressive open ends: use center pitch
        return prof.pitchCenter ?? pitchActive;
    }

    // Closed ends: use wPitch weight
    const thetaClosed = 2 * Math.PI * endSpec.closedTurnsPerEnd;
    const w = wPitch(theta, thetaClosed, thetaTotal);

    if (prof.mode === "uniform") {
        return pitchActive * w;
    }

    // Two-Stage / Progressive: blend between pitchEnd and pitchCenter
    const pCenter = prof.pitchCenter ?? pitchActive;
    const pEnd = prof.pitchEnd ?? (pCenter * 0.15); // Very small pitch at ends

    // Additional transition zone for progressive springs
    const thetaTrans = 2 * Math.PI * (prof.transitionTurns ?? 0.75);

    // In closed zone, pitch is pEnd (small but not zero for visual clarity)
    if (theta < thetaClosed) {
        return pEnd;
    }

    // Transition: pEnd -> pCenter
    if (theta < thetaClosed + thetaTrans) {
        const u = smoothstep01((theta - thetaClosed) / thetaTrans);
        return pEnd + (pCenter - pEnd) * u;
    }

    // End transition (symmetric)
    if (theta > thetaTotal - (thetaClosed + thetaTrans)) {
        if (theta < thetaTotal - thetaClosed) {
            const u = smoothstep01((thetaTotal - thetaClosed - theta) / thetaTrans);
            return pEnd + (pCenter - pEnd) * u;
        }
        return pEnd;
    }

    return pCenter;
}

// ============================================================================
// Ground Weight Function (端面磨平权重)
// ============================================================================

/**
 * groundWeight: Returns 0-1 weight for how much to "flatten" z toward end plane
 * - Near end: high weight (flatten toward 0 or zEnd)
 * - Away from end: 0 (no flattening)
 */
function groundWeight(theta: number, thetaGround: number, thetaTotal: number): number {
    if (thetaGround <= 0) return 0;

    // Start ground zone
    if (theta < thetaGround) {
        const u = 1 - theta / thetaGround;
        return smoothstep01(u);
    }

    // End ground zone
    if (theta > thetaTotal - thetaGround) {
        const u = 1 - (thetaTotal - theta) / thetaGround;
        return smoothstep01(u);
    }

    return 0;
}

// ============================================================================
// Diameter Profile Function
// ============================================================================

function diameterAtTheta(theta: number, Nt: number, prof: DiameterProfile): number {
    const t = theta / (2 * Math.PI * Nt); // 0 to 1

    if (prof.mode === "constant") {
        return prof.DmStart ?? 100;
    }

    if (prof.mode === "conical") {
        const dStart = prof.DmStart ?? 100;
        const dEnd = prof.DmEnd ?? 100;
        return dStart + (dEnd - dStart) * t;
    }

    if (prof.mode === "barrel") {
        const dStart = prof.DmStart ?? 100;
        const dMid = prof.DmMid ?? 120;
        const dEnd = prof.DmEnd ?? 100;

        if (t < 0.5) {
            const u = smoothstep01(t / 0.5);
            return dStart + (dMid - dStart) * u;
        } else {
            const u = smoothstep01((t - 0.5) / 0.5);
            return dMid + (dEnd - dMid) * u;
        }
    }

    return 100;
}

// ============================================================================
// Numeric Average Helper (for pitchActive calculation)
// ============================================================================

function numericAvgWPitch(thetaClosed: number, thetaTotal: number, segments: number = 200): number {
    let sum = 0;
    const dTheta = thetaTotal / segments;
    for (let i = 0; i < segments; i++) {
        const theta = (i + 0.5) * dTheta;
        sum += wPitch(theta, thetaClosed, thetaTotal);
    }
    return sum / segments;
}

// ============================================================================
// Core Builder
// ============================================================================

export function buildSuspensionSpringCurvePoints(
    params: SuspensionSpringGeometryInput
): { points: THREE.Vector3[]; totalHeightRaw: number } {
    const {
        activeCoils,
        totalCoils,
        freeLength,
        pitchProfile,
        diameterProfile,
        segmentsPerCoil = 80,
    } = params;

    const endSpec = resolveEndSpec(pitchProfile);

    // Use totalCoils for geometry + endAngleExtra
    const Nt = (totalCoils > 0 ? totalCoils : activeCoils + 2) + (endSpec.endAngleExtra ?? 0);

    const segs = Math.max(120, Math.floor(Nt * segmentsPerCoil));
    const thetaTotal = 2 * Math.PI * Nt;
    const dTheta = thetaTotal / segs;

    const hasClosedEnds = endSpec.type === "closed" || endSpec.type === "closed_ground";
    const thetaClosed = hasClosedEnds ? 2 * Math.PI * endSpec.closedTurnsPerEnd : 0;
    const thetaGround = endSpec.type === "closed_ground" ? 2 * Math.PI * (endSpec.groundTurnsPerEnd ?? 0.5) : 0;

    // Calculate pitchActive so that integrated height = freeLength
    // total_height = integral( pitch(θ) / 2π dθ ) ≈ pitchActive * Nt * wAvg
    // → pitchActive = freeLength / (Nt * wAvg)
    const wAvg = numericAvgWPitch(thetaClosed, thetaTotal, segs);
    const pitchActive = freeLength / (Nt * Math.max(wAvg, 0.1));

    // 1. Generate Raw Z Profile (Integration)
    const zRaw: number[] = [];
    let zCurrent = 0;
    zRaw.push(0);

    for (let i = 1; i <= segs; i++) {
        const thetaMid = (i - 0.5) * dTheta;
        const p = pitchAtTheta(thetaMid, Nt, pitchProfile, pitchActive, endSpec);

        // dz = (pitch / 2π) * dTheta
        zCurrent += (p / (2 * Math.PI)) * dTheta;
        zRaw.push(zCurrent);
    }

    const zEnd = zRaw[segs];

    // 2. Apply Ground Flattening (for closed_ground)
    // Start end: pull toward z=0
    // End end: pull toward z=zEnd
    const zFlattened: number[] = [];
    for (let i = 0; i <= segs; i++) {
        const theta = i * dTheta;
        let z = zRaw[i];

        if (endSpec.type === "closed_ground" && thetaGround > 0) {
            const wg = groundWeight(theta, thetaGround, thetaTotal);

            if (theta < thetaGround) {
                // Start: flatten toward 0
                z = lerp(z, 0, wg);
            } else if (theta > thetaTotal - thetaGround) {
                // End: flatten toward zEnd
                z = lerp(z, zEnd, wg);
            }
        }

        zFlattened.push(z);
    }

    // 3. Scale Z to match Free Length exactly (post-flattening)
    const totalHeightFlat = zFlattened[segs] - zFlattened[0];
    const scaleZ = totalHeightFlat > 1e-6 ? freeLength / totalHeightFlat : 1;

    // 4. Generate 3D Points
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
        const theta = i * dTheta;
        const Dm = diameterAtTheta(theta, Nt, diameterProfile);
        const R = Dm / 2;

        const x = R * Math.cos(theta);
        const zCoord = R * Math.sin(theta);
        const yHelix = (zFlattened[i] - zFlattened[0]) * scaleZ;

        points.push(new THREE.Vector3(x, yHelix, zCoord));
    }

    return { points, totalHeightRaw: freeLength };
}

// ============================================================================
// Load Compression (非均匀压缩)
// ============================================================================

/**
 * Apply Load Compression with weighted approach
 * - Dead coils (small dy) compress less
 * - Active coils (large dy) compress more
 */
function applyCompression(
    originalPoints: THREE.Vector3[],
    wireDiameter: number,
    targetHeight: number,
    freeLength: number,
    endSpec: SuspensionEndSpec
): THREE.Vector3[] {
    if (targetHeight >= freeLength) return originalPoints;

    const totalPoints = originalPoints.length;
    if (totalPoints < 2) return originalPoints;

    const delta = freeLength - targetHeight;
    const yValues = originalPoints.map(p => p.y);
    const yMax = yValues[totalPoints - 1] - yValues[0];

    // Calculate weights based on local pitch (dy)
    // Higher pitch = more compressible
    const weights: number[] = [];
    let totalWeight = 0;

    for (let i = 0; i < totalPoints - 1; i++) {
        const dy = yValues[i + 1] - yValues[i];

        // Minimum compression for dead coils
        // If dy is less than wireDiameter * 0.5, it's essentially solid
        const minPitch = wireDiameter * 0.5;
        const w = Math.max(0, dy - minPitch);

        weights.push(w);
        totalWeight += w;
    }

    // If no compressible sections, fall back to uniform scaling
    if (totalWeight < 1e-6) {
        const scale = targetHeight / freeLength;
        return originalPoints.map(p => new THREE.Vector3(p.x, p.y * scale, p.z));
    }

    // Distribute compression proportionally to weights
    const out: THREE.Vector3[] = [];
    let cumulativeCompression = 0;
    out.push(originalPoints[0].clone());

    for (let i = 1; i < totalPoints; i++) {
        const localWeight = weights[i - 1];
        const localCompression = (localWeight / totalWeight) * delta;
        cumulativeCompression += localCompression;

        const newY = originalPoints[i].y - cumulativeCompression;
        out.push(new THREE.Vector3(originalPoints[i].x, newY, originalPoints[i].z));
    }

    return out;
}

// ============================================================================
// Main Geometry Builder
// ============================================================================

export function buildSuspensionSpringGeometry(
    input: SuspensionSpringGeometryInput
): SuspensionSpringGeometryResult {

    const endSpec = resolveEndSpec(input.pitchProfile);

    // 1. Generate base curve points (at Free Length)
    const { points: basePoints } = buildSuspensionSpringCurvePoints(input);

    // 2. Determine target height based on Load State
    let targetHeight = input.freeLength;
    if (input.targetHeight !== undefined) {
        targetHeight = input.targetHeight;
    } else if (input.loadState) {
        switch (input.loadState) {
            case "preload":
                targetHeight = input.freeLength * 0.95;
                break;
            case "ride":
                targetHeight = input.freeLength * 0.85;
                break;
            case "bump":
                targetHeight = input.freeLength * 0.65;
                break;
        }
    }

    // 3. Apply weighted compression
    const finalPoints = applyCompression(
        basePoints,
        input.wireDiameter,
        targetHeight,
        input.freeLength,
        endSpec
    );

    // 4. Generate Tube Geometry
    const curve = new THREE.CatmullRomCurve3(finalPoints, false, "catmullrom", 0.05);

    const tubeGeometry = new THREE.TubeGeometry(
        curve,
        Math.min(600, (input.totalCoils || input.activeCoils + 2) * 100),
        input.wireDiameter / 2,
        input.radialSegments ?? 12,
        false
    );

    // Compute stats
    tubeGeometry.computeBoundingBox();
    const bbox = tubeGeometry.boundingBox || new THREE.Box3();

    // Wire length estimation
    let length = 0;
    for (let i = 0; i < finalPoints.length - 1; i++) {
        length += finalPoints[i].distanceTo(finalPoints[i + 1]);
    }

    return {
        geometry: tubeGeometry,
        curvepoints: finalPoints,
        wireLength: length,
        boundingBox: bbox
    };
}
