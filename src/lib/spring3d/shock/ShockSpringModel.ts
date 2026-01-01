/**
 * Shock Absorber Spring Model
 * 减震器弹簧数学模型
 * 
 * This module contains the law functions for shock absorber spring geometry.
 * All laws are C¹ continuous (smooth with continuous first derivative).
 * 
 * Key functions:
 * - meanRadiusLaw: Variable mean radius along the spring
 * - wireDiameterLaw: Variable wire diameter along the spring
 * - pitchLaw: Variable pitch with smooth closed-end transitions
 */

import type { ShockSpringParams, ShockSpringValidation } from './ShockSpringTypes';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Smoothstep interpolation (C¹ continuous)
 * Returns 0 for x <= edge0, 1 for x >= edge1,
 * and smooth interpolation for x between edge0 and edge1.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
    if (edge1 <= edge0) return x >= edge0 ? 1 : 0;
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Mean Radius Law
// ============================================================================

/**
 * Mean radius law: R(s) for s ∈ [0, 1]
 * 
 * Shapes:
 * - bulge: ends small, middle large (common for shock absorbers)
 * - hourglass: ends large, middle small (anti-buckling design)
 * - linear: piecewise linear with smooth transitions
 * 
 * @param params Spring parameters
 * @param s Normalized parameter [0, 1]
 * @returns Mean radius in mm
 */
export function meanRadiusLaw(params: ShockSpringParams, s: number): number {
    const { start, mid, end, shape } = params.meanDia;

    // Convert diameters to radii
    const rStart = start / 2;
    const rMid = mid / 2;
    const rEnd = end / 2;

    switch (shape) {
        case "bulge": {
            // Bulge: ends small, middle large
            // Use sin(π·s) for smooth C¹ transition
            // At s=0: sin(0)=0 → rStart
            // At s=0.5: sin(π/2)=1 → rMid
            // At s=1: sin(π)=0 → rEnd
            const r0 = (rStart + rEnd) / 2;
            const blend = Math.sin(Math.PI * s);
            // Interpolate: at ends → r0 blended with start/end, at middle → rMid
            const endBlend = rStart + (rEnd - rStart) * s;
            return endBlend + (rMid - endBlend) * blend;
        }

        case "hourglass": {
            // Hourglass: ends large, middle small (invert of bulge)
            const r0 = (rStart + rEnd) / 2;
            const blend = Math.sin(Math.PI * s);
            const endBlend = rStart + (rEnd - rStart) * s;
            return endBlend - (endBlend - rMid) * blend;
        }

        case "linear": {
            // Piecewise linear: start → mid at s=0.5 → end
            // Use smoothstep around s=0.5 for C¹ continuity
            const transitionWidth = 0.15;

            if (s < 0.5 - transitionWidth) {
                // Linear from start to mid
                return rStart + (rMid - rStart) * (s / 0.5);
            } else if (s > 0.5 + transitionWidth) {
                // Linear from mid to end
                const t = (s - 0.5) / 0.5;
                return rMid + (rEnd - rMid) * t;
            } else {
                // Smooth transition zone around s=0.5
                const beforeMid = rStart + (rMid - rStart) * (s / 0.5);
                const afterMid = rMid + (rEnd - rMid) * ((s - 0.5) / 0.5);
                const blend = smoothstep(0.5 - transitionWidth, 0.5 + transitionWidth, s);
                return lerp(beforeMid, afterMid, blend);
            }
        }

        default:
            return rStart;
    }
}

// ============================================================================
// Wire Diameter Law
// ============================================================================

/**
 * Wire diameter law: d(s) for s ∈ [0, 1]
 * 
 * Uses sin(π·s) blend for C¹ continuity.
 * Olive/ellipse shape: start/end thin, middle thick.
 * 
 * @param params Spring parameters
 * @param s Normalized parameter [0, 1]
 * @returns Wire diameter in mm
 */
export function wireDiameterLaw(params: ShockSpringParams, s: number): number {
    const { start, mid, end } = params.wireDia;

    // Blend using sin(π·s) for smooth C¹ transition
    // At s=0: sin(0)=0 → start
    // At s=0.5: sin(π/2)=1 → mid
    // At s=1: sin(π)=0 → end
    const blend = Math.sin(Math.PI * s);
    const endBlend = start + (end - start) * s;

    return endBlend + (mid - endBlend) * blend;
}

// ============================================================================
// Pitch Law
// ============================================================================

/**
 * Pitch law: P(s) for s ∈ [0, 1]
 * 
 * Supports three styles:
 * - symmetric: both ends closed, open in middle (standard shock absorber)
 * - progressive: pitch increases from bottom to top (progressive rate spring)
 * - regressive: pitch decreases from bottom to top
 * 
 * @param params Spring parameters
 * @param s Normalized parameter [0, 1]
 * @returns Pitch in mm per turn
 */
export function pitchLaw(params: ShockSpringParams, s: number): number {
    const {
        style = "symmetric",
        closedTurns,
        workingMin,
        workingMax,
        transitionSharpness,
        closedPitchFactor = 1.0
    } = params.pitch;
    const { totalTurns, wireDia } = params;

    // ========================================
    // Progressive: pitch increases from min to max
    // ========================================
    if (style === "progressive") {
        const closedTurnsStart = (typeof closedTurns === 'number') ? closedTurns : closedTurns.start;
        const closedTurnsEnd = (typeof closedTurns === 'number') ? closedTurns : closedTurns.end;

        // Apply smoothstep at the very beginning for smooth start
        const startTransition = closedTurnsStart / totalTurns;
        const endTransition = 1 - closedTurnsEnd / totalTurns;

        // Closed pitch at bottom (wire diameter)
        const closedPitch = closedPitchFactor * wireDia.start;

        if (s < startTransition) {
            // Closed zone at bottom
            const t = smoothstep(0, startTransition, s);
            return lerp(closedPitch, workingMin, t);
        } else if (s > endTransition) {
            // Closed zone at top (optional, can remove for pure progressive)
            const t = smoothstep(endTransition, 1, s);
            const closedPitchEnd = closedPitchFactor * wireDia.end;
            return lerp(workingMax, closedPitchEnd, t);
        } else {
            // Working zone: linear increase from min to max
            const t = (s - startTransition) / (endTransition - startTransition);
            // Use smoothstep-based curve for smoother transition
            const blend = Math.pow(t, clamp(transitionSharpness, 0.1, 2.0));
            return lerp(workingMin, workingMax, blend);
        }
    }

    // ========================================
    // Regressive: pitch decreases from max to min
    // ========================================
    if (style === "regressive") {
        const closedTurnsStart = (typeof closedTurns === 'number') ? closedTurns : closedTurns.start;
        const closedTurnsEnd = (typeof closedTurns === 'number') ? closedTurns : closedTurns.end;

        const startTransition = closedTurnsStart / totalTurns;
        const endTransition = 1 - closedTurnsEnd / totalTurns;

        const closedPitch = closedPitchFactor * wireDia.start;

        if (s < startTransition) {
            const t = smoothstep(0, startTransition, s);
            return lerp(closedPitch, workingMax, t);
        } else if (s > endTransition) {
            const t = smoothstep(endTransition, 1, s);
            const closedPitchEnd = closedPitchFactor * wireDia.end;
            return lerp(workingMin, closedPitchEnd, t);
        } else {
            const t = (s - startTransition) / (endTransition - startTransition);
            const blend = Math.pow(t, clamp(transitionSharpness, 0.1, 2.0));
            return lerp(workingMax, workingMin, blend);
        }
    }

    // ========================================
    // Symmetric: closed at both ends, open in middle (default)
    // ========================================
    // Handle asymmetric closed turns if object provided
    const closedTurnsStart = (typeof closedTurns === 'number') ? closedTurns : closedTurns.start;
    const closedTurnsEnd = (typeof closedTurns === 'number') ? closedTurns : closedTurns.end;

    const closedFracStart = closedTurnsStart / totalTurns;
    const closedFracEnd = closedTurnsEnd / totalTurns;

    // Closed pitch = factor * wire diameter at that end
    const closedPitchStart = closedPitchFactor * wireDia.start;
    const closedPitchEnd = closedPitchFactor * wireDia.end;

    // Calculate weights for closed zones (0 = fully closed, 1 = fully working)
    const leftWeight = smoothstep(0, closedFracStart, s);
    const rightWeight = 1.0 - smoothstep(1 - closedFracEnd, 1, s);
    const workingWeight = Math.min(leftWeight, rightWeight);

    // Working zone pitch with variable profile
    const sinBlend = Math.pow(Math.sin(Math.PI * s), clamp(transitionSharpness, 0.1, 2.0));
    const workingPitch = workingMin + (workingMax - workingMin) * sinBlend;

    // Closed pitch (blend based on position)
    const closedPitchSymmetric = lerp(closedPitchStart, closedPitchEnd, s);

    return lerp(closedPitchSymmetric, workingPitch, workingWeight);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate shock spring parameters and return warnings/errors
 * 
 * @param params Spring parameters to validate
 * @returns Validation result with warnings and errors
 */
export function validateParams(params: ShockSpringParams): ShockSpringValidation {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Basic validation
    if (params.totalTurns < 2) {
        errors.push("Total turns must be at least 2");
    }

    if (params.samplesPerTurn < 10) {
        warnings.push("Low samples per turn may reduce quality");
    }

    // Closed turns validation
    const closedTurnsValue = typeof params.pitch.closedTurns === 'number'
        ? params.pitch.closedTurns
        : Math.min(params.pitch.closedTurns.start, params.pitch.closedTurns.end);

    if (closedTurnsValue < 0.5) {
        warnings.push("Closed turns < 0.5 may not provide stable end support");
    }

    // Grinding validation
    if (params.grind.offsetTurns < 0) {
        errors.push("Grinding offset must be positive");
    }

    if (params.grind.offsetTurns > closedTurnsValue) {
        warnings.push("Grinding offset exceeds closed turns – will cut into working zone");
    }

    if (params.grind.offsetTurns > 1.0) {
        warnings.push("Grinding offset > 1 turn is unusual – check design intent");
    }

    // Wire diameter validation
    if (params.wireDia.start <= 0 || params.wireDia.mid <= 0 || params.wireDia.end <= 0) {
        errors.push("Wire diameter must be positive");
    }

    // Mean diameter validation
    if (params.meanDia.start <= params.wireDia.start ||
        params.meanDia.mid <= params.wireDia.mid ||
        params.meanDia.end <= params.wireDia.end) {
        errors.push("Mean diameter must be greater than wire diameter");
    }

    // Pitch validation
    if (params.pitch.workingMin <= 0 || params.pitch.workingMax <= 0) {
        errors.push("Working pitch must be positive");
    }

    if (params.pitch.workingMin > params.pitch.workingMax) {
        warnings.push("Working pitch min > max – values will be swapped");
    }

    // Spring index check (C = Dm/d)
    const minSpringIndex = Math.min(
        params.meanDia.start / params.wireDia.start,
        params.meanDia.mid / params.wireDia.mid,
        params.meanDia.end / params.wireDia.end
    );

    if (minSpringIndex < 4) {
        warnings.push(`Spring index too low (${minSpringIndex.toFixed(1)}) – may cause manufacturing issues`);
    }

    if (minSpringIndex > 20) {
        warnings.push(`Spring index too high (${minSpringIndex.toFixed(1)}) – may cause buckling`);
    }

    return { warnings, errors };
}

// ============================================================================
// Normalized Parameters Helper
// ============================================================================

/**
 * Normalize and clamp parameters to valid ranges
 * 
 * @param params Input parameters (may have invalid values)
 * @returns Normalized parameters with valid ranges
 */
export function normalizeParams(params: Partial<ShockSpringParams>): ShockSpringParams {
    const defaults: ShockSpringParams = {
        totalTurns: 10,
        samplesPerTurn: 60,
        meanDia: { start: 50, mid: 50, end: 50, shape: "linear" },
        wireDia: { start: 5.0, mid: 5.0, end: 5.0 },
        pitch: {
            style: "symmetric",
            closedTurns: 1.5,
            workingMin: 6.0,
            workingMax: 14.0,
            transitionSharpness: 0.5,
            closedPitchFactor: 1.05,
        },
        grind: { top: true, bottom: true, offsetTurns: 0.6 },
        material: { name: "Chrome Silicon (Cr-Si)", shearModulus: 79000, tensileStrength: 1600, density: 7.85 },
        loadcase: { length1: 100, force1: 500 },
        guide: { type: "none", diameter: 0 },
        dynamics: {},
        debug: { showCenterline: false, showFrames: false, showSections: false, showGrindingPlanes: false },
    };

    return {
        totalTurns: Math.max(2, params.totalTurns ?? defaults.totalTurns),
        samplesPerTurn: Math.max(10, params.samplesPerTurn ?? defaults.samplesPerTurn),
        meanDia: {
            start: Math.max(1, params.meanDia?.start ?? defaults.meanDia.start),
            mid: Math.max(1, params.meanDia?.mid ?? defaults.meanDia.mid),
            end: Math.max(1, params.meanDia?.end ?? defaults.meanDia.end),
            shape: params.meanDia?.shape ?? defaults.meanDia.shape,
        },
        wireDia: {
            start: Math.max(0.1, params.wireDia?.start ?? defaults.wireDia.start),
            mid: Math.max(0.1, params.wireDia?.mid ?? defaults.wireDia.mid),
            end: Math.max(0.1, params.wireDia?.end ?? defaults.wireDia.end),
        },
        pitch: {
            style: params.pitch?.style ?? defaults.pitch.style,
            closedTurns: (typeof (params.pitch?.closedTurns ?? defaults.pitch.closedTurns) === 'number')
                ? Math.max(0, (params.pitch?.closedTurns ?? defaults.pitch.closedTurns) as number)
                : {
                    start: Math.max(0, ((params.pitch?.closedTurns as any)?.start ?? (defaults.pitch.closedTurns as any).start ?? 0)),
                    end: Math.max(0, ((params.pitch?.closedTurns as any)?.end ?? (defaults.pitch.closedTurns as any).end ?? 0))
                },
            workingMin: Math.max(0.1, params.pitch?.workingMin ?? defaults.pitch.workingMin),
            workingMax: Math.max(0.1, params.pitch?.workingMax ?? defaults.pitch.workingMax),
            transitionSharpness: clamp(params.pitch?.transitionSharpness ?? defaults.pitch.transitionSharpness, 0.1, 2.0),
            closedPitchFactor: Math.max(0.5, params.pitch?.closedPitchFactor ?? defaults.pitch.closedPitchFactor ?? 1.0),
        },
        grind: {
            top: params.grind?.top ?? defaults.grind.top,
            bottom: params.grind?.bottom ?? defaults.grind.bottom,
            offsetTurns: Math.max(0, params.grind?.offsetTurns ?? defaults.grind.offsetTurns),
        },
        material: {
            name: params.material?.name ?? defaults.material.name,
            shearModulus: Math.max(1, params.material?.shearModulus ?? defaults.material.shearModulus),
            tensileStrength: Math.max(1, params.material?.tensileStrength ?? defaults.material.tensileStrength),
            density: Math.max(0.1, params.material?.density ?? defaults.material.density),
        },
        loadcase: {
            length1: Math.max(0, params.loadcase?.length1 ?? defaults.loadcase.length1),
            force1: Math.max(0, params.loadcase?.force1 ?? defaults.loadcase.force1),
            length2: params.loadcase?.length2,
            force2: params.loadcase?.force2,
            freeLength: params.loadcase?.freeLength,
        },
        guide: {
            type: params.guide?.type ?? defaults.guide.type,
            diameter: Math.max(0, params.guide?.diameter ?? defaults.guide.diameter),
        },
        dynamics: {
            mass: params.dynamics?.mass,
            naturalFrequency: params.dynamics?.naturalFrequency,
        },
        debug: {
            showCenterline: params.debug?.showCenterline ?? defaults.debug.showCenterline,
            showFrames: params.debug?.showFrames ?? defaults.debug.showFrames,
            showSections: params.debug?.showSections ?? defaults.debug.showSections,
            showGrindingPlanes: params.debug?.showGrindingPlanes ?? defaults.debug.showGrindingPlanes,
        },
    };
}
