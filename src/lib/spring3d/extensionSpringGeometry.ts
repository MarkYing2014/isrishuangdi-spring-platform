/**
 * Extension Spring 3D Geometry Generator
 * 
 * Engineering-accurate model with:
 * - Helical body coils (close-wound)
 * - Hook geometry at both ends
 * - Dynamic extension based on Δx
 * - Initial tension visualization
 */

import * as THREE from "three";
import type { ExtensionHookType } from "@/lib/springTypes";
import { getHookSpec, buildHookCenterline } from "./HookBuilder";

// ================================================================
// PART #1 — Parameters Interface
// ================================================================

export interface ExtensionSpringParams {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Outer diameter (mm) */
  outerDiameter: number;
  /** Number of active coils */
  activeCoils: number;
  /** Body length (mm) - coil body only */
  bodyLength: number;
  /** Free length inside hooks (mm) */
  freeLengthInsideHooks: number;
  /** Current extension Δx (mm) */
  currentExtension: number;
  /** Scale factor for 3D scene */
  scale: number;
  /** Hook type - uses ExtensionHookType from springTypes.ts */
  hookType?: ExtensionHookType;
}

export interface ExtensionSpringState {
  /** Current extended length */
  extendedLength: number;
  /** Pitch between coils (increases with extension) */
  currentPitch: number;
  /** Whether spring is at rest (no extension) */
  isAtRest: boolean;
}

// ================================================================
// PART #2 — Centerline Curve Generator
// ================================================================

export interface ExtensionCenterlineResult {
  points: THREE.Vector3[];
  minZ: number;
  maxZ: number;
  /** End angle of the helix (for hook alignment) */
  endAngle: number;
  /** Start angle of the helix */
  startAngle: number;
  /** Radius of the helix */
  radius: number;
}

/**
 * Generate the parametric centerline curve for extension spring body
 * Extension springs have close-wound coils that separate under load
 */
export function generateExtensionCenterline(
  params: ExtensionSpringParams
): ExtensionCenterlineResult {
  const {
    wireDiameter,
    outerDiameter,
    activeCoils,
    currentExtension,
    scale,
  } = params;

  // Mean diameter = OD - d
  const meanDiameter = outerDiameter - wireDiameter;

  // Scaled dimensions
  const R = (meanDiameter / 2) * scale;

  // 拉簧在自由状态（Δx=0）时线圈紧密贴合
  // solidBodyLength = activeCoils × wireDiameter（线圈贴紧时的长度）
  // 拉伸后才出现节距
  const solidBodyLength = activeCoils * wireDiameter * scale;
  const Δx = currentExtension * scale;
  const extendedLength = solidBodyLength + Δx;

  // Sampling parameters
  const numSamples = Math.max(400, activeCoils * 50);
  const totalAngle = 2 * Math.PI * activeCoils;

  const points: THREE.Vector3[] = [];
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const θ = t * totalAngle;

    // Z position (height along spring axis)
    const z = t * extendedLength;

    // X/Y parametric (circular helix)
    const x = R * Math.cos(θ);
    const y = R * Math.sin(θ);

    points.push(new THREE.Vector3(x, y, z));

    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  return {
    points,
    minZ,
    maxZ,
    endAngle: totalAngle,
    startAngle: 0,
    radius: R,
  };
}

// ================================================================
// PART #3 — Helix Curve and Hook Point Generators
// ================================================================

/**
 * Custom curve class for the helical spring body.
 * Uses exact parametric helix formula (not CatmullRom interpolation).
 */
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  private R: number;
  private totalAngle: number;
  private length: number;

  constructor(radius: number, totalAngle: number, length: number) {
    super();
    this.R = radius;
    this.totalAngle = totalAngle;
    this.length = length;
  }

  getPoint(s: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const θ = s * this.totalAngle;
    const z = s * this.length;
    return optionalTarget.set(
      this.R * Math.cos(θ),
      this.R * Math.sin(θ),
      z
    );
  }

  getTangent(s: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const θ = s * this.totalAngle;
    // Derivative: dx/ds = -R*totalAngle*sin(θ), dy/ds = R*totalAngle*cos(θ), dz/ds = length
    return optionalTarget.set(
      -this.R * this.totalAngle * Math.sin(θ),
      this.R * this.totalAngle * Math.cos(θ),
      this.length
    ).normalize();
  }
}

/**
 * Build extension spring end hook centerline.
 *
 * 设计目标（务必满足）:
 * 1. hook 环的平面**包含**弹簧轴（与线圈垂直）
 * 2. hook 环的法向量 = 径向（从轴到线圈）
 * 3. 拉力方向沿弹簧轴线
 * 4. 过渡段平滑，不绕着线圈转圈
 */


/**
 * Build extension spring START hook centerline (底部钩).
 * 与 end hook 对称，方向相反（向 -Z 方向延伸）
 */


// ================================================================
// PART #4 — Complete Geometry Builder (Segmented Approach)
// ================================================================

export interface ExtensionSpringGeometry {
  bodyGeometry: THREE.TubeGeometry;
  topHookGeometry: THREE.TubeGeometry | null;
  bottomHookGeometry: THREE.TubeGeometry | null;
  totalLength: number;
  state: ExtensionSpringState;
}

/**
 * Build complete extension spring geometry using segmented curves.
 * 
 * This approach:
 * 1. Creates the body helix as a separate HelixCurve (exact parametric formula)
 * 2. Creates each hook with:
 *    - Cubic Bézier blend from helix end to hook arc (C¹ continuous)
 *    - Circular arc for the hook loop
 * 3. Generates TubeGeometry for each segment independently
 * 
 * Hook Properties:
 * - Hook radius slightly larger than helix radius (clearance from last coil)
 * - Hook center on spring axis
 * - Smooth blend segment between helix and hook arc
 * - Hook opens along Z direction for pulling
 */
export function buildExtensionSpringGeometry(
  params: ExtensionSpringParams
): ExtensionSpringGeometry {
  const {
    wireDiameter,
    outerDiameter,
    activeCoils,

    currentExtension,
    scale,
    hookType = "machine"
  } = params;

  // === Calculate dimensions ===
  const meanDiameter = outerDiameter - wireDiameter;
  const meanRadius = (meanDiameter / 2) * scale;  // Helix radius
  const wireRadius = (wireDiameter / 2) * scale;

  // 拉簧在自由状态（Δx=0）时线圈紧密贴合
  // solidBodyLength = activeCoils × wireDiameter（线圈贴紧时的长度）
  // 拉伸后才出现节距
  // 
  // 重要：拉簧的弹簧体在自由状态下始终是紧密贴合的！
  // freeLengthInsideHooks 只影响钩子的位置，不影响弹簧体的节距
  // 只有 currentExtension > 0 时才会出现节距
  const solidBodyLength = activeCoils * wireDiameter;
  const extendedLength = (solidBodyLength + currentExtension) * scale;

  const totalAngle = 2 * Math.PI * activeCoils;

  // Hook radius: slightly larger than helix radius to avoid interference
  // R_hook = meanRadius + wireRadius * 0.8
  // const hookRadius = meanRadius + wireRadius * 0.8;

  // === PART 1: Create body helix and sample points ===
  const bodyCurve = new HelixCurve(meanRadius, totalAngle, extendedLength);

  // Sample body helix points for hook generation
  const bodyHelixPts: THREE.Vector3[] = [];
  const sampleCount = Math.max(100, activeCoils * 20);
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    bodyHelixPts.push(bodyCurve.getPoint(t));
  }

  // === PART 2: Generate hook points (both ends) ===

  // Scaled dimensions for hooks
  // Note: meanRadius is already scaled (line 521), so we use it directly
  // wireDiameter needs to be scaled for hook generation
  const scaledWireDiameter = wireDiameter * scale;
  const scaledMeanRadius = meanRadius;  // Already scaled, don't scale again!

  // Get hook specification based on hookType
  const hookSpec = getHookSpec(hookType ?? "machine");

  // 根据 hookType 选择使用 HookBuilder 还是原有实现
  // 目前 Side Hook 使用 HookBuilder，其他类型使用原有实现（已验证正确）
  // 所有钩型都使用 HookBuilder 生成
  // HookBuilder 支持: machine, side, crossover, extended, doubleLoop
  const startHookPts = buildHookCenterline(
    "start",
    hookSpec,
    bodyHelixPts,
    scaledMeanRadius,
    scaledWireDiameter
  );
  const endHookPts = buildHookCenterline(
    "end",
    hookSpec,
    bodyHelixPts,
    scaledMeanRadius,
    scaledWireDiameter
  );

  // === PART 3: Combine into ONE continuous centerline ===
  // Order: start hook → body → end hook
  const centerlinePts: THREE.Vector3[] = [];
  centerlinePts.push(...startHookPts);  // 底部钩
  centerlinePts.push(...bodyHelixPts);   // 弹簧主体
  centerlinePts.push(...endHookPts);     // 顶部钩

  // === PART 4: Build TubeGeometry ONCE from continuous curve ===
  const radialSegments = 16;

  const curve = new THREE.CatmullRomCurve3(centerlinePts);
  curve.tension = 0;

  const bodyGeometry = new THREE.TubeGeometry(
    curve,
    Math.max(240, centerlinePts.length),
    wireRadius,
    radialSegments,
    false
  );

  // No separate hook geometries - everything is in one piece
  const bottomHookGeometry: THREE.TubeGeometry | null = null;
  const topHookGeometry: THREE.TubeGeometry | null = null;

  // === Calculate state ===
  const currentPitch = extendedLength / activeCoils;
  const isAtRest = currentExtension <= 0;

  return {
    bodyGeometry,
    topHookGeometry,
    bottomHookGeometry,
    totalLength: extendedLength,
    state: {
      extendedLength,
      currentPitch,
      isAtRest,
    },
  };
}
