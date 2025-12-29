
import * as THREE from 'three';
import { type ExtensionDesignMeta } from "@/lib/stores/springSimulationStore";
import { buildHookCenterline, getHookSpec } from '@/lib/spring3d/HookBuilder';
import { type ExtensionSpringCenterlineMm, type Vec3Mm } from './types';

// Helper to convert THREE Vector3 to Vec3Mm
const toVec3 = (v: THREE.Vector3): Vec3Mm => ({ x: v.x, y: v.y, z: v.z });

/**
 * Build Extension Spring Centerline in pure MM
 * SSOT for CAD Export
 */
export function buildExtensionSpringCenterlineMm(
    design: ExtensionDesignMeta,
    currentExtensionMm: number = 0
): ExtensionSpringCenterlineMm {
    // Defense checks
    if (design.activeCoils <= 0) console.warn("activeCoils must be > 0");
    if (design.wireDiameter <= 0) console.warn("wireDiameter must be > 0");
    if (design.outerDiameter <= design.wireDiameter) console.warn("outerDiameter must be > wireDiameter");

    const extension = Math.max(0, currentExtensionMm);
    if (currentExtensionMm < 0) console.warn("Negative extension clamped to 0");

    const {
        wireDiameter,
        outerDiameter,
        activeCoils,
        hookType
    } = design;

    const meanDiameter = outerDiameter - wireDiameter;
    const meanRadius = meanDiameter / 2.0;

    // 1. Body Geometry
    // Solid body length = activeCoils * wireDiameter
    // Extended length = solidBody + extension
    const solidBodyLength = activeCoils * wireDiameter;
    const extendedLength = solidBodyLength + extension;

    // Sampling: increased for smoothness (requested by user)
    // Was 72, now 120 per turn (3 degrees) or min 360 total
    const pointsPerTurn = 120;
    const minPoints = 360;
    const totalPoints = Math.max(minPoints, Math.ceil(activeCoils * pointsPerTurn) + 1);
    const totalAngle = activeCoils * 2 * Math.PI;

    const bodyPoints: Vec3Mm[] = [];
    const bodyThreePoints: THREE.Vector3[] = [];

    for (let i = 0; i < totalPoints; i++) {
        const ratio = i / (totalPoints - 1);
        const theta = ratio * totalAngle;
        const z = ratio * extendedLength;

        const x = meanRadius * Math.cos(theta);
        const y = meanRadius * Math.sin(theta);

        bodyPoints.push({ x, y, z });
        bodyThreePoints.push(new THREE.Vector3(x, y, z));
    }

    // 2. Hooks
    // HookBuilder handles the geometry based on specs
    // We pass true MM dimensions
    const spec = getHookSpec(hookType);

    const startHookThree = buildHookCenterline(
        'start',
        spec,
        bodyThreePoints,
        meanRadius,
        wireDiameter
    );

    const endHookThree = buildHookCenterline(
        'end',
        spec,
        bodyThreePoints,
        meanRadius,
        wireDiameter
    );

    const startHook = startHookThree.map(toVec3);
    const endHook = endHookThree.map(toVec3);

    // 3. Merge Centerline
    const centerline: Vec3Mm[] = [...startHook, ...bodyPoints, ...endHook];

    return {
        startHook,
        body: bodyPoints,
        endHook,
        centerline,
        stats: {
            meanRadiusMm: meanRadius,
            wireDiameterMm: wireDiameter,
            extendedLengthMm: extendedLength,
            activeCoils,
            hookType,
            sampleCountBody: totalPoints,
            samplePerTurn: pointsPerTurn,
        }
    };
}
