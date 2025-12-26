import * as THREE from "three";

export type GarterInputs = {
    wireDiameter: number;     // d (mm)
    coilMeanDiameter: number; // Dm (mm) small coil mean diameter
    ringDiameter: number;     // D_ring (mm) use installed or free depending on mode
    turnsAroundRing: number;  // N
    jointType?: "hook" | "screw" | "loop";
    jointGapAngleDeg?: number; // gap size in degrees along ring
};

export function buildGarterCenterlinePoints(
    inpt: GarterInputs,
    segments = 800
): THREE.Vector3[] {
    const Dm = inpt.coilMeanDiameter;
    const Dr = inpt.ringDiameter;
    const N = Math.max(1, inpt.turnsAroundRing);

    const R = Dr / 2;
    const a = Dm / 2;

    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;

        const phi = 2 * Math.PI * t; // Ring angle (0 to 2pi)
        const psi = 2 * Math.PI * N * t; // Coil angle (0 to N*2pi)

        // Ring Center P_ring
        const cx = R * Math.cos(phi);
        const cy = R * Math.sin(phi);
        const C = new THREE.Vector3(cx, cy, 0);

        // Frenet Frame (Explicit)
        // Tangent T is [-sin, cos, 0]
        // Normal Nn (Radial Outward) is [cos, sin, 0]
        // Binormal B (Z-axis) is [0, 0, 1]
        const Nn = new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0);
        const B = new THREE.Vector3(0, 0, 1);

        // Helical Offset: a * (cos(psi)*Nn + sin(psi)*B)
        const offset = new THREE.Vector3()
            .addScaledVector(Nn, a * Math.cos(psi))
            .addScaledVector(B, a * Math.sin(psi));

        // Final Point
        pts.push(C.add(offset));
    }
    return pts;
}

export function splitByJointGap(
    pts: THREE.Vector3[],
    jointGapAngleDeg = 0 // Default 0 means closed loop possible if logic supports
) {
    // Gap is centered at phi = 0 (which is index 0 and index MAX)
    // Total angle is 360 deg.
    const gapDeg = Math.max(0, jointGapAngleDeg);

    // If negligible gap, return all points (closed loop scenario logic handled in mesh builder)
    if (gapDeg < 0.1) {
        return { keepPoints: pts, A: pts[0], B: pts[pts.length - 1] };
    }

    const total = pts.length;
    const gapFrac = gapDeg / 360;

    // Indices to cut
    // Gap spans [-gap/2, +gap/2] around 0.
    // In normalized t [0,1]:  [0, gapFrac/2] AND [1-gapFrac/2, 1]

    const cutCountHalf = Math.floor((gapFrac / 2) * total);

    // Cut start (from beginning of array) -> 0 to cutCountHalf
    const endCutIndex = cutCountHalf;

    // Cut end (from end of array) -> total - cutCountHalf to total
    const startCutIndex = total - cutCountHalf;

    const keep: THREE.Vector3[] = [];

    for (let i = 0; i < total; i++) {
        // Gap Logic: Remove points that are "in the gap" at the start OR end of the array
        const inGapStart = i <= endCutIndex;
        const inGapEnd = i >= startCutIndex;

        if (!inGapStart && !inGapEnd) {
            keep.push(pts[i]);
        }
    }

    // A and B for joint connection
    // A is the end of the strip (last point kept)
    // B is the start of the strip (first point kept)
    // Wait, standard orientation: strip goes 0->1.
    // If we cut around 0, the "Start" of the visible strip is effectively gap/2.
    // The "End" of the visible strip is 360 - gap/2.
    // So B (start of gap visual from right side?) -> keep[0]
    // A (end of gap visual from left side?) -> keep[last]

    const B_point = keep[0]; // The point at angle +gap/2
    const A_point = keep[keep.length - 1]; // The point at angle -gap/2 (aka 360-gap/2)

    return { keepPoints: keep, A: A_point, B: B_point };
}

export function calculateGarterCurveParams(
    points: THREE.Vector3[],
    wireDiameter: number
) {
    if (points.length < 2) return null;

    const isClosed = points[0].distanceTo(points[points.length - 1]) < (wireDiameter * 0.1);
    const curve = new THREE.CatmullRomCurve3(points, isClosed, "centripetal", 0.5);

    // Perf limit: 200 - 2000 segments
    const tubularSegments = Math.min(2000, Math.max(200, points.length * 2));
    const radius = wireDiameter / 2;
    const radialSegments = 12;

    return { curve, tubularSegments, radius, radialSegments, isClosed };
}

export function calculateJointTransform(
    A: THREE.Vector3,
    B: THREE.Vector3,
    wireDiameter: number
) {
    if (!A || !B) return null;

    const dir = new THREE.Vector3().subVectors(B, A);
    const len = dir.length();

    // Don't render if too small
    if (len < wireDiameter * 0.1) return null;

    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
    dir.normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

    return {
        position: mid,
        quaternion: quat,
        length: len,
        radius: wireDiameter * 0.55
    };
}
