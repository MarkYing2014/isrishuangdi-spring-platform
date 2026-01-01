/**
 * Shock Spring Module - Geometric Laws
 * 
 * Defines the PURE geometric functions R(t), d(t), Pitch(t) for the spring.
 * t is parameter [0, Nt].
 */

import type { ShockSpringInput, ShockSpringDerived, MeanDiameterShape, PitchStyle } from "./types";
import * as THREE from "three";

const { clamp } = THREE.MathUtils;

// ============================================================================
// 1. Law Definitions (C0/C1 Continuous)
// ============================================================================

/**
 * Mean Radius Law R(t)
 * Handles Linear, Bulge (Barrel), and Hourglass shapes.
 */
export function meanRadiusLaw(t: number, totalTurns: number, params: ShockSpringInput['meanDia']): number {
    const { start, mid, end, shape } = params;
    const rStart = start / 2;
    const rMid = mid / 2;
    const rEnd = end / 2;

    const n = totalTurns;

    // Normalize t to [0, 2] for interpolation convenience if needed, 
    // but typically we map t/n to [0, 1]
    const u = t / n; // 0 to 1

    if (shape === "linear") {
        // Simple linear interpolation
        return rStart + (rEnd - rStart) * u;
    } else if (shape === "bulge" || shape === "hourglass") {
        // Quadratic or Sine blend
        // We want R(0)=start, R(0.5)=mid, R(1)=end
        // Using a quadratic Bezier-like blend for smoothness
        const split = 0.5;
        if (u < split) {
            // Blend start -> mid
            const k = u / split; // 0 to 1
            // Use sin blend for smooth C1 at mid
            const w = Math.sin(k * Math.PI / 2); // 0 to 1
            return rStart + (rMid - rStart) * w;
        } else {
            // Blend mid -> end
            const k = (u - split) / (1 - split); // 0 to 1
            const w = 1 - Math.cos(k * Math.PI / 2); // 0 to 1
            return rMid + (rEnd - rMid) * w;
        }
    }
    return rStart; // Fallback
}

/**
 * Wire Diameter Law d(t)
 * Supports tapering at ends (Olive shape) or uniform.
 */
export function wireDiameterLaw(t: number, totalTurns: number, params: ShockSpringInput['wireDia']): number {
    const { start, mid, end } = params;
    const n = totalTurns;
    const u = t / n;

    // Standard industrial taper often applies only to the first/last turn
    // But for "Olive" shape, it's a continuous variation

    // Let's implement full C1 interpolation similar to mean radius
    if (start === mid && mid === end) return start;

    const split = 0.5;
    if (u < split) {
        const k = u / split;
        const w = Math.sin(k * Math.PI / 2);
        return start + (mid - start) * w;
    } else {
        const k = (u - split) / (1 - split);
        const w = 1 - Math.cos(k * Math.PI / 2);
        return mid + (end - mid) * w;
    }
}

/**
 * Pitch Law P(t)
 * Defines instantaneous pitch (mm/turn).
 * Handles Closed Ends, Working Zone, and Transitions.
 */
export function pitchLaw(t: number, input: ShockSpringInput): number {
    const { totalTurns, pitch, wireDia, grinding } = input;
    const { closedTurns, workingMin, workingMax, style, transitionSharpness, closedPitchFactor } = pitch;

    const n = totalTurns;

    // Get local wire diameter at this turn for closed pitch calculation
    const dLocal = wireDiameterLaw(t, totalTurns, input.wireDia);
    const pClosed = dLocal * (closedPitchFactor || 1.05);

    // Default closed turns: 0 if open, else user value
    // NOTE: If grinding is applied, often we simulate extra material then cut, 
    // but physically the pitch law remains the same. The trim happens later.

    // Calculate boundaries
    const turnsBottom = typeof closedTurns === 'number' ? closedTurns : closedTurns.start;
    const turnsTop = typeof closedTurns === 'number' ? closedTurns : closedTurns.end;

    // Working region boundaries
    // Transition zone width depends on sharpness (lower = wider transition)
    // We'll use a sigmoid-like blend
    const blendWidth = Math.max(0.1, 2.0 - clamp(transitionSharpness, 0.1, 2.0));

    // Define target pitch in working zone
    let pWorking = workingMin;
    if (style === "symmetric") {
        // Max pitch at center, min at edges (but inside working zone)
        // Simple parabolic or sin blend between workingMin and workingMax
        const u = t / n;
        // 0 -> 0.5 -> 1
        // we want 0.5 maps to Max, 0/1 maps to Min (relative to working zone)
        // actually standard shock starts workingMin near closed, and workingMax at center
        const centerDist = 1 - Math.abs(2 * u - 1); // 0 at ends, 1 at center
        pWorking = workingMin + (workingMax - workingMin) * centerDist;
    } else if (style === "progressive") {
        // Min at bottom, Max at top
        const u = t / n;
        pWorking = workingMin + (workingMax - workingMin) * u;
    } else if (style === "regressive") {
        // Max at bottom, Min at top
        const u = t / n;
        pWorking = workingMax - (workingMax - workingMin) * u;
    }

    // Apply end transitions (Closed -> Working)
    // Weight for Bottom Closed
    // if t < turnsBottom, we want 1.0 (Closed). if t > turnsBottom + width, 0.0 (Working)
    let wClosed = 0;

    const bottomEnd = turnsBottom;
    const topStart = n - turnsTop;

    // Blend Factor Bottom
    if (t < bottomEnd) {
        wClosed = 1;
    } else if (t < bottomEnd + blendWidth) {
        // Linear fade for stability, or smoothstep
        const k = (t - bottomEnd) / blendWidth;
        wClosed = 0.5 * (1 + Math.cos(k * Math.PI)); // Cosine ease out
    }

    // Blend Factor Top
    if (t > topStart) {
        wClosed = 1;
    } else if (t > topStart - blendWidth) {
        const k = (topStart - t) / blendWidth;
        // Make sure we don't double count if overlap (short spring)
        wClosed = Math.max(wClosed, 0.5 * (1 + Math.cos(k * Math.PI)));
    }

    // Interpolate
    return pClosed * wClosed + pWorking * (1 - wClosed);
}


// ============================================================================
// 2. Geometry Generation (Centerline & Frames)
// ============================================================================

export function generateCenterline(input: ShockSpringInput): ShockSpringDerived {
    const { totalTurns, samplesPerTurn } = input;
    const numPoints = Math.ceil(totalTurns * samplesPerTurn) + 1;

    const points: THREE.Vector3[] = [];
    const radii: number[] = [];
    const segments: any[] = []; // Typed in result interface

    const frames = {
        tangents: [] as THREE.Vector3[],
        normals: [] as THREE.Vector3[],
        binormals: [] as THREE.Vector3[],
    };

    let zCurrent = 0;
    let totalLength = 0;

    // Generate points by integrating pitch
    for (let i = 0; i < numPoints; i++) {
        const t = (i / (numPoints - 1)) * totalTurns;
        const theta = t * 2 * Math.PI;

        const r = meanRadiusLaw(t, totalTurns, input.meanDia);
        const pitch = pitchLaw(t, input);
        const d = wireDiameterLaw(t, totalTurns, input.wireDia);

        // Helix coordinates
        // x = r * cos(theta)
        // y = r * sin(theta)
        // z = integral(pitch * dt) -> approximate as sum

        // Exact integration requires small steps. We use numerical sum.
        if (i > 0) {
            const tPrev = ((i - 1) / (numPoints - 1)) * totalTurns;
            const pPrev = pitchLaw(tPrev, input);
            const dt = t - tPrev;
            const dz = ((pitch + pPrev) / 2) * dt; // Trapezoidal
            zCurrent += dz;

            // Wire length accumulation
            // ds^2 = (r*dtheta)^2 + dz^2
            const dTheta = 2 * Math.PI * dt;
            const arc = r * dTheta;
            const dl = Math.sqrt(arc * arc + dz * dz);
            totalLength += dl;
        }

        points.push(new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), zCurrent));
        radii.push(d / 2); // Use wire radius, not helix radius

        // Store segment info for physics
        if (i > 0) {
            segments.push({
                index: i - 1,
                isActive: true,
                normStart: (i - 1) / (numPoints - 1),
                normEnd: i / (numPoints - 1),
                pitch: pitch,
                wireDia: d,
                meanDia: r,
                gap: Math.max(0, pitch - d)
            });
        }
    }

    // Compute Frenet Frames (Parallel Transport to avoid flipping)
    // Tangent T
    for (let i = 0; i < points.length - 1; i++) {
        const T = new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize();
        frames.tangents.push(T);
    }
    frames.tangents.push(frames.tangents[frames.tangents.length - 1]); // Duplicate last

    // Normal N and Binormal B (Parallel Transport)
    let normal = new THREE.Vector3(1, 0, 0); // Initial guess
    // Ensure initial normal is orthogonal to initial tangent
    const t0 = frames.tangents[0];
    const proj = t0.clone().multiplyScalar(normal.dot(t0));
    normal.sub(proj).normalize();

    frames.normals.push(normal);
    frames.binormals.push(new THREE.Vector3().crossVectors(t0, normal).normalize());

    for (let i = 1; i < points.length; i++) {
        const tPrev = frames.tangents[i - 1];
        const tCurr = frames.tangents[i];

        // Rotation axis to align tPrev with tCurr
        let axis = new THREE.Vector3().crossVectors(tPrev, tCurr);
        if (axis.lengthSq() < 0.0001) {
            axis = new THREE.Vector3(0, 0, 1); // Fallback
        } else {
            axis.normalize();
        }

        const angle = Math.acos(clamp(tPrev.dot(tCurr), -1, 1));

        const nextNormal = frames.normals[i - 1].clone().applyAxisAngle(axis, angle);
        frames.normals.push(nextNormal);

        const nextBinormal = new THREE.Vector3().crossVectors(tCurr, nextNormal).normalize();
        frames.binormals.push(nextBinormal);
    }

    // Grinding Planes (Local Space)
    // If Grinding is ON, we compute the cut planes
    // Standard shock grinding: top and bottom turns are ground flat
    // offsetTurns defines how deep the cut is
    const { offsetTurns, grindStart, grindEnd } = input.grinding;
    let startZ: number | null = null;
    let endZ: number | null = null;

    if (grindStart) {
        // Find center of wire at t = offsetTurns
        // Simplified: use z at t = offsetTurns
        const idx = Math.floor(offsetTurns * samplesPerTurn);
        if (idx < points.length) {
            startZ = points[idx].z;
        }
    }

    if (grindEnd) {
        // Find center of wire at t = Nt - offsetTurns
        const idx = Math.floor((totalTurns - offsetTurns) * samplesPerTurn);
        if (idx >= 0 && idx < points.length) {
            endZ = points[idx].z;
        }
    }

    // Calculate solid height
    // Consistency Fix: Integrate d(t) exactly as we integrated Pitch(t) for L0.
    // Scale Sum(d_i * dt) where dt is fraction of total turns?
    // segments[j] covers t from normStart to normEnd (0..1 scale) -> * totalTurns
    let solidHeight = 0;

    if (segments.length > 0) {
        solidHeight = segments.reduce((sum: number, s: any) => {
            const dt = (s.normEnd - s.normStart) * totalTurns;
            return sum + s.wireDia * dt;
        }, 0);
    }

    // Solid height factor for ground ends
    if (grindStart) solidHeight -= wireDiameterLaw(0, totalTurns, input.wireDia) * 0.5; // Roughly half wire removed
    if (grindEnd) solidHeight -= wireDiameterLaw(totalTurns, totalTurns, input.wireDia) * 0.5;


    // Calculate Mass
    // Volume = Area * Length
    // We have variable wire diameter, so strictly Volume = Integral (pi * (d(t)/2)^2) dl.
    // Simplifying: Volume = (pi * (d_avg/2)^2) * totalLength? Or usage of segments?
    // Let's use segments for better accuracy if wire varies.
    // Or just simple approximation if wire is mostly constant.
    // Given we have segments:
    let volume = 0;
    if (segments.length > 0) {
        // segments[i] has wireDia and covers length (arc length) ~ dist(point[i], point[i+1])
        // We stored dl in totalLength, but didn't store per-segment length in 'segments'.
        // Let's iterate points again? Or use average wireDia * totalLength.
        // For standard springs, wireDia is constant. For olives, it changes.
        // Let's use simple approximation for now: Volume = TotalLength * (PI * (d_mid/2)^2).
        // Wait, input has wireDia params.
        const d_avg = (input.wireDia.start + input.wireDia.mid + input.wireDia.end) / 3; // Rough
        // Let's be slightly better: use segments wireDia?
        // Actually, we can just sum segment volumes if we had length.

        // Re-looping is expensive? No, N=samples*turns.
        // Let's use simple approximation to avoid re-loop overhead for now.
        // Most shock springs have constant wire.
        const radius = input.wireDia.mid / 2;
        volume = totalLength * Math.PI * radius * radius;
    }

    // Density is in g/cm^3 = g / (1000 mm^3) = 0.001 g/mm^3
    const density = input.material.density * 0.001;
    const mass = volume * density;

    return {
        wireLength: totalLength,
        freeLength: zCurrent,
        mass,
        centerline: points,
        frames,
        radii,
        solidHeight,
        grindingPlanes: {
            startZ,
            endZ,
            startNormal: new THREE.Vector3(0, 0, 1), // Cutting from bottom up
            endNormal: new THREE.Vector3(0, 0, -1) // Cutting from top down
        },
        segments
    };
}
