
import * as THREE from 'three';

export type BackboneFrame = {
    p: THREE.Vector3; // Position
    t: THREE.Vector3; // Tangent
    n: THREE.Vector3; // Normal
    b: THREE.Vector3; // Binormal
    s: number;        // Arc length from start
};

export function buildArcBackboneFrames(params: {
    arcRadiusMm: number;
    alphaDeg: number;
    samples: number;
    profile: 'ARC' | 'BOW';
    bowLeanDeg?: number;
    bowPlaneTiltDeg?: number;
}): BackboneFrame[] {
    const { arcRadiusMm, alphaDeg, samples, profile } = params;

    // Basic guardrails
    if (arcRadiusMm <= 0 || alphaDeg <= 0 || samples < 2) {
        // Return at least 2 default frames to prevent downstream crashes
        return [
            { p: new THREE.Vector3(0, 0, 0), t: new THREE.Vector3(1, 0, 0), n: new THREE.Vector3(0, 1, 0), b: new THREE.Vector3(0, 0, 1), s: 0 },
            { p: new THREE.Vector3(1, 0, 0), t: new THREE.Vector3(1, 0, 0), n: new THREE.Vector3(0, 1, 0), b: new THREE.Vector3(0, 0, 1), s: 1 }
        ];
    }

    const frames: BackboneFrame[] = [];

    // Calculate raw circular arc parameters
    const deg2rad = Math.PI / 180;
    const alphaRad = alphaDeg * deg2rad;
    const startAngle = -alphaRad / 2; // Symmetrical around 0 (usually placed at "top")

    // Pose transforms for BOW profile
    // Bow usually sits more "upright" or tilted differently than a flat DMF arc

    // 1. Plane Tilt: rotate the entire arc plane around the chord line (X-axis approximation)
    const planeTiltRad = (profile === 'BOW' ? (params.bowPlaneTiltDeg ?? 0) : 0) * deg2rad;
    const cosTilt = Math.cos(planeTiltRad);
    const sinTilt = Math.sin(planeTiltRad);

    // 2. Lean: tilt each cross-section or the wire itself relative to the backbone
    // Actually, "lean" in bow springs usually means the arc plane itself is tilted, 
    // or the cross-section is rotated. 
    // Here we interpret "lean" as rotating the Frenet frame around the tangent.
    // This simulates the spring wire "leaning" over.
    const leanRad = (profile === 'BOW' ? (params.bowLeanDeg ?? 0) : 0) * deg2rad;
    const cosLean = Math.cos(leanRad);
    const sinLean = Math.sin(leanRad);

    for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const theta = startAngle + u * alphaRad;
        const s = u * (alphaRad * arcRadiusMm);

        // Standard Circle in XY plane (Arc Spring typical orientation)
        // x = r * cos(theta), y = r * sin(theta) -- but often Arc Springs are centered differently.
        // Let's assume standard DMF orientation: Center at (0,0,0), arc flows around Z axis?
        // Usually standard definition: r is distance from axis.
        // Let's stick to standard 2D circle in XY first:
        // x = r * cos(theta)
        // y = r * sin(theta)
        // z = 0
        // Tangent is (-sin, cos, 0)

        // Position
        let x = arcRadiusMm * Math.cos(theta);
        let y = arcRadiusMm * Math.sin(theta);
        let z = 0;

        // Tangent (unmodified)
        let tx = -Math.sin(theta);
        let ty = Math.cos(theta);
        let tz = 0;

        // Normal (unmodified - points to center)
        let nx = -Math.cos(theta);
        let ny = -Math.sin(theta);
        let nz = 0;

        // Binormal (unmodified - Z axis)
        let bx = 0;
        let by = 0;
        let bz = 1;

        // Apply Plane Tilt (Rotate everything around X axis?)
        // Actually, usually X-axis is the loading axis or symmetry axis.
        // Let's assume we rotate around the "chord" which runs roughly along Y?
        // Let's verify standard arc visualizer first.
        // In ArcSpringGeometry.ts: cx = r * cos(theta), cy = r * sin(theta). That's XY plane.
        // So "Plane Tilt" usually rotates around the X-axis (if arc is top/bottom) or Y-axis (if arc is side).
        // Let's just rotate around X axis (Y <-> Z) for "Plane Tilt".

        if (Math.abs(planeTiltRad) > 1e-4) {
            // Rotation around X
            // y' = y*cos - z*sin
            // z' = y*sin + z*cos
            const y_ = y * cosTilt - z * sinTilt;
            const z_ = y * sinTilt + z * cosTilt;
            y = y_; z = z_;

            const ty_ = ty * cosTilt - tz * sinTilt;
            const tz_ = ty * sinTilt + tz * cosTilt;
            ty = ty_; tz = tz_;

            const ny_ = ny * cosTilt - nz * sinTilt;
            const nz_ = ny * sinTilt + nz * cosTilt;
            ny = ny_; nz = nz_;

            const by_ = by * cosTilt - bz * sinTilt;
            const bz_ = by * sinTilt + bz * cosTilt;
            by = by_; bz = bz_;
        }

        // Apply Lean (Rotate Normal/Binormal around Tangent)
        // This affects the "orientation" of the coil cross-section without moving the centerline.
        if (Math.abs(leanRad) > 1e-4) {
            // We have n, b orthogonal to t.
            // We want to rotate n and b around t by leanRad.
            // n' = n * cosLean + b * sinLean
            // b' = -n * sinLean + b * cosLean

            const nx_ = nx * cosLean + bx * sinLean;
            const ny_ = ny * cosLean + by * sinLean;
            const nz_ = nz * cosLean + bz * sinLean;

            const bx_ = -nx * sinLean + bx * cosLean;
            const by_ = -ny * sinLean + by * cosLean;
            const bz_ = -nz * sinLean + bz * cosLean;

            nx = nx_; ny = ny_; nz = nz_;
            bx = bx_; by = by_; bz = bz_;
        }

        frames.push({
            p: new THREE.Vector3(x, y, z),
            t: new THREE.Vector3(tx, ty, tz).normalize(),
            n: new THREE.Vector3(nx, ny, nz).normalize(),
            b: new THREE.Vector3(bx, by, bz).normalize(),
            s: s
        });
    }

    return frames;
}
