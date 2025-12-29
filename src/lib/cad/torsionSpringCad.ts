
import * as THREE from 'three';
import { type TorsionDesignMeta } from "@/lib/stores/springSimulationStore";
import { type TorsionSpringCenterlineMm, type Vec3Mm } from './types';

// Helper to convert THREE Vector3 to Vec3Mm
const toVec3 = (v: THREE.Vector3): Vec3Mm => ({ x: v.x, y: v.y, z: v.z });

const TWO_PI = Math.PI * 2;

function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

function normalizeAngle(angle: number): number {
    let a = angle % TWO_PI;
    if (a <= -Math.PI) a += TWO_PI;
    if (a > Math.PI) a -= TWO_PI;
    return a;
}

/**
 * Calculate total helix angle to match leg angles
 * Copied from torsionSpringGeometry.ts logic but simplified for SSOT
 */
function calculateHelixTotalAngle(
    activeCoils: number,
    freeAngle: number,
    workingAngle: number,
    windingDirection: "left" | "right"
): number {
    const dirMult = windingDirection === "right" ? 1 : -1;
    const currentLegAngleDeg = freeAngle - workingAngle;
    const currentLegAngleRad = degToRad(currentLegAngleDeg);

    const baseAngle = TWO_PI * activeCoils;
    const targetEndAngle = normalizeAngle(Math.PI - currentLegAngleRad);
    const baseEndAngle = normalizeAngle(baseAngle);

    let extraAngle = targetEndAngle - baseEndAngle;
    extraAngle = normalizeAngle(extraAngle);

    const totalAngle = baseAngle + extraAngle;
    return totalAngle * dirMult;
}

/**
 * Build Torsion Spring Centerline in pure MM
 * SSOT for CAD Export
 */
export function buildTorsionSpringCenterlineMm(
    design: TorsionDesignMeta,
    currentDeflectionDeg: number = 0
): TorsionSpringCenterlineMm {

    const {
        wireDiameter,
        meanDiameter,
        activeCoils,
        pitch,
        legLength1,
        legLength2,
        freeAngle,
        windingDirection
    } = design;

    // 1. Calculate Helix Parameters
    const workingAngle = currentDeflectionDeg;
    const totalAngle = calculateHelixTotalAngle(activeCoils, freeAngle, workingAngle, windingDirection);
    const actualCoils = Math.abs(totalAngle) / TWO_PI;

    // Use pure MM pitch (default to wireDiameter if pitch not set/invalid)
    const effectivePitch = (pitch && pitch >= wireDiameter) ? pitch : wireDiameter;
    const bodyLengthMm = effectivePitch * actualCoils;
    const meanRadius = meanDiameter / 2.0;

    // 2. Body Generation (High Res)
    // 200 points per turn for ultra-smoothness
    const pointsPerTurn = 200;
    const minPoints = 400;
    const totalPoints = Math.max(minPoints, Math.ceil(actualCoils * pointsPerTurn) + 1);

    const bodyPoints: Vec3Mm[] = [];
    const bodyThreePoints: THREE.Vector3[] = []; // Keep for leg calc reuse

    for (let i = 0; i < totalPoints; i++) {
        const ratio = i / (totalPoints - 1);
        const theta = ratio * totalAngle;
        const z = ratio * bodyLengthMm;

        const x = meanRadius * Math.cos(theta);
        const y = meanRadius * Math.sin(theta);

        const v = new THREE.Vector3(x, y, z);
        bodyPoints.push(toVec3(v));
        bodyThreePoints.push(v);
    }

    // 3. Legs
    const startPoint = bodyThreePoints[0];
    const endPoint = bodyThreePoints[bodyThreePoints.length - 1];
    const startAngle = 0;
    const endAngle = totalAngle;

    const leg1Three = generateLegMm(
        startPoint,
        startAngle,
        legLength1,
        true,
        windingDirection
    );

    const leg2Three = generateLegMm(
        endPoint,
        endAngle,
        legLength2,
        false,
        windingDirection
    );

    // Snap leg connection points to body exactly
    if (leg1Three.length > 0) leg1Three[0].copy(startPoint);
    if (leg2Three.length > 0) leg2Three[0].copy(endPoint);

    // Leg1 generated OUT from body, but global path is Tip -> Body -> Leg2
    const leg1 = leg1Three.map(toVec3).reverse();
    const leg2 = leg2Three.map(toVec3);

    const centerline: Vec3Mm[] = [
        ...leg1.slice(0, -1),
        ...bodyPoints,
        ...leg2.slice(1)
    ];

    return {
        leg1,
        body: bodyPoints,
        leg2,
        centerline,
        stats: {
            meanRadiusMm: meanRadius,
            wireDiameterMm: wireDiameter,
            bodyLengthMm,
            activeCoils: actualCoils,
            legLength1Mm: legLength1,
            legLength2Mm: legLength2,
            sampleCountBody: totalPoints,
            sampleCountLegs: 31 // numSegments + 1 (see generateLegMm)
        }
    };
}

function generateLegMm(
    origin: THREE.Vector3,
    angle: number,
    length: number,
    isLeg1: boolean,
    windingDirection: "left" | "right"
): THREE.Vector3[] {
    const dirMult = windingDirection === "right" ? 1 : -1;
    const points: THREE.Vector3[] = [];

    // Tangent at spiral: (-sin(theta), cos(theta))
    // Leg1 (Start): Opposite to travel direction
    // Leg2 (End): Same as travel direction

    let dirX: number, dirY: number;

    if (isLeg1) {
        // theta = 0, tangent = (0, 1)
        const tx = 0, ty = 1;
        // Opposite to travel
        dirX = -tx * dirMult;
        dirY = -ty * dirMult;
    } else {
        // theta = endAngle
        const tx = -Math.sin(angle);
        const ty = Math.cos(angle);
        // Same as travel
        dirX = tx * (windingDirection === "right" ? 1 : -1);
        // Wait: in torsionSpringGeometry.ts:
        // const sign = windingDirection === "right" ? 1 : -1;
        // legDirX = tangentX * sign;
        // So yes, it is exactly the same logic.
        dirY = ty * (windingDirection === "right" ? 1 : -1);
    }

    const numSegments = 30;
    for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const x = origin.x + t * length * dirX;
        const y = origin.y + t * length * dirY;
        const z = origin.z; // planar legs
        points.push(new THREE.Vector3(x, y, z));
    }

    return points;
}
