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
    bodyLength,
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
function buildSimpleEndHookCenterline(
  bodyHelixPts: THREE.Vector3[],
  outerDiameter: number,
  wireDiameter: number,
  hookAngleDeg: number,
  _isRightHand: boolean
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  if (bodyHelixPts.length < 2) return pts;

  // ---------------------------------------------------------------
  // 1) 弹簧轴方向固定为 +Z，轴线通过原点 (0, 0, z)
  // ---------------------------------------------------------------
  const endPos = bodyHelixPts[bodyHelixPts.length - 1].clone();
  
  // 弹簧轴方向固定为 +Z
  const springAxisDir = new THREE.Vector3(0, 0, 1);

  // ---------------------------------------------------------------
  // 2) 轴上的投影点：endPos 在 Z 轴上的投影
  //    ★★★ 轴线通过 (0, 0, z)，不是通过 startPos ★★★
  // ---------------------------------------------------------------
  const axisPoint = new THREE.Vector3(0, 0, endPos.z);

  // ---------------------------------------------------------------
  // 3) 径向方向：从轴到线圈终点
  // ---------------------------------------------------------------
  let radialDir = endPos.clone().sub(axisPoint);
  if (radialDir.lengthSq() < 1e-8) {
    radialDir = new THREE.Vector3(1, 0, 0);
  } else {
    radialDir.normalize();
  }

  // ---------------------------------------------------------------
  // 4) hook 参数
  // ---------------------------------------------------------------
  const meanRadius = (outerDiameter - wireDiameter) * 0.5;
  const hookRadius = meanRadius * 0.85;
  const hookGap = wireDiameter * 1.2;

  // ---------------------------------------------------------------
  // 5) hook 圆心：严格在 Z 轴上 (0, 0, z + hookGap)
  //    ★★★ 这保证拉力与弹簧轴心对齐 ★★★
  // ---------------------------------------------------------------
  const loopCenter = new THREE.Vector3(0, 0, endPos.z + hookGap);

  // ---------------------------------------------------------------
  // 6) 构造 hook 环所在平面的正交基 (u, v)
  //    ★★★ 关键：圆环平面包含轴方向 ★★★
  //    法向量 = radialDir（径向）
  //    u = springAxisDir（轴向，拉力方向）
  //    v = radialDir × springAxisDir（切向）
  // ---------------------------------------------------------------
  const loopNormal = radialDir.clone(); // 圆环法向量 = 径向
  const u = springAxisDir.clone().normalize(); // 轴向（拉力方向）
  const v = new THREE.Vector3().crossVectors(radialDir, springAxisDir).normalize();

  // ---------------------------------------------------------------
  // 7) 在该平面内画圆弧（约 3/4 圆，不需要完整半圆）
  //    P(θ) = loopCenter + hookRadius*cosθ*u + hookRadius*sinθ*v
  // ---------------------------------------------------------------
  // 起始角度：从 -90° 开始，使连接点在圆环底部（朝向线圈）
  // 总弧度：约 200-240°（不需要完整的半圆）
  const startAngle = -Math.PI / 2;
  const totalArc = THREE.MathUtils.degToRad(Math.min(hookAngleDeg, 160)); // 限制最大 160°
  const loopSegments = 48;

  const hookLoopPts: THREE.Vector3[] = [];
  for (let i = 0; i <= loopSegments; i++) {
    const t = i / loopSegments;
    const theta = startAngle + totalArc * t;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    const p = loopCenter.clone()
      .add(u.clone().multiplyScalar(hookRadius * cosTheta))
      .add(v.clone().multiplyScalar(hookRadius * sinTheta));

    hookLoopPts.push(p);
  }

  // 圆环的第一个点（连接点）
  const attachPoint = hookLoopPts[0].clone();

  // ---------------------------------------------------------------
  // 8) 过渡段：使用三次贝塞尔曲线实现 C¹ 连续的光滑过渡
  //    控制点沿切线方向延伸，确保曲线平滑
  // ---------------------------------------------------------------
  function cubicBezier(
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    t: number
  ): THREE.Vector3 {
    const omt = 1 - t;
    return new THREE.Vector3()
      .addScaledVector(p0, omt * omt * omt)
      .addScaledVector(p1, 3 * omt * omt * t)
      .addScaledVector(p2, 3 * omt * t * t)
      .addScaledVector(p3, t * t * t);
  }

  // 计算线圈终点的切线方向（从倒数第二个点到终点）
  const prevPos = bodyHelixPts[bodyHelixPts.length - 2];
  const helixTangent = endPos.clone().sub(prevPos).normalize();

  // 计算圆环起点的切线方向（圆弧的切线）
  // 在 startAngle 处，切线方向 = d/dθ [cos(θ)*u + sin(θ)*v] = -sin(θ)*u + cos(θ)*v
  const hookTangent = u.clone().multiplyScalar(-Math.sin(startAngle))
    .add(v.clone().multiplyScalar(Math.cos(startAngle)))
    .normalize();

  // 控制点距离（影响曲线的"张力"）
  const handleLength = wireDiameter * 2.0;

  // 控制点沿切线方向延伸
  const control1 = endPos.clone().add(
    helixTangent.clone().multiplyScalar(handleLength)
  );
  const control2 = attachPoint.clone().sub(
    hookTangent.clone().multiplyScalar(handleLength)
  );

  const transitionPts: THREE.Vector3[] = [];
  const transitionSegments = 24;
  // 从 i=1 开始，跳过 endPos（由 bodyHelixPts 的最后一个点提供）
  for (let i = 1; i <= transitionSegments; i++) {
    const t = i / transitionSegments;
    transitionPts.push(
      cubicBezier(endPos, control1, control2, attachPoint, t)
    );
  }
  
  // 确保过渡曲线的最后一个点精确等于 attachPoint
  if (transitionPts.length > 0) {
    transitionPts[transitionPts.length - 1].copy(attachPoint);
  }

  // ---------------------------------------------------------------
  // 9) 最终中心线：光滑过渡 → 圆弧钩
  //    注意：transitionPts 不包含 endPos（由 bodyHelixPts 提供）
  //    跳过圆弧的第一个点，因为它与过渡曲线的最后一个点重合
  // ---------------------------------------------------------------
  pts.push(...transitionPts);
  pts.push(...hookLoopPts.slice(1)); // 跳过第一个点避免重复

  return pts;
}

/**
 * Build extension spring START hook centerline (底部钩).
 * 与 end hook 对称，方向相反（向 -Z 方向延伸）
 */
function buildSimpleStartHookCenterline(
  bodyHelixPts: THREE.Vector3[],
  outerDiameter: number,
  wireDiameter: number,
  hookAngleDeg: number,
  _isRightHand: boolean
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  if (bodyHelixPts.length < 2) return pts;

  // ---------------------------------------------------------------
  // 1) 弹簧轴方向固定为 +Z，轴线通过原点 (0, 0, z)
  // ---------------------------------------------------------------
  const startPos = bodyHelixPts[0].clone();
  
  // 弹簧轴方向固定为 -Z（向下，与 end hook 相反）
  const springAxisDir = new THREE.Vector3(0, 0, -1);

  // ---------------------------------------------------------------
  // 2) 轴上的投影点：startPos 在 Z 轴上的投影
  // ---------------------------------------------------------------
  const axisPoint = new THREE.Vector3(0, 0, startPos.z);

  // ---------------------------------------------------------------
  // 3) 径向方向：从轴到线圈起点
  // ---------------------------------------------------------------
  let radialDir = startPos.clone().sub(axisPoint);
  if (radialDir.lengthSq() < 1e-8) {
    radialDir = new THREE.Vector3(1, 0, 0);
  } else {
    radialDir.normalize();
  }

  // ---------------------------------------------------------------
  // 4) hook 参数
  // ---------------------------------------------------------------
  const meanRadius = (outerDiameter - wireDiameter) * 0.5;
  const hookRadius = meanRadius * 0.85;
  const hookGap = wireDiameter * 1.2;

  // ---------------------------------------------------------------
  // 5) hook 圆心：严格在 Z 轴上 (0, 0, z - hookGap)
  //    向 -Z 方向偏移
  // ---------------------------------------------------------------
  const loopCenter = new THREE.Vector3(0, 0, startPos.z - hookGap);

  // ---------------------------------------------------------------
  // 6) 构造 hook 环所在平面的正交基 (u, v)
  //    u = springAxisDir（轴向，拉力方向，向下）
  //    v = radialDir × springAxisDir（切向）
  // ---------------------------------------------------------------
  const u = springAxisDir.clone().normalize(); // 轴向（拉力方向）
  const v = new THREE.Vector3().crossVectors(radialDir, springAxisDir).normalize();

  // ---------------------------------------------------------------
  // 7) 在该平面内画圆弧
  // ---------------------------------------------------------------
  const startAngle = -Math.PI / 2;
  const totalArc = THREE.MathUtils.degToRad(Math.min(hookAngleDeg, 160));
  const loopSegments = 48;

  const hookLoopPts: THREE.Vector3[] = [];
  for (let i = 0; i <= loopSegments; i++) {
    const t = i / loopSegments;
    const theta = startAngle + totalArc * t;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    const p = loopCenter.clone()
      .add(u.clone().multiplyScalar(hookRadius * cosTheta))
      .add(v.clone().multiplyScalar(hookRadius * sinTheta));

    hookLoopPts.push(p);
  }

  // 圆环的第一个点（连接点）
  const attachPoint = hookLoopPts[0].clone();

  // ---------------------------------------------------------------
  // 8) 过渡段：使用三次贝塞尔曲线
  // ---------------------------------------------------------------
  function cubicBezier(
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    t: number
  ): THREE.Vector3 {
    const omt = 1 - t;
    return new THREE.Vector3()
      .addScaledVector(p0, omt * omt * omt)
      .addScaledVector(p1, 3 * omt * omt * t)
      .addScaledVector(p2, 3 * omt * t * t)
      .addScaledVector(p3, t * t * t);
  }

  // 计算线圈起点的切线方向（从起点到第二个点，然后反向）
  const nextPos = bodyHelixPts[1];
  const helixTangent = startPos.clone().sub(nextPos).normalize(); // 反向

  // 计算圆环起点的切线方向
  const hookTangent = u.clone().multiplyScalar(-Math.sin(startAngle))
    .add(v.clone().multiplyScalar(Math.cos(startAngle)))
    .normalize();

  // 控制点距离
  const handleLength = wireDiameter * 2.0;

  // 控制点沿切线方向延伸
  const control1 = startPos.clone().add(
    helixTangent.clone().multiplyScalar(handleLength)
  );
  const control2 = attachPoint.clone().sub(
    hookTangent.clone().multiplyScalar(handleLength)
  );

  const transitionPts: THREE.Vector3[] = [];
  const transitionSegments = 24;
  // 从 i=1 开始，跳过 startPos（由 bodyHelixPts[0] 提供）
  // 到 i=transitionSegments-1 结束，跳过 attachPoint（由 hookLoopPts 提供）
  for (let i = 1; i < transitionSegments; i++) {
    const t = i / transitionSegments;
    transitionPts.push(
      cubicBezier(startPos, control1, control2, attachPoint, t)
    );
  }

  // ---------------------------------------------------------------
  // 9) 最终中心线：钩 → 过渡 → (紧邻线圈起点)
  //    注意：需要反转顺序，因为这是起始端
  //    startHookPts 的最后一个点应该紧邻 bodyHelixPts[0]，但不包含它
  // ---------------------------------------------------------------
  // hookLoopPts: [attachPoint, ..., hookTip]
  // 反转后: [hookTip, ..., attachPoint]
  const reversedHookPts = [...hookLoopPts].reverse();
  
  // transitionPts: 不包含 startPos 和 attachPoint
  // 反转后: 从靠近 attachPoint 到靠近 startPos
  const reversedTransitionPts = [...transitionPts].reverse();
  
  pts.push(...reversedHookPts.slice(0, -1)); // 跳过最后一个点 (attachPoint)
  pts.push(...reversedTransitionPts);        // 过渡段

  return pts;
}

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
    bodyLength, 
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
  const solidBodyLength = activeCoils * wireDiameter;
  const extendedLength = (solidBodyLength + currentExtension) * scale;
  
  const totalAngle = 2 * Math.PI * activeCoils;

  // Hook radius: slightly larger than helix radius to avoid interference
  // R_hook = meanRadius + wireRadius * 0.8
  const hookRadius = meanRadius + wireRadius * 0.8;

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
  let startHookPts: THREE.Vector3[];
  let endHookPts: THREE.Vector3[];
  
  // 所有钩型都使用 HookBuilder 生成
  // HookBuilder 支持: machine, side, crossover, extended, doubleLoop
  startHookPts = buildHookCenterline(
    "start",
    hookSpec,
    bodyHelixPts,
    scaledMeanRadius,
    scaledWireDiameter
  );
  endHookPts = buildHookCenterline(
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
