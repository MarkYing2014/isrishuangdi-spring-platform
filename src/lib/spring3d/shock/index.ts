/**
 * Shock Absorber Spring Module
 * 减震器弹簧模块
 * 
 * This module provides law-driven parametric geometry for shock absorber springs
 * with variable wire diameter, mean diameter, and pitch.
 * 
 * Features:
 * - C¹ continuous law functions for smooth geometry
 * - Parallel Transport Frames for twist-free visualization
 * - Numerical integration for accurate z-coordinates
 * - Grinding cut planes based on turns (not height)
 * 
 * Usage:
 * ```typescript
 * import { 
 *   buildShockSpringCenterline, 
 *   computeParallelTransportFrames,
 *   computeShockSpringMetrics 
 * } from '@/lib/spring3d/shock';
 * 
 * const params: ShockSpringParams = { ... };
 * const centerline = buildShockSpringCenterline(params);
 * const frames = computeParallelTransportFrames(centerline.points);
 * const metrics = computeShockSpringMetrics(centerline, params);
 * ```
 */

// Types
export type {
    ShockSpringParams,
    CenterlineResult,
    FramesResult,
    GrindCutPlanes,
    ShockSpringValidation,
    ShockSpringMetrics,
    MeanDiameterShape,
    PitchStyle,
} from './ShockSpringTypes';

export { DEFAULT_SHOCK_SPRING_PARAMS } from './ShockSpringTypes';

// Model (Law Functions)
export {
    smoothstep,
    lerp,
    clamp,
    meanRadiusLaw,
    wireDiameterLaw,
    pitchLaw,
    validateParams,
    normalizeParams,
} from './ShockSpringModel';

// Geometry
export {
    buildShockSpringCenterline,
    computeGrindCutPlanes,
    getTrimmedCenterline,
    samplePitchLaw,
} from './ShockSpringGeometry';

// Frames
export {
    computeParallelTransportFrames,
    getFrameAxisLines,
} from './ShockSpringFrames';

// Metrics
export {
    computeShockSpringMetrics,
    computeSpringWeight,
    computeApproximateSpringRate,
} from './ShockSpringMetrics';
