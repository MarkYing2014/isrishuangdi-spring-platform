/**
 * HookBuilder - Extension Spring Hook Geometry Builder
 * 
 * 通用的 Hook 中心线构建器，支持多种 Hook 类型。
 * 每种 Hook 类型只需定义 HookSpec 参数，不需要重写几何逻辑。
 * 
 * 设计原则：
 * 1. 单一真相源：所有 Hook 类型使用相同的构建逻辑
 * 2. 参数化：通过 HookSpec 控制几何差异
 * 3. C¹ 连续：使用三次贝塞尔曲线保证过渡平滑
 */

import * as THREE from "three";
import type { ExtensionHookType } from "@/lib/springTypes";

// ================================================================
// Hook Specification Interface
// ================================================================

/**
 * Hook 规格定义
 * 每种 Hook 类型只需要定义这些参数，不需要重写几何逻辑
 */
export interface HookSpec {
  type: ExtensionHookType;

  // 环参数
  loopCount: 1 | 2;                    // 1 = 单环, 2 = 双环
  loopAngleDeg: number;                // 环弧度数 (例如 270)
  loopStartAngle: number;              // 环起始角 (rad)

  // 环平面类型
  loopPlaneType: "axis-plane" | "orthogonal-plane";
  // axis-plane: 环平面包含轴线 (Machine Hook, Crossover Hook)
  // orthogonal-plane: 环平面垂直于轴线 (Side Hook, Extended Hook)

  // 环中心位置
  centerMode: "on-axis" | "radial-offset" | "crossover";
  // on-axis: 环中心在轴线上 (Machine Hook)
  // radial-offset: 环中心在弹簧外侧 (Side Hook)
  // crossover: 线材跨过中心后形成环 (Crossover Hook)

  // 间隙参数 (以 wireDiameter 为单位)
  axialGapFactor: number;              // 轴向间隙 = factor * wireDiameter
  radialOffsetFactor: number;          // 径向偏移 = factor * wireDiameter

  // Hook 半径因子 (以 meanRadius 为单位)
  hookRadiusFactor: number;            // hookRadius = factor * meanRadius

  // 过渡段参数
  handleLengthFactor: number;          // 控制点距离 = factor * wireDiameter

  // 延长段 (仅 Extended Hook)
  hasExtendedLeg: boolean;
  extendedLegLengthFactor: number;     // 延长段长度 = factor * meanDiameter
}

// ================================================================
// Hook Specifications for Each Type
// ================================================================

/**
 * 获取 Hook 规格
 */
export function getHookSpec(hookType: ExtensionHookType): HookSpec {
  switch (hookType) {
    case "machine":
      return {
        type: "machine",
        loopCount: 1,
        loopAngleDeg: 160,              // 限制最大角度
        loopStartAngle: -Math.PI / 2,   // 从底部开始
        loopPlaneType: "axis-plane",
        centerMode: "on-axis",
        axialGapFactor: 1.2,
        radialOffsetFactor: 0,
        hookRadiusFactor: 0.5,          // 减小弯钩半径
        handleLengthFactor: 2.0,
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };

    case "side":
      // Side Hook: 环在侧面，环平面包含轴线（拉力方向沿轴线）
      // 参考图片：环从弹簧末端开始，向上弯曲，开口朝上
      // loopStartAngle = Math.PI / 2 (90°)，从顶部开始，逆时针画 270°
      return {
        type: "side",
        loopCount: 1,
        loopAngleDeg: -270,             // 负值 = 逆时针方向
        loopStartAngle: Math.PI / 2,    // 从顶部开始（90°位置）
        loopPlaneType: "axis-plane",    // 环平面包含轴线（拉力方向正确）
        centerMode: "radial-offset",    // 环中心在侧面
        axialGapFactor: 0.8,
        radialOffsetFactor: 0.0,
        hookRadiusFactor: 0.7,
        handleLengthFactor: 0.3,
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };

    case "crossover":
      return {
        type: "crossover",
        loopCount: 1,
        loopAngleDeg: 160,              // 减小弯钩角度
        loopStartAngle: -Math.PI / 2,
        loopPlaneType: "axis-plane",
        centerMode: "crossover",        // 跨过中心模式
        axialGapFactor: 1.5,            // 钩圈中心离端面距离 ≈ 1.5d
        radialOffsetFactor: 0,
        hookRadiusFactor: 0.35,         // 恢复原来的钩圈半径
        handleLengthFactor: 0.6,        // 过渡段长度 ~ 0.6d
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };

    case "extended":
      // Extended Hook: 类似 Side Hook，但有延长段
      // 环平面仍然包含轴线（拉力方向沿轴线）
      return {
        type: "extended",
        loopCount: 1,
        loopAngleDeg: 200,
        loopStartAngle: -Math.PI / 2,   // 从底部开始
        loopPlaneType: "axis-plane",    // 环平面包含轴线（拉力方向正确）
        centerMode: "radial-offset",    // 环中心在侧面
        axialGapFactor: 1.5,            // 更大的轴向间隙（为延长段留空间）
        radialOffsetFactor: 0.8,
        hookRadiusFactor: 0.85,
        handleLengthFactor: 2.0,
        hasExtendedLeg: true,
        extendedLegLengthFactor: 0.5,   // 延长段 = 0.5 * meanDiameter
      };

    case "doubleLoop":
      return {
        type: "doubleLoop",
        loopCount: 2,
        loopAngleDeg: 340,
        loopStartAngle: -Math.PI / 2,
        loopPlaneType: "axis-plane",
        centerMode: "on-axis",
        axialGapFactor: 1.8,
        radialOffsetFactor: 0,
        hookRadiusFactor: 0.85,
        handleLengthFactor: 2.0,
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };

    default:
      // 默认使用 Machine Hook
      return getHookSpec("machine");
  }
}

// ================================================================
// Utility Functions
// ================================================================

/**
 * 三次贝塞尔曲线
 * B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 */
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

// ================================================================
// Crossover Hook - Dedicated Builder
// ================================================================

/**
 * Crossover Hook - 统一构建函数（OpenAI最终版）
 * 
 * 关键修复：
 * 1. loopCenter 必须推到外侧（沿 radialDir）
 * 2. 弧平面两端统一用 (axisDir, tanDir)
 */
function buildCrossoverHookCenterline(
  whichEnd: "start" | "end",
  endPos: THREE.Vector3,
  prevPos: THREE.Vector3,
  springAxisDir: THREE.Vector3,
  meanRadius: number,
  wireDiameter: number,
  spec: HookSpec
): THREE.Vector3[] {
  const isEnd = whichEnd === "end";
  const sign = isEnd ? 1 : -1;

  // 1) 基本方向
  const axisDir = springAxisDir.clone().normalize();       // (0,0,1)
  const axisPoint = new THREE.Vector3(0, 0, endPos.z);

  const radialDir = endPos.clone().sub(axisPoint);
  if (radialDir.lengthSq() < 1e-10) radialDir.set(1, 0, 0);
  radialDir.normalize();

  // ✅ tanDir 统一：用 axis × radial（右手系）
  const tanDir = new THREE.Vector3().crossVectors(axisDir, radialDir).normalize();
  if (tanDir.lengthSq() < 1e-10) tanDir.set(0, 1, 0);

  // ✅ 统一手性：保证 (axis × tan) · radial > 0
  if (new THREE.Vector3().crossVectors(axisDir, tanDir).dot(radialDir) < 0) {
    tanDir.negate();
  }

  // 2) 参数
  const hookRadius = meanRadius * spec.hookRadiusFactor;
  const axialOffset = wireDiameter * spec.axialGapFactor;
  const handleLen = (spec.handleLengthFactor ?? 0.6) * wireDiameter;

  // loopCenter：轴上偏移（恢复原始逻辑）
  const loopCenter = axisPoint.clone()
    .addScaledVector(axisDir, sign * axialOffset);

  // ✅ 弧平面两端必须一致：arcU=axis, arcV=tan
  const arcU = axisDir;
  const arcV = tanDir;

  // 3) startAngle：先把 start 固定回"曾经正确"的版本
  const startAngle = -Math.PI / 2;

  // 4) loopAngle：保持方向习惯（start/end 镜像）
  const loopAngleRad = THREE.MathUtils.degToRad(spec.loopAngleDeg) * sign;

  // 5) loopStart
  const loopStart = loopCenter.clone()
    .addScaledVector(arcU, hookRadius * Math.cos(startAngle))
    .addScaledVector(arcV, hookRadius * Math.sin(startAngle));

  // 6) helixInPlane（投影到 arcU+arcV 平面）
  const helixTangentRaw = isEnd
    ? endPos.clone().sub(prevPos)
    : prevPos.clone().sub(endPos);
  const helixTangent = helixTangentRaw.normalize();

  let helixInPlane = arcU.clone().multiplyScalar(helixTangent.dot(arcU))
    .add(arcV.clone().multiplyScalar(helixTangent.dot(arcV)));
  if (helixInPlane.lengthSq() < 1e-10) helixInPlane = arcU.clone().multiplyScalar(sign);
  helixInPlane.normalize();

  // 7) ring tangent at loopStart
  const ringTangent = arcU.clone().multiplyScalar(-Math.sin(startAngle))
    .add(arcV.clone().multiplyScalar(Math.cos(startAngle)))
    .normalize();

  // 8) Bezier transition
  const p0 = endPos.clone();
  const p1 = p0.clone().addScaledVector(helixInPlane, handleLen);
  const p3 = loopStart.clone();
  const p2 = p3.clone().sub(ringTangent.clone().multiplyScalar(handleLen));

  const transitionPts: THREE.Vector3[] = [];
  const segs = 24;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    transitionPts.push(cubicBezier(p0, p1, p2, p3, t));
  }
  transitionPts[transitionPts.length - 1].copy(loopStart);

  // 9) loop arc
  const loopPts: THREE.Vector3[] = [];
  const loopSegs = 96;
  for (let i = 1; i <= loopSegs; i++) {
    const t = i / loopSegs;
    const theta = startAngle + loopAngleRad * t;
    const p = loopCenter.clone()
      .addScaledVector(arcU, hookRadius * Math.cos(theta))
      .addScaledVector(arcV, hookRadius * Math.sin(theta));
    loopPts.push(p);
  }

  const pts = [...transitionPts, ...loopPts];
  pts[0] = endPos.clone();
  return pts;
}

// ================================================================
// Main Hook Centerline Builder
// ================================================================

/**
 * 构建 Hook 中心线
 * 
 * @param whichEnd - "start" 或 "end"
 * @param spec - Hook 规格
 * @param bodyHelixPts - 弹簧体中心线点
 * @param meanRadius - 平均半径 (已缩放)
 * @param wireDiameter - 线径 (已缩放)
 * @returns Hook 中心线点数组
 */
export function buildHookCenterline(
  whichEnd: "start" | "end",
  spec: HookSpec,
  bodyHelixPts: THREE.Vector3[],
  meanRadius: number,
  wireDiameter: number
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  if (bodyHelixPts.length < 2) return pts;

  // ---------------------------------------------------------------
  // 1) 确定端点和方向
  // ---------------------------------------------------------------
  const isEnd = whichEnd === "end";
  const endPos = isEnd
    ? bodyHelixPts[bodyHelixPts.length - 1].clone()
    : bodyHelixPts[0].clone();
  const prevPos = isEnd
    ? bodyHelixPts[bodyHelixPts.length - 2].clone()
    : bodyHelixPts[1].clone();

  // ---------------------------------------------------------------
  // Crossover Hook: 使用专门的构建函数
  // ---------------------------------------------------------------
  if (spec.centerMode === "crossover") {
    // 弹簧整体轴向（始终指向 +Z）
    const springAxisDir = new THREE.Vector3(0, 0, 1);
    return buildCrossoverHookCenterline(
      whichEnd,
      endPos,
      prevPos,
      springAxisDir,
      meanRadius,
      wireDiameter,
      spec
    );
  }

  // 弹簧轴方向（恢复原始逻辑）
  const springAxisDir = new THREE.Vector3(0, 0, isEnd ? 1 : -1);

  // 轴上的投影点
  const axisPoint = new THREE.Vector3(0, 0, endPos.z);

  // ---------------------------------------------------------------
  // 2) 计算径向和切向方向
  // ---------------------------------------------------------------
  let radialDir = endPos.clone().sub(axisPoint);
  if (radialDir.lengthSq() < 1e-8) {
    radialDir = new THREE.Vector3(1, 0, 0);
  } else {
    radialDir.normalize();
  }

  // 真实的 3D 螺旋切线方向（保留 Z 分量，用于连接点相切）
  // 方向：离开弹簧体的方向
  // End Hook: endPos - prevPos（沿螺旋前进方向）
  // Start Hook: endPos - prevPos（与螺旋前进方向相反，离开弹簧体）
  const helixTangent3D = endPos.clone().sub(prevPos).normalize();

  // XY 平面内的切向方向（用于定义钩弧平面）
  const tangentApprox = helixTangent3D.clone();
  tangentApprox.z = 0;
  if (tangentApprox.lengthSq() < 1e-8) {
    tangentApprox.set(-radialDir.y, radialDir.x, 0);
  }
  const tangentDir = tangentApprox.normalize();

  // ---------------------------------------------------------------
  // 3) 计算 Hook 参数
  // ---------------------------------------------------------------
  const hookRadius = meanRadius * spec.hookRadiusFactor;
  const hookGap = wireDiameter * spec.axialGapFactor;
  const handleLength = wireDiameter * spec.handleLengthFactor;

  // ---------------------------------------------------------------
  // 4) 构造 Hook 环平面的正交基 (u, v)
  // ---------------------------------------------------------------
  let u: THREE.Vector3;
  let v: THREE.Vector3;

  if (spec.loopPlaneType === "axis-plane") {
    // Machine Hook / Crossover / Side Hook: 环平面包含轴线
    // u = 轴向（拉力方向）
    // v = 切向
    u = springAxisDir.clone().normalize();
    v = new THREE.Vector3().crossVectors(radialDir, springAxisDir).normalize();
  } else {
    // 备用：环平面垂直于轴线
    u = radialDir.clone();
    v = tangentDir.clone();
  }

  // ---------------------------------------------------------------
  // 5) 生成 Hook 点 - 三段式结构
  // ---------------------------------------------------------------
  // 真实拉簧钩 = 轴向直线段 + 弯折 + 钩弧
  // 钩弧平面必须垂直于弹簧端面（即包含轴线）

  const hookLoopPts: THREE.Vector3[] = [];

  if (spec.centerMode === "radial-offset") {
    // ===== Side Hook =====
    // 钩弧平面 = 包含 Z 轴的竖直平面
    // 钩弧平面法向量 = radialDir
    // 钩弧平面基向量 = tangentDir + springAxisDir

    const sideHookRadius = hookRadius * 0.7;

    // 钩弧平面的两个基向量：
    // arcU = tangentDir（切向，在 XY 平面内）
    // arcV = springAxisDir（轴向，Z 方向）
    // 这样钩弧平面的法向量 = cross(tangentDir, axisDir) = radialDir ✅
    const arcU = tangentDir.clone();
    const arcV = springAxisDir.clone();

    // 计算起始角度，使弧的起点切线方向与 helixTangent3D 一致
    // 弧上的点：P(θ) = center + R*cos(θ)*arcU + R*sin(θ)*arcV
    // 切线方向：dP/dθ = -R*sin(θ)*arcU + R*cos(θ)*arcV
    // 在起点 θ=θ0，切线方向应该 = helixTangent3D
    // 所以：-sin(θ0)*arcU + cos(θ0)*arcV ∝ helixTangent3D
    // 即：sin(θ0) = -dot(helixTangent3D, arcU), cos(θ0) = dot(helixTangent3D, arcV)
    const sinTheta0 = -helixTangent3D.dot(arcU);
    const cosTheta0 = helixTangent3D.dot(arcV);
    const arcStartAngle = Math.atan2(sinTheta0, cosTheta0);

    // 弧的起点位置
    const arcStartPos = new THREE.Vector3()
      .addScaledVector(arcU, sideHookRadius * Math.cos(arcStartAngle))
      .addScaledVector(arcV, sideHookRadius * Math.sin(arcStartAngle));

    // 钩弧中心 = endPos - arcStartPos
    // 这样弧的起点正好在 endPos
    const hookArcCenter = endPos.clone().sub(arcStartPos);

    const arcTotalAngle = THREE.MathUtils.degToRad(300);
    const arcSegments = 72;

    for (let i = 1; i <= arcSegments; i++) {
      const t = i / arcSegments;
      const theta = arcStartAngle + arcTotalAngle * t;
      const p = hookArcCenter.clone()
        .add(arcU.clone().multiplyScalar(sideHookRadius * Math.cos(theta)))
        .add(arcV.clone().multiplyScalar(sideHookRadius * Math.sin(theta)));
      hookLoopPts.push(p);
    }
  } else {
    // ===== Machine Hook: 原有逻辑 =====
    // 环中心在轴线上
    const loopCenter = new THREE.Vector3(0, 0, endPos.z + (isEnd ? hookGap : -hookGap));

    const totalArc = THREE.MathUtils.degToRad(spec.loopAngleDeg);
    const loopSegments = 96;

    for (let i = 0; i <= loopSegments; i++) {
      const t = i / loopSegments;
      const theta = spec.loopStartAngle + totalArc * t;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      const p = loopCenter.clone()
        .add(u.clone().multiplyScalar(hookRadius * cosTheta))
        .add(v.clone().multiplyScalar(hookRadius * sinTheta));

      hookLoopPts.push(p);
    }
  }

  // ---------------------------------------------------------------
  // 6) 组合最终中心线
  // ---------------------------------------------------------------

  if (spec.centerMode === "radial-offset") {
    // Side Hook: 直接输出三段式结构的点（已在上面生成）
    if (isEnd) {
      pts.push(...hookLoopPts);
    } else {
      // Start Hook: 反转
      const reversedHookPts = [...hookLoopPts].reverse();
      pts.push(...reversedHookPts);
    }
  } else {
    // Machine Hook / Crossover: 需要过渡段
    const attachPoint = hookLoopPts[0].clone();

    // 计算线圈端点的切线方向
    const helixTangent = isEnd
      ? endPos.clone().sub(prevPos).normalize()
      : prevPos.clone().sub(endPos).normalize().negate();

    // 计算圆环起点的切线方向
    const hookTangent = u.clone().multiplyScalar(-Math.sin(spec.loopStartAngle))
      .add(v.clone().multiplyScalar(Math.cos(spec.loopStartAngle)))
      .normalize();

    const control1 = endPos.clone().add(
      helixTangent.clone().multiplyScalar(handleLength)
    );
    const control2 = attachPoint.clone().sub(
      hookTangent.clone().multiplyScalar(handleLength)
    );

    const transitionPts: THREE.Vector3[] = [];
    const transitionSegments = 24;

    for (let i = 1; i <= transitionSegments; i++) {
      const t = i / transitionSegments;
      transitionPts.push(
        cubicBezier(endPos, control1, control2, attachPoint, t)
      );
    }

    if (transitionPts.length > 0) {
      transitionPts[transitionPts.length - 1].copy(attachPoint);
    }

    if (isEnd) {
      pts.push(...transitionPts);
      pts.push(...hookLoopPts.slice(1));
    } else {
      const reversedHookPts = [...hookLoopPts].reverse();
      const reversedTransitionPts = [...transitionPts].reverse();
      pts.push(...reversedHookPts.slice(0, -1));
      pts.push(...reversedTransitionPts);
    }
  }

  if (pts.length > 0) {
    if (isEnd) {
      // End Hook: First point must match endPos exactly
      pts[0].copy(endPos);
    } else {
      // Start Hook: Last point must match endPos exactly (which is body[0])
      pts[pts.length - 1].copy(endPos);
    }
  }

  return pts;
}
