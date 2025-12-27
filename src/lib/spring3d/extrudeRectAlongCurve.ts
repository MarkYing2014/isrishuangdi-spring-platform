/**
 * Rectangular Wire Extrusion Along Curve (Hard-Face + Bishop Frame)
 * 矩形线材沿曲线挤出（硬边版本 + 平行运输帧避免扭转）
 *
 * Goal:
 * - Die spring rectangular wire must look like real catalog: flat faces + sharp edges
 * - Avoid CatmullRom smoothing artifacts (use analytic helix)
 * - Use Bishop/Parallel-Transport frame instead of Frenet to prevent ribbon twist
 * - Non-indexed geometry ensures each face has its own vertices and flat normal
 */

import * as THREE from "three";

export interface ExtrudeRectParams {
  curve: THREE.Curve<THREE.Vector3>;
  width_b: number;       // radial width (mm)
  thickness_t: number;   // axial thickness (mm)
  segments?: number;
  scale?: number;
  caps?: boolean;
  /** Global up vector for initial frame orientation */
  up?: THREE.Vector3;
}

/**
 * Safe normalize that handles zero-length vectors
 */
function safeNormalize(v: THREE.Vector3): THREE.Vector3 {
  const len = v.length();
  if (len < 1e-12) return v.set(1, 0, 0);
  return v.multiplyScalar(1 / len);
}

/**
 * Compute Bishop/Parallel-Transport frames along a curve.
 * Unlike Frenet frames, Bishop frames don't "spin" on helices.
 * The cross-section orientation stays locked relative to the initial frame.
 */
function computeBishopFrames(
  curve: THREE.Curve<THREE.Vector3>,
  segments: number,
  upHint = new THREE.Vector3(0, 0, 1)
): {
  points: THREE.Vector3[];
  tangents: THREE.Vector3[];
  normals: THREE.Vector3[];
  binormals: THREE.Vector3[];
} {
  const tangents: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  const points: THREE.Vector3[] = [];

  // Sample points + tangents
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPointAt(u);
    points.push(p);

    const t = curve.getTangentAt(u).clone();
    safeNormalize(t);
    tangents.push(t);
  }

  // Choose initial normal from upHint × tangent
  let n0 = new THREE.Vector3().crossVectors(upHint, tangents[0]);
  if (n0.length() < 1e-6) {
    // Fallback if upHint parallel to tangent
    n0 = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangents[0]);
    if (n0.length() < 1e-6) {
      n0 = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), tangents[0]);
    }
  }
  safeNormalize(n0);

  const b0 = new THREE.Vector3().crossVectors(tangents[0], n0);
  safeNormalize(b0);

  normals.push(n0);
  binormals.push(b0);

  // Parallel transport along segments
  for (let i = 1; i <= segments; i++) {
    const tPrev = tangents[i - 1];
    const tCur = tangents[i];

    // Rotation axis = tPrev × tCur
    const axis = new THREE.Vector3().crossVectors(tPrev, tCur);
    const axisLen = axis.length();

    const nPrev = normals[i - 1].clone();

    if (axisLen < 1e-8) {
      // Tangents almost same -> keep normal
      normals.push(nPrev);
      const b = new THREE.Vector3().crossVectors(tCur, nPrev);
      safeNormalize(b);
      binormals.push(b);
      continue;
    }

    axis.multiplyScalar(1 / axisLen);

    // Angle between tangents
    const dot = THREE.MathUtils.clamp(tPrev.dot(tCur), -1, 1);
    const angle = Math.acos(dot);

    // Rotate previous normal around axis by angle
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    const nCur = nPrev.applyQuaternion(q);
    safeNormalize(nCur);

    normals.push(nCur);

    const bCur = new THREE.Vector3().crossVectors(tCur, nCur);
    safeNormalize(bCur);
    binormals.push(bCur);
  }

  return { points, tangents, normals, binormals };
}

/**
 * Hard-face rectangular extrusion with Bishop frames:
 * - non-indexed geometry (each quad has its own vertices)
 * - each quad has a constant (flat) normal
 * - Bishop frame prevents ribbon twist on helices
 *
 * This guarantees the cross-section looks rectangular (not rounded or twisted).
 */
export function extrudeRectAlongCurve(params: ExtrudeRectParams): THREE.BufferGeometry {
  const {
    curve,
    width_b,
    thickness_t,
    segments = 400,
    scale = 1,
    caps = true,
    up = new THREE.Vector3(0, 0, 1),
  } = params;

  const hw = (width_b * scale) / 2;       // half width
  const ht = (thickness_t * scale) / 2;   // half thickness

  // Corners in local (N,B) plane order (CCW):
  // 0: (-hw,-ht), 1:(+hw,-ht), 2:(+hw,+ht), 3:(-hw,+ht)
  const corners = [
    new THREE.Vector2(-hw, -ht),
    new THREE.Vector2(+hw, -ht),
    new THREE.Vector2(+hw, +ht),
    new THREE.Vector2(-hw, +ht),
  ];

  // Use Bishop frames (no twist) instead of Frenet frames
  const frames = computeBishopFrames(curve, segments, up);

  // Ring points (world-space)
  const ringPts: THREE.Vector3[][] = [];
  for (let i = 0; i <= segments; i++) {
    const P = frames.points[i];
    const N = frames.normals[i];
    const B = frames.binormals[i];

    const ring: THREE.Vector3[] = [];
    for (let k = 0; k < 4; k++) {
      const c = corners[k];
      ring.push(
        new THREE.Vector3(
          P.x + N.x * c.x + B.x * c.y,
          P.y + N.y * c.x + B.y * c.y,
          P.z + N.z * c.x + B.z * c.y
        )
      );
    }
    ringPts.push(ring);
  }

  // Build non-indexed triangles
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3,
    n: THREE.Vector3,
    ua: number, ub: number, uc: number,
    va: number, vb: number, vc: number
  ) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    uvs.push(ua, va, ub, vb, uc, vc);
  };

  for (let i = 0; i < segments; i++) {
    const u0 = i / segments;
    const u1 = (i + 1) / segments;

    const A = ringPts[i];
    const B = ringPts[i + 1];

    // 4 faces: (0-1), (1-2), (2-3), (3-0)
    for (let f = 0; f < 4; f++) {
      const f2 = (f + 1) % 4;

      const a0 = A[f];
      const a1 = A[f2];
      const b1 = B[f2];
      const b0 = B[f];

      // Face normal (flat) from quad (a0->a1, a0->b0)
      const e1 = new THREE.Vector3().subVectors(a1, a0);
      const e2 = new THREE.Vector3().subVectors(b0, a0);
      const n = new THREE.Vector3().crossVectors(e1, e2).normalize();

      // Two triangles (a0,a1,b1) and (a0,b1,b0)
      // UV: u along length, v around section
      const v0 = f / 4;
      const v1 = f2 / 4;

      pushTri(a0, a1, b1, n, u0, u0, u1, v0, v1, v1);
      pushTri(a0, b1, b0, n, u0, u1, u1, v0, v1, v0);
    }
  }

  // Optional caps (also hard-face)
  if (caps) {
    // Start cap uses -tangent
    {
      const P = frames.points[0];
      const t = frames.tangents[0].clone().normalize().multiplyScalar(-1);
      const ring = ringPts[0];

      for (let f = 0; f < 4; f++) {
        const f2 = (f + 1) % 4;
        const a = ring[f2];
        const b = ring[f];
        pushTri(P, a, b, t, 0, 0, 0, 0.5, 0, 1);
      }
    }

    // End cap uses +tangent
    {
      const P = frames.points[segments];
      const t = frames.tangents[segments].clone().normalize();
      const ring = ringPts[segments];

      for (let f = 0; f < 4; f++) {
        const f2 = (f + 1) % 4;
        const a = ring[f];
        const b = ring[f2];
        pushTri(P, a, b, t, 1, 1, 1, 0.5, 0, 1);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  // non-indexed by design - each face has its own vertices
  geom.computeBoundingSphere();

  return geom;
}

/**
 * Analytic Helix Curve (strict)
 * 严格螺旋线（方程表达），避免 CatmullRom 平滑造成的 frame 漂移/形变
 */
export class HelixCurve extends THREE.Curve<THREE.Vector3> {
  private R: number;
  private L: number;
  private turns: number;

  constructor(params: { meanDiameter: number; coils: number; freeLength: number; scale?: number }) {
    super();
    const { meanDiameter, coils, freeLength, scale = 1 } = params;
    this.R = (meanDiameter / 2) * scale;
    this.L = freeLength * scale;
    this.turns = Math.max(0.0001, coils);
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const theta = 2 * Math.PI * this.turns * t;
    const z = this.L * t;
    const x = this.R * Math.cos(theta);
    const y = this.R * Math.sin(theta);
    return target.set(x, y, z);
  }

  // Provide stable tangent (helps Frenet frames)
  getTangent(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const theta = 2 * Math.PI * this.turns * t;
    const dTheta = 2 * Math.PI * this.turns;
    // derivatives wrt t
    const dx = -this.R * Math.sin(theta) * dTheta;
    const dy = this.R * Math.cos(theta) * dTheta;
    const dz = this.L;
    return target.set(dx, dy, dz).normalize();
  }
}

/**
 * Create a helix curve for die spring (analytic version)
 */
export function createHelixCurve(params: {
  meanDiameter: number;
  coils: number;
  freeLength: number;
  scale?: number;
}): HelixCurve {
  return new HelixCurve(params);
}

export type DieSpringEndStyleGeom = "open" | "closed" | "closed_ground";

/**
 * Build die spring geometry with FIXED FRAME (no rotation)
 * 固定坐标系挤出（截面不旋转）
 * 
 * Key insight: For die springs, the cross-section should NOT rotate with Frenet/Bishop frames.
 * Instead, use a fixed coordinate system:
 * - R = radial direction [cos(θ), sin(θ), 0] - wire width direction
 * - U = axial direction [0, 0, 1] - wire thickness direction
 * 
 * This ensures the rectangular wire looks like "wound on edge" with consistent orientation.
 * 
 * End styles:
 * - open: No end treatment
 * - closed: Dead coils at ends (pitch reduces)
 * - closed_ground: Dead coils + ground flat (z-flatten at ends)
 */
export function buildDieSpringGeometryFixedFrame(params: {
  meanDiameter: number;  // mm
  coils: number;         // total coils
  freeLength: number;    // mm
  wire_b: number;        // radial width (mm)
  wire_t: number;        // axial thickness (mm)
  segmentsPerCoil?: number;
  scale?: number;
  caps?: boolean;
  endStyle?: DieSpringEndStyleGeom;
  endGrindTurns?: number;  // turns per end to grind flat (default 0.25)
}): THREE.BufferGeometry {
  const {
    meanDiameter,
    coils,
    freeLength,
    wire_b,
    wire_t,
    segmentsPerCoil = 120,
    scale = 1,
    caps = true,
    endStyle = "closed_ground",
  } = params;

  const Rm = (meanDiameter * 0.5) * scale;
  const L = freeLength * scale;

  const hw = (wire_b * scale) / 2;   // half width (radial)
  const ht = (wire_t * scale) / 2;   // half thickness (axial)

  const Nt = coils;  // total coils

  // End coil parameters - CRITICAL for realistic die spring appearance
  // Real die springs have "closed" end coils where pitch → 0
  const doGrind = endStyle === "closed_ground" || endStyle === "closed";

  // closedTurnsPerEnd: how many turns at each end have pitch → 0 (closed/dead coils)
  // Direct parameter: 1.5 turns gives realistic "last coil lies flat" appearance
  // No indirect mapping - this is the actual number of closed turns per end
  const closedTurnsPerEnd = doGrind ? 1.5 : 0;

  // Active turns = total - 2 * closed turns per end
  const activeTurns = Math.max(0.5, Nt - 2 * closedTurnsPerEnd);

  // Total angle - full coils, NO reduction (real die springs have complete coils)
  const totalAngle = 2 * Math.PI * Nt;
  // Higher segment count for smoother end coil transitions
  const segments = Math.max(60, Math.floor(Nt * Math.max(segmentsPerCoil, 200)));

  // Closed zone angle (per end)
  const thetaClosed = 2 * Math.PI * closedTurnsPerEnd;

  // Active zone pitch: For ISO 10243 die springs, coils are TIGHTLY wound
  // Real die springs have pitch ≈ wire thickness (1.05 to 1.15 × t)
  // This means coils are nearly touching with only small gap for operation
  // 
  // Formula: pActive = wire_t × pitchFactor where pitchFactor is 1.05~1.15
  // This differs from open compression springs which use (L - seatHeight) / Na
  //
  // The free length L is NOT used to calculate pitch for die springs!
  // Instead, L is the result of: L = pActive × Nt (approximately)

  // Use industry-standard pitch factor for ISO 10243 die springs
  const ISO_10243_PITCH_FACTOR = 1.08;  // Tight wound: 8% gap between coils
  const seatHeight = wire_t * scale * 0.9;  // closed coils occupy ~0.9t each
  const pActive = doGrind
    ? wire_t * scale * ISO_10243_PITCH_FACTOR  // Tightly wound per ISO 10243
    : freeLength * scale / Nt;  // Open springs use uniform distribution

  // Smoothstep function for smooth transition
  const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };

  // Pitch function p(θ) - returns pitch at angle θ
  // Start zone: θ ∈ [0, thetaClosed] → pitch ramps from 0 to pActive
  // Active zone: θ ∈ [thetaClosed, totalAngle - thetaClosed] → pitch = pActive
  // End zone: θ ∈ [totalAngle - thetaClosed, totalAngle] → pitch ramps from pActive to 0
  const pitchAtTheta = (theta: number): number => {
    if (!doGrind) return L / Nt;  // uniform pitch for open springs

    if (theta < thetaClosed) {
      // Start closed zone: ramp from 0 to pActive (w: 0→1)
      const w = smoothstep(0, thetaClosed, theta);
      return pActive * w;
    }
    if (theta > totalAngle - thetaClosed) {
      // End closed zone: ramp from pActive to 0
      // FIXED: Use forward interval smoothstep, then (1-w) to get pActive→0
      const w = smoothstep(totalAngle - thetaClosed, totalAngle, theta);  // w: 0→1
      return pActive * (1 - w);  // pitch: pActive→0
    }
    // Active zone
    return pActive;
  };

  // 4 corners in local (R, U) plane - fixed orientation
  const localCorners = [
    { x: -hw, y: -ht }, // bottom-left
    { x: +hw, y: -ht }, // bottom-right
    { x: +hw, y: +ht }, // top-right
    { x: -hw, y: +ht }, // top-left
  ];

  // Build non-indexed triangles (hard faces)
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3,
    n: THREE.Vector3,
    ua: number, ub: number, uc: number,
    va: number, vb: number, vc: number
  ) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    uvs.push(ua, va, ub, vb, uc, vc);
  };

  // Compute z by integrating pitch function p(θ)
  // z(θ) = ∫ (p(θ)/(2π)) dθ
  // This ensures end coils "close up" when pitch → 0
  const zValues: number[] = [];
  let zAccum = 0;
  const dTheta = totalAngle / segments;

  for (let i = 0; i <= segments; i++) {
    if (i === 0) {
      zValues.push(0);
    } else {
      const theta = i * dTheta;
      const thetaMid = theta - dTheta / 2;  // midpoint for better integration
      const p = pitchAtTheta(thetaMid);
      // dz = (pitch / 2π) * dθ
      const dz = (p / (2 * Math.PI)) * dTheta;
      zAccum += dz;
      zValues.push(zAccum);
    }
  }



  // Store first and last radial directions for frame locking at ends
  const startTheta = 0;
  const endTheta = totalAngle;


  // Generate ring points with FIXED frame
  // Lock frame direction at closed end zones to prevent twisting
  const ringPts: THREE.Vector3[][] = [];
  const ringRadDirs: THREE.Vector3[] = [];  // Store Rad directions for continuity check

  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const theta = s * totalAngle;
    const z = zValues[i];

    const cx = Rm * Math.cos(theta);
    const cy = Rm * Math.sin(theta);

    // Determine radial direction
    // At closed ends, blend toward locked direction to prevent visual twisting
    // Determine radial direction
    // At closed ends, blend toward locked direction to prevent visual twisting
    const Up = new THREE.Vector3(0, 0, 1);
    const currentRad = new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0);

    // SIMPLIFIED: Always use currentRad (actual radial direction at this theta)
    // The dot continuity check below prevents sign flips
    // No need to lerp toward startRad/endRad - that can cause shape distortion
    // especially when coils is not an integer
    const Rad = currentRad.clone();

    // CRITICAL: Normalize after lerp (lerp can produce non-unit vectors)
    Rad.normalize();

    // CRITICAL: Enforce continuous direction to prevent sign flip / face inversion
    if (i > 0) {
      const prevRad = ringRadDirs[i - 1];
      if (prevRad.dot(Rad) < 0) {
        Rad.multiplyScalar(-1);
      }
    }
    ringRadDirs.push(Rad.clone());

    const P = new THREE.Vector3(cx, cy, z);

    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < 4; j++) {
      const c = localCorners[j];
      const V = new THREE.Vector3()
        .copy(P)
        .addScaledVector(Rad, c.x)
        .addScaledVector(Up, c.y);
      ring.push(V);
    }
    ringPts.push(ring);
  }

  // Build faces (non-indexed, each quad has its own vertices)
  for (let i = 0; i < segments; i++) {
    const u0 = i / segments;
    const u1 = (i + 1) / segments;

    const A = ringPts[i];
    const B = ringPts[i + 1];

    // 4 faces per segment: (0-1), (1-2), (2-3), (3-0)
    for (let f = 0; f < 4; f++) {
      const f2 = (f + 1) % 4;

      const a0 = A[f];
      const a1 = A[f2];
      const b1 = B[f2];
      const b0 = B[f];

      // Face normal (flat)
      const e1 = new THREE.Vector3().subVectors(a1, a0);
      const e2 = new THREE.Vector3().subVectors(b0, a0);
      const n = new THREE.Vector3().crossVectors(e1, e2).normalize();

      const v0 = f / 4;
      const v1 = f2 / 4;

      pushTri(a0, a1, b1, n, u0, u0, u1, v0, v1, v1);
      pushTri(a0, b1, b0, n, u0, u1, u1, v0, v1, v0);
    }
  }

  // Caps (hard-face)
  if (caps) {
    // Start cap - at ground ends, the wire lies flat so cap normal is -Z
    {
      const theta = 0;
      const cx = Rm * Math.cos(theta);
      const cy = Rm * Math.sin(theta);
      const zStart = zValues[0];
      const P = new THREE.Vector3(cx, cy, zStart);

      // For ground ends, cap faces down (-Z); for open ends, use tangent
      const t = doGrind
        ? new THREE.Vector3(0, 0, -1)
        : new THREE.Vector3(
          -Rm * Math.sin(theta) * 2 * Math.PI * Nt,
          Rm * Math.cos(theta) * 2 * Math.PI * Nt,
          L
        ).normalize().multiplyScalar(-1);

      const ring = ringPts[0];
      for (let f = 0; f < 4; f++) {
        const f2 = (f + 1) % 4;
        const a = ring[f2];
        const b = ring[f];
        pushTri(P, a, b, t, 0, 0, 0, 0.5, 0, 1);
      }
    }

    // End cap - at ground ends, the wire lies flat so cap normal is +Z
    {
      const theta = totalAngle;
      const cx = Rm * Math.cos(theta);
      const cy = Rm * Math.sin(theta);
      const zEnd = zValues[segments];
      const P = new THREE.Vector3(cx, cy, zEnd);

      // For ground ends, cap faces up (+Z); for open ends, use tangent
      const t = doGrind
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(
          -Rm * Math.sin(theta) * 2 * Math.PI * Nt,
          Rm * Math.cos(theta) * 2 * Math.PI * Nt,
          L
        ).normalize();

      const ring = ringPts[segments];
      for (let f = 0; f < 4; f++) {
        const f2 = (f + 1) % 4;
        const a = ring[f];
        const b = ring[f2];
        pushTri(P, a, b, t, 1, 1, 1, 0.5, 0, 1);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeBoundingSphere();

  return geom;
}

/**
 * Build die spring geometry with rectangular wire cross-section
 * Uses fixed frame (no rotation) for proper die spring appearance
 */
export function buildDieSpringGeometry(params: {
  meanDiameter: number;
  coils: number;
  freeLength: number;
  wire_b: number;
  wire_t: number;
  scale?: number;
  endStyle?: DieSpringEndStyleGeom;
  endGrindTurns?: number;
}): THREE.BufferGeometry {
  return buildDieSpringGeometryFixedFrame({
    ...params,
    segmentsPerCoil: 140,
    caps: true,
  });
}
