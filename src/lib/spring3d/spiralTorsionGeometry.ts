/**
 * Spiral Torsion Spring 3D Geometry
 * 螺旋扭转弹簧（带材卷绕式）Three.js 几何生成
 * 
 * 使用阿基米德螺线中心线 + 矩形截面 Sweep 生成实体
 * 
 * 几何模型：
 * - 中心线（XY 平面）：r(θ) = r_i + a·θ，其中 a = (r_o - r_i) / (2π·N)
 * - 截面：矩形，宽度 = stripWidth (b)，厚度 = stripThickness (t)
 * - 实体：矩形截面沿中心线 Extrude/Sweep
 */

import * as THREE from "three";

// ============================================================================
// 工程验收 Checklist - Frame 验证函数
// ============================================================================

const FRAME_EPS = 1e-4;

interface FrameValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证单个 frame 的工程正确性
 * 6 条断言：
 * 1. |T|≈1, |N|≈1, |B|≈1
 * 2. abs(T·N) < eps
 * 3. abs(T·B) < eps
 * 4. abs(N·B) < eps
 * 5. dot(T×N, B) > 0（右手系）
 * 6. dot(N, radialOut) > 0（厚度方向朝外）- 可选
 */
export function validateFrame(
  T: THREE.Vector3,
  N: THREE.Vector3,
  B: THREE.Vector3,
  P?: THREE.Vector3, // 位置，用于计算径向
  checkRadialOut: boolean = false
): FrameValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 单位向量检查
  const lenT = T.length();
  const lenN = N.length();
  const lenB = B.length();
  if (Math.abs(lenT - 1) > FRAME_EPS) errors.push(`|T|=${lenT.toFixed(6)} ≠ 1`);
  if (Math.abs(lenN - 1) > FRAME_EPS) errors.push(`|N|=${lenN.toFixed(6)} ≠ 1`);
  if (Math.abs(lenB - 1) > FRAME_EPS) errors.push(`|B|=${lenB.toFixed(6)} ≠ 1`);

  // 2-4. 正交性检查
  const dotTN = T.dot(N);
  const dotTB = T.dot(B);
  const dotNB = N.dot(B);
  if (Math.abs(dotTN) > FRAME_EPS) errors.push(`T·N=${dotTN.toFixed(6)} ≠ 0`);
  if (Math.abs(dotTB) > FRAME_EPS) errors.push(`T·B=${dotTB.toFixed(6)} ≠ 0`);
  if (Math.abs(dotNB) > FRAME_EPS) errors.push(`N·B=${dotNB.toFixed(6)} ≠ 0`);

  // 5. 右手系检查
  const TxN = new THREE.Vector3().crossVectors(T, N);
  const rightHand = TxN.dot(B);
  if (rightHand <= 0) errors.push(`T×N·B=${rightHand.toFixed(6)} ≤ 0 (非右手系)`);

  // 6. 厚度方向朝外检查（可选）
  if (checkRadialOut && P) {
    const radialOut = new THREE.Vector3(P.x, P.y, 0);
    if (radialOut.lengthSq() > 1e-12) {
      radialOut.normalize();
      const dotNR = N.dot(radialOut);
      if (dotNR < 0) warnings.push(`N·radialOut=${dotNR.toFixed(6)} < 0 (厚度方向朝内)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 批量验证 path points 的 frames
 * 返回验证报告
 */
export function validatePathFrames(
  points: EndPathPoint[],
  sectionName: string,
  startIdx: number = 0,
  endIdx?: number
): { passed: boolean; report: string } {
  const end = endIdx ?? points.length;
  let allPassed = true;
  const lines: string[] = [`=== ${sectionName} Frame 验证 (${startIdx}-${end}) ===`];

  for (let i = startIdx; i < end; i++) {
    const pt = points[i];
    const result = validateFrame(pt.tangent, pt.normal, pt.binormal, pt.position, true);
    if (!result.valid) {
      allPassed = false;
      lines.push(`[${i}] FAIL: ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      lines.push(`[${i}] WARN: ${result.warnings.join(', ')}`);
    }
  }

  if (allPassed) {
    lines.push(`✅ 全部 ${end - startIdx} 个点通过验证`);
  } else {
    lines.push(`❌ 验证失败`);
  }

  return { passed: allPassed, report: lines.join('\n') };
}

// ============================================================================
// 工程工具函数 - 带退化处理
// ============================================================================

/**
 * 向量投影到垂直于 T 的平面
 * 带退化处理：如果投影长度接近 0，使用 fallback
 */
function projectToPlane(v: THREE.Vector3, T: THREE.Vector3): THREE.Vector3 {
  const dot = v.dot(T);
  return v.clone().sub(T.clone().multiplyScalar(dot));
}

/**
 * 计算 frame，使用"径向投影法"
 * 工程规则：若 |proj(R, ⟂T)| < eps，就用 proj(perp(T), ⟂T) 作为 N 的 fallback
 */
function computeFrameFromRadial(
  T: THREE.Vector3,
  P: THREE.Vector3,
  Z: THREE.Vector3
): { T: THREE.Vector3; N: THREE.Vector3; B: THREE.Vector3 } {
  // 归一化 T
  const Tnorm = T.clone().normalize();

  // 径向外方向
  let R = new THREE.Vector3(P.x, P.y, 0);
  if (R.lengthSq() < 1e-12) {
    R = new THREE.Vector3(1, 0, 0);
  } else {
    R.normalize();
  }

  // N = R 投影到 ⟂T 平面
  let N = projectToPlane(R, Tnorm);
  
  // 退化处理：如果投影长度接近 0
  if (N.lengthSq() < 1e-9) {
    // 使用 perp(T) 作为 fallback
    const perp = new THREE.Vector3(-Tnorm.y, Tnorm.x, 0);
    N = projectToPlane(perp, Tnorm);
  }
  
  if (N.lengthSq() < 1e-12) {
    // 极端退化 fallback
    N = new THREE.Vector3(0, 0, 1);
  }
  N.normalize();

  // B = T × N
  let B = new THREE.Vector3().crossVectors(Tnorm, N).normalize();

  // 右手系修正：确保 B 与 Z 同向
  if (B.dot(Z) < 0) {
    N.multiplyScalar(-1);
    B.multiplyScalar(-1);
  }

  return { T: Tnorm, N, B };
}

// ============================================================================
// Types
// ============================================================================

export interface SpiralTorsionGeometryParams {
  innerDiameter: number;      // Di - 内径 (mm)
  outerDiameter: number;      // Do - 外径 (mm)
  turns: number;              // N - 圈数 (revolutions)
  stripWidth: number;         // b - 带材宽度 (mm)
  stripThickness: number;     // t - 带材厚度 (mm)
  handedness: "cw" | "ccw";   // 绕向：cw = 顺时针，ccw = 逆时针
  zOffset?: number;           // Z 轴偏移（默认 0）
  
  // 端部几何参数（v1）
  innerLegLengthMm?: number;  // 内端固定臂长度，默认 = max(stripWidth, 8)
  outerLegLengthMm?: number;  // 外端延伸臂长度，默认 = max(2*stripWidth, 15)
  hookDepthMm?: number;       // U 钩深度，默认 = max(stripWidth, 10)
  hookGapMm?: number;         // U 钩内净空，默认 = max(2*stripThickness, 2)
  hookTopMode?: "line" | "arc"; // U 钩顶部模式，默认 = "line"
}

export interface SpiralCenterlinePoint {
  x: number;
  y: number;
  z: number;
  theta: number;  // 角度 (radians)
  radius: number; // 半径 (mm)
}

// ============================================================================
// ArchimedeanSpiralCurve - 阿基米德螺线曲线类
// ============================================================================

/**
 * 阿基米德螺线曲线类
 * 用于 Three.js ExtrudeGeometry 的 extrudePath
 * 
 * 公式：r(θ) = r_i + a·θ
 * 其中 a = (r_o - r_i) / (2π·N)
 */
export class ArchimedeanSpiralCurve extends THREE.Curve<THREE.Vector3> {
  private innerRadius: number;
  private outerRadius: number;
  private turns: number;
  private handedness: "cw" | "ccw";
  private zOffset: number;
  private a: number; // 螺距系数

  constructor(params: {
    innerRadius: number;
    outerRadius: number;
    turns: number;
    handedness: "cw" | "ccw";
    zOffset?: number;
  }) {
    super();
    this.innerRadius = params.innerRadius;
    this.outerRadius = params.outerRadius;
    this.turns = params.turns;
    this.handedness = params.handedness;
    this.zOffset = params.zOffset ?? 0;
    
    // 计算螺距系数 a = (r_o - r_i) / (2π·N)
    const totalAngle = 2 * Math.PI * this.turns;
    this.a = (this.outerRadius - this.innerRadius) / totalAngle;
  }

  /**
   * 获取曲线上的点
   * @param t 参数 [0, 1]
   * @returns 3D 点
   */
  getPoint(t: number): THREE.Vector3 {
    // θ = t * 2π * N
    const theta = t * 2 * Math.PI * this.turns;
    
    // r = r_i + a * θ
    const r = this.innerRadius + this.a * theta;
    
    // 根据绕向调整角度方向
    const angle = this.handedness === "cw" ? -theta : theta;
    
    // 计算 XY 坐标
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    
    return new THREE.Vector3(x, y, this.zOffset);
  }

  /**
   * 获取曲线上的切线方向
   * @param t 参数 [0, 1]
   * @returns 切线向量（已归一化）
   */
  getTangent(t: number): THREE.Vector3 {
    const delta = 0.0001;
    const t1 = Math.max(0, t - delta);
    const t2 = Math.min(1, t + delta);
    
    const p1 = this.getPoint(t1);
    const p2 = this.getPoint(t2);
    
    return p2.sub(p1).normalize();
  }
}

// ============================================================================
// Geometry Generation Functions
// ============================================================================

/**
 * 构建螺旋扭转弹簧中心线点列（仅螺旋部分）
 * 用于 FreeCAD 导出脚本
 * 
 * @param params 几何参数
 * @param numPoints 点数（默认 800）
 * @returns 点列数组
 */
export function buildSpiralTorsionCenterlinePoints(
  params: SpiralTorsionGeometryParams,
  numPoints: number = 800
): SpiralCenterlinePoint[] {
  const innerRadius = params.innerDiameter / 2;
  const outerRadius = params.outerDiameter / 2;
  const totalAngle = 2 * Math.PI * params.turns;
  const a = (outerRadius - innerRadius) / totalAngle;
  const zOffset = params.zOffset ?? 0;
  
  const points: SpiralCenterlinePoint[] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const theta = t * totalAngle;
    const r = innerRadius + a * theta;
    
    // 根据绕向调整角度方向
    const angle = params.handedness === "cw" ? -theta : theta;
    
    points.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      z: zOffset,
      theta: theta,
      radius: r,
    });
  }
  
  return points;
}

/**
 * 计算切线和法向
 * T = tangent（单位向量）
 * N = normalize(cross(Z, T))，其中 Z = (0,0,1)
 * 
 * @param p1 前一个点
 * @param p2 后一个点
 * @returns { tangent, normal }
 */
function computeTangentAndNormal(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): { tangent: THREE.Vector3; normal: THREE.Vector3 } {
  // 切线 T = normalize(p2 - p1)
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const tangent = new THREE.Vector3(dx / len, dy / len, dz / len);
  
  // 法向 N = normalize(cross(Z, T))
  // Z = (0, 0, 1)
  // cross(Z, T) = (-T.y, T.x, 0)
  const nx = -tangent.y;
  const ny = tangent.x;
  const nz = 0;
  const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  const normal = new THREE.Vector3(nx / nLen, ny / nLen, nz / nLen);
  
  return { tangent, normal };
}

// ============================================================================
// 端部细分 + Parallel Transport 工具函数
// ============================================================================

/**
 * 在两点之间插入细分点（用于端部直线段）
 * @param points 目标点列
 * @param a 起点
 * @param b 终点
 * @param segments 细分段数
 */
function pushSegment(
  points: THREE.Vector3[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  segments: number = 10
): void {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    points.push(new THREE.Vector3(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    ));
  }
}

/**
 * 在两点之间插入圆弧点（用于 U 钩顶部）
 * @param points 目标点列
 * @param center 圆弧中心
 * @param start 起始点
 * @param end 终止点
 * @param segments 细分段数
 */
function pushArc(
  points: THREE.Vector3[],
  center: THREE.Vector3,
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number = 12
): void {
  // 计算起始和终止向量（相对于中心）
  const v0 = new THREE.Vector3().subVectors(start, center);
  const v1 = new THREE.Vector3().subVectors(end, center);
  const radius = v0.length();
  
  // 计算旋转轴和角度
  const axis = new THREE.Vector3().crossVectors(v0, v1).normalize();
  const angle = v0.angleTo(v1);
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const currentAngle = angle * t;
    const v = v0.clone().applyAxisAngle(axis, currentAngle).normalize().multiplyScalar(radius);
    points.push(new THREE.Vector3().addVectors(center, v));
  }
}

/**
 * 在 U 钩顶部生成半圆弧点列
 * 圆弧在 {tEnd, nHook} 平面内，从 p2 绕到 p3
 * 
 * @param points 目标点列
 * @param p2 起始点（U 钩第一条侧边终点）
 * @param p3 终止点（U 钩第二条侧边起点）
 * @param tEnd 切线方向
 * @param nHook 法向方向（朝外径）
 * @param segments 细分段数
 */
function addHookArc(
  points: THREE.Vector3[],
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  tEnd: THREE.Vector3,
  nHook: THREE.Vector3,
  segments: number = 12
): void {
  // 圆弧在 XY 平面内（因为 tEnd 和 nHook 都在 XY 平面）
  // 圆弧从 p2 到 p3，是一个半圆
  // 圆弧中心 = (p2 + p3) / 2
  const center = p2.clone().add(p3).multiplyScalar(0.5);
  const radius = p2.distanceTo(center);
  
  // 旋转轴 = Z 轴（因为圆弧在 XY 平面内）
  const axis = new THREE.Vector3(0, 0, 1);
  
  // 起始向量（从中心到 p2）
  const v0 = p2.clone().sub(center);
  
  // 半圆弧 = π 弧度
  const totalAngle = Math.PI;
  
  // 确定旋转方向：从 p2 到 p3
  // 检查 cross(v0, v1) 的 Z 分量来确定旋转方向
  const v1 = p3.clone().sub(center);
  const crossZ = v0.x * v1.y - v0.y * v1.x;
  const direction = crossZ >= 0 ? 1 : -1;
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const currentAngle = totalAngle * t * direction;
    const v = v0.clone().applyAxisAngle(axis, currentAngle);
    points.push(center.clone().add(v));
  }
}

/**
 * 初始化法向（从径向向量投影到垂直于切线的平面）
 * 比 cross(Z, T) 更稳定
 */
function initialNormalFromRadial(p: THREE.Vector3, t: THREE.Vector3): THREE.Vector3 {
  const r = new THREE.Vector3(p.x, p.y, 0);
  if (r.lengthSq() < 1e-12) return new THREE.Vector3(1, 0, 0);
  r.normalize();
  // 投影到垂直于 t 的平面：n = r - t*(r·t)
  const n = r.clone().sub(t.clone().multiplyScalar(r.dot(t)));
  if (n.lengthSq() < 1e-12) return new THREE.Vector3(-t.y, t.x, 0).normalize();
  return n.normalize();
}

/**
 * Parallel Transport：将法向从上一个切线旋转到当前切线
 * 保证截面在路径上连续旋转，不会突然跳变
 */
function transportNormal(
  nPrev: THREE.Vector3,
  tPrev: THREE.Vector3,
  tCurr: THREE.Vector3
): THREE.Vector3 {
  const axis = new THREE.Vector3().crossVectors(tPrev, tCurr);
  const axisLen = axis.length();
  if (axisLen < 1e-9) return nPrev.clone(); // 几乎同方向，不转
  axis.multiplyScalar(1 / axisLen);

  const dot = THREE.MathUtils.clamp(tPrev.dot(tCurr), -1, 1);
  const angle = Math.acos(dot);

  return nPrev.clone().applyAxisAngle(axis, angle).normalize();
}

/**
 * 端部路径点 + 显式 frame
 * 端部不使用 Parallel Transport，而是显式固定 frame
 */
export interface EndPathPoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;   // T - 切线方向
  normal: THREE.Vector3;    // N - 法向（厚度方向）
  binormal: THREE.Vector3;  // B - 副法向（宽度方向）
}

/**
 * 构建完整的螺旋扭转弹簧路径点列（带显式 frame）
 * 包含：innerLeg + spiral + outerLeg + U-hook
 * 
 * 关键改进：
 * - 端部使用显式固定 frame，不继承 Parallel Transport
 * - Inner leg: direction = cross(Z, radialIn), normal = radialIn
 * - Outer leg: direction = tEnd, normal = radialOut
 * - U-hook: 绕 Z 轴显式旋转 90°
 * 
 * @param params 几何参数
 * @param spiralPoints 螺旋部分点数（默认 400）
 * @returns EndPathPoint 数组（包含位置和显式 frame）
 */
export function buildSpiralTorsionPathPointsWithFrames(
  params: SpiralTorsionGeometryParams,
  spiralPoints: number = 400
): EndPathPoint[] {
  const innerRadius = params.innerDiameter / 2;
  const outerRadius = params.outerDiameter / 2;
  const totalAngle = 2 * Math.PI * params.turns;
  const a = (outerRadius - innerRadius) / totalAngle;
  const zOffset = params.zOffset ?? 0;
  
  // 端部参数（使用默认值）- 调整为更接近 Handbook Figure 1 的比例
  const innerLegLength = params.innerLegLengthMm ?? Math.max(params.stripWidth * 1.2, 10);
  const outerLegLength = params.outerLegLengthMm ?? Math.max(3 * params.stripWidth, 25);
  const hookDepth = params.hookDepthMm ?? Math.max(params.stripWidth * 0.45, 5); // 更短的侧边
  const hookGap = params.hookGapMm ?? Math.max(params.stripWidth * 0.9, 8);
  const hookTopMode = params.hookTopMode ?? "line"; // 默认使用直线（不做半圆）
  const hookReturnLegRatio = 0; // 开口 U - 不生成第二条腿
  
  // 折弯圆角半径（新增）- 增大以获得更明显的圆角
  const bendRadius = Math.max(3 * params.stripThickness, 3);
  
  // 端部细分段数
  const innerLegSegments = 15;
  const outerLegSegments = 20;
  const bendSegments = 16; // 90° 折弯圆角段数（增加以获得更平滑的圆角）
  const hookSideSegments = 6; // 侧边直线段数（减少，因为加了圆角）
  const cornerSegments = 8; // 侧边到顶部的小圆角段数
  const hookTopSegments = 12; // U 钩顶部直线段数
  
  // 侧边到顶部的小圆角半径
  const cornerRadius = Math.max(1.5 * params.stripThickness, 2);
  
  const Z = new THREE.Vector3(0, 0, 1);
  const result: EndPathPoint[] = [];
  
  // ========================================
  // 1. 螺旋部分点列
  // ========================================
  const spiralPts: THREE.Vector3[] = [];
  for (let i = 0; i <= spiralPoints; i++) {
    const t = i / spiralPoints;
    const theta = t * totalAngle;
    const r = innerRadius + a * theta;
    const angle = params.handedness === "cw" ? -theta : theta;
    spiralPts.push(new THREE.Vector3(
      r * Math.cos(angle),
      r * Math.sin(angle),
      zOffset
    ));
  }
  
  // ========================================
  // 2. 内端固定臂 - 直线穿过轴心 + 小弧过渡
  // ========================================
  // 
  // 结构：直线（穿过轴心）→ 小弧过渡 → 螺旋起点
  //
  const pStart = spiralPts[0];
  
  // 螺旋起点的切线
  const tSpiralStart = spiralPts[1].clone().sub(spiralPts[0]).normalize();
  
  // 径向内方向（指向轴心）- 内端直线应该穿过轴心
  const radialIn_inner = new THREE.Vector3(-pStart.x, -pStart.y, 0);
  if (radialIn_inner.lengthSq() > 1e-12) radialIn_inner.normalize();
  else radialIn_inner.set(-1, 0, 0);
  
  // 内端直线的切线方向（从轴心往外）
  const tInnerLeg = radialIn_inner.clone().multiplyScalar(-1);
  
  // 内端局部坐标系
  const ez_inner = Z.clone();
  
  // ey_inner = cross(ez_inner, tInnerLeg)
  let ey_inner = new THREE.Vector3().crossVectors(ez_inner, tInnerLeg);
  if (ey_inner.lengthSq() < 1e-12) {
    ey_inner = new THREE.Vector3(-tInnerLeg.y, tInnerLeg.x, 0);
  }
  ey_inner.normalize();
  
  // 小弧过渡参数
  const innerArcRadius = Math.max(2 * params.stripThickness, 2);
  const innerArcSegments = 8;
  
  // 计算 tInnerLeg 和 tSpiralStart 的夹角
  const dotInner = tInnerLeg.dot(tSpiralStart);
  const innerArcAngle = Math.acos(Math.max(-1, Math.min(1, dotInner)));
  
  // 小弧的旋转轴 = cross(tInnerLeg, tSpiralStart)
  let innerArcAxis = new THREE.Vector3().crossVectors(tInnerLeg, tSpiralStart);
  if (innerArcAxis.lengthSq() < 1e-12) {
    innerArcAxis = ez_inner.clone();
  }
  innerArcAxis.normalize();
  
  // 圆弧几何：
  // - 圆弧起点切线 = tInnerLeg
  // - 圆弧终点切线 = tSpiralStart
  // - 圆弧终点位置 = pStart（螺旋起点）
  // 
  // 圆弧圆心 = pStart + n * r，其中 n 垂直于 tSpiralStart
  // n = cross(innerArcAxis, tSpiralStart)（指向圆心的方向）
  const nArcAtEnd = new THREE.Vector3().crossVectors(innerArcAxis, tSpiralStart).normalize();
  const arcCenter = pStart.clone().add(nArcAtEnd.clone().multiplyScalar(innerArcRadius));
  
  // 圆弧起点 = arcCenter + 从圆心指向起点的向量
  // 起点方向 = -nArcAtEnd 绕 innerArcAxis 旋转 -innerArcAngle
  const nArcAtStart = nArcAtEnd.clone().applyAxisAngle(innerArcAxis, -innerArcAngle).multiplyScalar(-1);
  const pArcStart = arcCenter.clone().add(nArcAtStart.clone().multiplyScalar(innerArcRadius));
  
  // 直线终点 = 从 pArcStart 往轴心方向延伸 innerLegLength
  const pInnerEnd = pArcStart.clone().add(radialIn_inner.clone().multiplyScalar(innerLegLength));
  
  // ========================================
  // 2a. 内端直线（穿过轴心）
  // 路径顺序：从 pInnerEnd（轴心侧）到 pArcStart（小弧起点）
  // T = tInnerLeg（从轴心往外）
  // N = ey_inner
  // B = ez_inner
  // ========================================
  const nInnerLeg = ey_inner.clone();
  const bInnerLeg = ez_inner.clone();
  
  // 从 pInnerEnd 到 pArcStart
  for (let i = 0; i < innerLegSegments; i++) {
    const t = i / innerLegSegments;
    const pos = pInnerEnd.clone().lerp(pArcStart, t);
    result.push({
      position: pos,
      tangent: tInnerLeg.clone(),
      normal: nInnerLeg.clone(),
      binormal: bInnerLeg.clone(),
    });
  }
  
  // ========================================
  // 2b. 内端小弧过渡
  // 从 pArcStart 到 pStart
  // 切线从 tInnerLeg 转到 tSpiralStart
  // 使用正确的圆弧方程，而不是 lerp
  // ========================================
  
  // 从圆心到 pArcStart 的向量（用于旋转生成圆弧点）
  const radiusVec = pArcStart.clone().sub(arcCenter);
  
  for (let i = 1; i <= innerArcSegments; i++) {
    const phi = (i / innerArcSegments) * innerArcAngle;
    
    // 位置：绕圆心旋转
    const pos = arcCenter.clone().add(radiusVec.clone().applyAxisAngle(innerArcAxis, phi));
    
    // 切线：tInnerLeg 绕 innerArcAxis 旋转 phi
    const tArc = tInnerLeg.clone().applyAxisAngle(innerArcAxis, phi).normalize();
    
    // 法向：ey_inner 绕 innerArcAxis 旋转 phi
    const nArc = ey_inner.clone().applyAxisAngle(innerArcAxis, phi).normalize();
    
    result.push({
      position: pos,
      tangent: tArc,
      normal: nArc,
      binormal: ez_inner.clone(),
    });
  }
  
  // ========================================
  // 3. 螺旋部分（使用 Parallel Transport）
  // ========================================
  // 预计算螺旋切线
  const spiralTangents: THREE.Vector3[] = [];
  for (let i = 0; i < spiralPts.length; i++) {
    let t: THREE.Vector3;
    if (i === 0) {
      t = spiralPts[1].clone().sub(spiralPts[0]).normalize();
    } else if (i === spiralPts.length - 1) {
      t = spiralPts[i].clone().sub(spiralPts[i - 1]).normalize();
    } else {
      t = spiralPts[i + 1].clone().sub(spiralPts[i - 1]).normalize();
    }
    spiralTangents.push(t);
  }
  
  // 螺旋 frame 使用 Parallel Transport
  const spiralNormals: THREE.Vector3[] = [];
  
  // 从内端 frame 过渡到螺旋第一点
  // 螺旋第一点的 normal 应该从 radialIn 过渡
  let nSpiral = initialNormalFromRadial(spiralPts[0], spiralTangents[0]);
  spiralNormals.push(nSpiral);
  
  for (let i = 1; i < spiralPts.length; i++) {
    nSpiral = transportNormal(spiralNormals[i - 1], spiralTangents[i - 1], spiralTangents[i]);
    spiralNormals.push(nSpiral);
  }
  
  // 添加螺旋点（跳过第一个，已在内端臂末尾）
  for (let i = 1; i < spiralPts.length; i++) {
    const t = spiralTangents[i];
    const n = spiralNormals[i];
    const b = new THREE.Vector3().crossVectors(t, n).normalize();
    result.push({
      position: spiralPts[i].clone(),
      tangent: t.clone(),
      normal: n.clone(),
      binormal: b,
    });
  }
  
  // ========================================
  // 4. 外端几何 - 使用局部坐标系方程（关键：继承末端 frame）
  // ========================================
  //
  // 关键：端部局部坐标系 (ex, ey, ez) 必须继承螺旋末端的 binormal
  // 否则会发生"镜像/翻面"，导致折弯永远朝错方向
  //

  // 取螺旋末端点
  const pEnd = spiralPts[spiralPts.length - 1];

  // 重要：继承螺旋末端 frame（不要用固定 Z）
  const lastSpiral = result[result.length - 1];
  const tEnd = lastSpiral.tangent.clone().normalize();
  const nEnd = lastSpiral.normal.clone().normalize();
  const bEnd = lastSpiral.binormal.clone().normalize();

  // 端部局部坐标系：ex, ey, ez
  const ex = tEnd.clone();      // 外端直臂方向
  const ez = bEnd.clone();      // 继承螺旋末端 binormal（可能是 +Z 或 -Z，都要尊重）

  // radialOut：外径方向（从中心指向外圈），用于确定折弯朝外
  const R = new THREE.Vector3(pEnd.x, pEnd.y, 0);
  if (R.lengthSq() > 1e-12) R.normalize();
  else R.set(1, 0, 0);

  // ey：把 R 投影到 ⟂ex 的平面，得到"真正外折方向"
  let ey = R.clone().sub(ex.clone().multiplyScalar(R.dot(ex)));
  if (ey.lengthSq() < 1e-12) {
    // 退化：如果 ex 与 R 接近平行，用 ez×ex 兜底
    ey = new THREE.Vector3().crossVectors(ez, ex);
  }
  ey.normalize();

  // 右手系校正：要求 cross(ex, ey) 与 ez 同向
  if (new THREE.Vector3().crossVectors(ex, ey).dot(ez) < 0) {
    ey.multiplyScalar(-1);
  }

  // （可选但强烈建议）确保外端 normal 连续：如果 ey 与末端 nEnd 反向，可翻转 ey
  // 这可以减少外端刚开始那一瞬间的截面翻转
  if (ey.dot(nEnd) < 0) {
    ey.multiplyScalar(-1);
    // 翻转后再做一次右手系校正
    if (new THREE.Vector3().crossVectors(ex, ey).dot(ez) < 0) {
      ey.multiplyScalar(-1);
    }
  }

  // 参数
  const L = outerLegLength;
  const rBend = bendRadius;

  // ========================================
  // 4a. 外端直臂（预留圆角长度）
  // P_leg(u) = pEnd + u * ex
  // ========================================
  const legLen = Math.max(L - rBend, 0);
  const Q0 = pEnd.clone().add(ex.clone().multiplyScalar(legLen)); // 直臂末端（圆角起点）

  for (let i = 1; i <= outerLegSegments; i++) {
    const u = (i / outerLegSegments) * legLen;
    const pos = pEnd.clone().add(ex.clone().multiplyScalar(u));
    result.push({
      position: pos,
      tangent: ex.clone(),
      normal: ey.clone(),       // 厚度方向朝外
      binormal: ez.clone(),     // 继承末端 binormal
    });
  }

  // ========================================
  // 4b. 90° 折弯圆角（quarter arc）
  // P_bend(φ) = Q0 + rBend*(sinφ*ex + (1-cosφ)*ey), φ∈[0,π/2]
  // T(φ) = normalize(cosφ*ex + sinφ*ey)
  // N(φ) = normalize(cosφ*ey - sinφ*ex)
  // B = ez（固定为继承来的 binormal）
  // ========================================
  let endBend = Q0.clone();

  for (let i = 1; i <= bendSegments; i++) {
    const phi = (i / bendSegments) * (Math.PI / 2);

    const pos = Q0.clone()
      .add(ex.clone().multiplyScalar(rBend * Math.sin(phi)))
      .add(ey.clone().multiplyScalar(rBend * (1 - Math.cos(phi))));

    const tBendLocal = ex.clone().multiplyScalar(Math.cos(phi))
      .add(ey.clone().multiplyScalar(Math.sin(phi)))
      .normalize();

    const nBendLocal = ey.clone().multiplyScalar(Math.cos(phi))
      .add(ex.clone().multiplyScalar(-Math.sin(phi)))
      .normalize();

    result.push({
      position: pos,
      tangent: tBendLocal,
      normal: nBendLocal,
      binormal: ez.clone(),
    });

    endBend = pos;
  }

  // 折弯后，侧边的起点方向就是 ey
  // 注意：侧边长度需要预留小圆角半径
  const rCorner = cornerRadius;
  const sideLen = Math.max(hookDepth - rBend - rCorner, 0);
  const Q1 = endBend.clone().add(ey.clone().multiplyScalar(sideLen)); // 侧边末端（小圆角起点）

  // ========================================
  // 4c. U 钩第一条侧边（缩短后的直线段）
  // 从 endBend -> Q1
  // T = ey
  // N = -ex（折弯后厚度方向跟着转）
  // B = ez
  // ========================================
  const tHook1 = ey.clone();
  const nHook1 = ex.clone().multiplyScalar(-1);
  const bHook1 = ez.clone();

  if (sideLen > 0) {
    for (let i = 1; i <= hookSideSegments; i++) {
      const t = i / hookSideSegments;
      const pos = endBend.clone().lerp(Q1, t);
      result.push({
        position: pos,
        tangent: tHook1.clone(),
        normal: nHook1.clone(),
        binormal: bHook1.clone(),
      });
    }
  }

  // ========================================
  // 4d. 侧边到顶部的小圆角（90° quarter arc）
  // 从 ey 方向平滑转到 -ex 方向
  // P_corner(φ) = Q1 + rCorner*(sinφ*ey + (1-cosφ)*(-ex)), φ∈[0,π/2]
  // ========================================
  let endCorner = Q1.clone();
  
  for (let i = 1; i <= cornerSegments; i++) {
    const phi = (i / cornerSegments) * (Math.PI / 2);
    
    // pos = Q1 + rCorner * (sinφ * ey + (1-cosφ) * (-ex))
    const pos = Q1.clone()
      .add(ey.clone().multiplyScalar(rCorner * Math.sin(phi)))
      .add(ex.clone().multiplyScalar(-rCorner * (1 - Math.cos(phi))));
    
    // tangent: 从 ey 转到 -ex
    // T(φ) = cosφ * ey + sinφ * (-ex) = cosφ * ey - sinφ * ex
    const tCorner = ey.clone().multiplyScalar(Math.cos(phi))
      .add(ex.clone().multiplyScalar(-Math.sin(phi)))
      .normalize();
    
    // normal: 从 -ex 转到 -ey
    // N(φ) = cosφ * (-ex) + sinφ * (-ey) = -cosφ * ex - sinφ * ey
    const nCorner = ex.clone().multiplyScalar(-Math.cos(phi))
      .add(ey.clone().multiplyScalar(-Math.sin(phi)))
      .normalize();
    
    result.push({
      position: pos,
      tangent: tCorner,
      normal: nCorner,
      binormal: ez.clone(),
    });
    
    endCorner = pos;
  }

  // ========================================
  // 4e. U 钩顶部直线
  // 从 endCorner 沿 -ex 方向走
  // 长度 = hookGap - rCorner
  // ========================================
  const g = hookGap;
  const topLen = Math.max(g - rCorner, 0);
  const Q2 = endCorner.clone().add(ex.clone().multiplyScalar(-topLen)); // 顶部直线终点

  const tTop = ex.clone().multiplyScalar(-1);
  // 顶部直线的 normal = -ey（小圆角终点时 N = -ey）
  const nTop = ey.clone().multiplyScalar(-1);

  for (let i = 1; i <= hookTopSegments; i++) {
    const tt = i / hookTopSegments;
    const pos = endCorner.clone().lerp(Q2, tt);
    result.push({
      position: pos,
      tangent: tTop.clone(),
      normal: nTop.clone(),
      binormal: ez.clone(),
    });
  }

  // ========================================
  // 4e. U 钩第二条侧边（开口 U，默认不生成）
  // ========================================
  // hookReturnLegRatio = 0 表示开口 U
  if (hookReturnLegRatio > 0) {
    // Q3 = Q2 - hookDepth * ratio * ey
    const Q3 = Q2.clone().add(ey.clone().multiplyScalar(-hookDepth * hookReturnLegRatio));

    // 这段的切线方向是 -ey
    // normal 变成 -ex（保持一致）
    const tHook2 = ey.clone().multiplyScalar(-1);
    const nHook2 = ex.clone().multiplyScalar(-1);
    const bHook2 = ez.clone();

    const hookSecondSegments = Math.max(Math.ceil(hookSideSegments * hookReturnLegRatio), 3);
    for (let i = 1; i <= hookSecondSegments; i++) {
      const t = i / hookSecondSegments;
      const pos = Q2.clone().lerp(Q3, t);
      result.push({
        position: pos,
        tangent: tHook2.clone(),
        normal: nHook2.clone(),
        binormal: bHook2.clone(),
      });
    }
  }
  
  // ========================================
  // 工程验收：验证所有 frames
  // 临时启用 debug 输出（验证完成后可改回 false）
  // ========================================
  const DEBUG_ENABLED = false; // 验证完成，关闭 debug
  if (DEBUG_ENABLED || (typeof window !== 'undefined' && (window as unknown as { DEBUG_SPIRAL_FRAMES?: boolean }).DEBUG_SPIRAL_FRAMES)) {
    console.log('=== Spiral Torsion Spring Frame 验证 ===');
    console.log(`总点数: ${result.length}`);
    
    // 验证所有点
    const validation = validatePathFrames(result, '完整路径');
    console.log(validation.report);
    
    // 输出关键点的 frame 数据
    const keyPoints = [0, innerLegSegments, innerLegSegments + innerArcSegments, result.length - 1];
    for (const idx of keyPoints) {
      if (idx < result.length) {
        const pt = result[idx];
        console.log(`[${idx}] P=(${pt.position.x.toFixed(2)}, ${pt.position.y.toFixed(2)}, ${pt.position.z.toFixed(2)})`);
        console.log(`     T=(${pt.tangent.x.toFixed(4)}, ${pt.tangent.y.toFixed(4)}, ${pt.tangent.z.toFixed(4)})`);
        console.log(`     N=(${pt.normal.x.toFixed(4)}, ${pt.normal.y.toFixed(4)}, ${pt.normal.z.toFixed(4)})`);
        console.log(`     B=(${pt.binormal.x.toFixed(4)}, ${pt.binormal.y.toFixed(4)}, ${pt.binormal.z.toFixed(4)})`);
      }
    }
  }
  
  return result;
}

/**
 * 构建完整的螺旋扭转弹簧路径点列（仅位置，兼容旧接口）
 * 
 * @param params 几何参数
 * @param spiralPoints 螺旋部分点数（默认 400）
 * @returns THREE.Vector3 点列数组
 */
export function buildSpiralTorsionPathPoints(
  params: SpiralTorsionGeometryParams,
  spiralPoints: number = 400
): THREE.Vector3[] {
  const pathWithFrames = buildSpiralTorsionPathPointsWithFrames(params, spiralPoints);
  return pathWithFrames.map(p => p.position);
}

/**
 * 从点列创建 CurvePath（使用 LineCurve3，不使用 CatmullRom）
 * 保持折线段为直线，不会被平滑化
 * 
 * @param points 点列
 * @returns THREE.CurvePath
 */
export function createCurvePathFromPoints(
  points: THREE.Vector3[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  
  for (let i = 0; i < points.length - 1; i++) {
    path.add(new THREE.LineCurve3(points[i], points[i + 1]));
  }
  
  return path;
}

/**
 * 创建矩形截面 Shape
 * 用于 ExtrudeGeometry
 * 
 * @param width 宽度 (b - 带材宽度)
 * @param thickness 厚度 (t - 带材厚度)
 * @returns THREE.Shape
 */
export function createRectangularCrossSection(
  width: number,
  thickness: number
): THREE.Shape {
  const shape = new THREE.Shape();
  
  // 矩形截面，中心在原点
  // 宽度沿 Z 轴（垂直于 XY 平面）
  // 厚度沿径向（在 XY 平面内）
  const halfWidth = width / 2;
  const halfThickness = thickness / 2;
  
  shape.moveTo(-halfThickness, -halfWidth);
  shape.lineTo(halfThickness, -halfWidth);
  shape.lineTo(halfThickness, halfWidth);
  shape.lineTo(-halfThickness, halfWidth);
  shape.closePath();
  
  return shape;
}

/**
 * 创建螺旋扭转弹簧 BufferGeometry
 * 
 * 使用手动构建的几何体，沿完整路径扫掠矩形截面
 * 路径包含：innerLeg + spiral + outerLeg + U-hook
 * 矩形截面：宽度 = stripWidth (b)，厚度 = stripThickness (t)
 * 
 * 关键改进：
 * - 端部使用显式固定 frame，不继承 Parallel Transport
 * - 每个路径点都有预计算的 {T, N, B} frame
 * 
 * @param params 几何参数
 * @param spiralSteps 螺旋部分步数（默认 400）
 * @returns THREE.BufferGeometry
 */
export function createSpiralTorsionSpringGeometry(
  params: SpiralTorsionGeometryParams,
  spiralSteps: number = 400
): THREE.BufferGeometry {
  // 获取完整路径点列（包含显式 frame）
  const pathWithFrames = buildSpiralTorsionPathPointsWithFrames(params, spiralSteps);
  
  // 矩形截面尺寸
  const halfWidth = params.stripWidth / 2;      // b/2 - 沿 binormal 方向
  const halfThickness = params.stripThickness / 2; // t/2 - 沿 normal 方向
  
  // 构建顶点和面
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  
  const steps = pathWithFrames.length - 1;
  
  // ========================================
  // 构建顶点（使用预计算的显式 frame）
  // ========================================
  for (let i = 0; i <= steps; i++) {
    const point = pathWithFrames[i];
    const p = point.position;
    const n = point.normal;
    const b = point.binormal;
    
    // 中心点位置
    const cx = p.x;
    const cy = p.y;
    const cz = p.z;
    
    // 矩形截面的 4 个顶点（相对于中心点）
    // 厚度方向沿 normal (n)，宽度方向沿 binormal (b)
    const corners = [
      { dn: -halfThickness, db: -halfWidth }, // 0: 内侧下
      { dn: halfThickness, db: -halfWidth },  // 1: 外侧下
      { dn: halfThickness, db: halfWidth },   // 2: 外侧上
      { dn: -halfThickness, db: halfWidth },  // 3: 内侧上
    ];
    
    for (const corner of corners) {
      const vx = cx + corner.dn * n.x + corner.db * b.x;
      const vy = cy + corner.dn * n.y + corner.db * b.y;
      const vz = cz + corner.dn * n.z + corner.db * b.z;
      vertices.push(vx, vy, vz);
      
      // 法线（使用顶点相对于中心的方向）
      const vnx = corner.dn * n.x + corner.db * b.x;
      const vny = corner.dn * n.y + corner.db * b.y;
      const vnz = corner.dn * n.z + corner.db * b.z;
      const vnLen = Math.sqrt(vnx * vnx + vny * vny + vnz * vnz) || 1;
      normals.push(vnx / vnLen, vny / vnLen, vnz / vnLen);
    }
  }
  
  // 构建面（连接相邻截面的顶点）
  for (let i = 0; i < steps; i++) {
    const base = i * 4;
    const next = (i + 1) * 4;
    
    // 4 个侧面（每个侧面 2 个三角形）
    // 外侧面 (1-2)
    indices.push(base + 1, next + 1, next + 2);
    indices.push(base + 1, next + 2, base + 2);
    
    // 上侧面 (2-3)
    indices.push(base + 2, next + 2, next + 3);
    indices.push(base + 2, next + 3, base + 3);
    
    // 内侧面 (3-0)
    indices.push(base + 3, next + 3, next + 0);
    indices.push(base + 3, next + 0, base + 0);
    
    // 下侧面 (0-1)
    indices.push(base + 0, next + 0, next + 1);
    indices.push(base + 0, next + 1, base + 1);
  }
  
  // 添加端面（起始和结束）
  // 起始端面
  indices.push(0, 1, 2);
  indices.push(0, 2, 3);
  
  // 结束端面
  const lastBase = steps * 4;
  indices.push(lastBase + 2, lastBase + 1, lastBase + 0);
  indices.push(lastBase + 3, lastBase + 2, lastBase + 0);
  
  // 创建 BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  
  // 重新计算法线以获得更好的光照效果
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * 创建螺旋扭转弹簧 BufferGeometry（矩形截面版本）
 * 使用 ExtrudeGeometry 沿阿基米德螺线拉伸矩形截面
 * 
 * 注意：平面曲线的 Frenet frame 可能导致截面翻转问题
 * 需要自定义 frames 或使用其他方法
 * 
 * @param params 几何参数
 * @param steps 拉伸步数（默认 800）
 * @returns THREE.BufferGeometry
 */
export function createSpiralTorsionSpringGeometryRectangular(
  params: SpiralTorsionGeometryParams,
  steps: number = 800
): THREE.BufferGeometry {
  // 创建阿基米德螺线曲线
  const curve = new ArchimedeanSpiralCurve({
    innerRadius: params.innerDiameter / 2,
    outerRadius: params.outerDiameter / 2,
    turns: params.turns,
    handedness: params.handedness,
    zOffset: params.zOffset,
  });
  
  // 创建矩形截面
  const shape = createRectangularCrossSection(
    params.stripWidth,
    params.stripThickness
  );
  
  // 使用 ExtrudeGeometry 沿曲线拉伸
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: steps,
    bevelEnabled: false,
    extrudePath: curve,
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  // 计算法线以获得正确的光照
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * 从 SpiralTorsionGeometry Store 类型转换为几何参数
 * 
 * @param storeGeometry Store 中的几何数据
 * @returns 几何参数
 */
export function convertStoreToGeometryParams(
  storeGeometry: {
    innerDiameter: number;
    outerDiameter: number;
    activeCoils: number;
    stripWidth: number;
    stripThickness: number;
    windingDirection?: "cw" | "ccw";
  }
): SpiralTorsionGeometryParams {
  return {
    innerDiameter: storeGeometry.innerDiameter,
    outerDiameter: storeGeometry.outerDiameter,
    turns: storeGeometry.activeCoils,
    stripWidth: storeGeometry.stripWidth,
    stripThickness: storeGeometry.stripThickness,
    handedness: storeGeometry.windingDirection ?? "cw",
    zOffset: 0,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * 验证几何参数
 * 
 * @param params 几何参数
 * @returns 验证结果
 */
export function validateSpiralTorsionGeometry(
  params: SpiralTorsionGeometryParams
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (params.innerDiameter <= 0) {
    errors.push("Inner diameter must be positive");
  }
  
  if (params.outerDiameter <= params.innerDiameter) {
    errors.push("Outer diameter must be greater than inner diameter");
  }
  
  if (params.turns <= 0) {
    errors.push("Turns must be positive");
  }
  
  if (params.stripWidth <= 0) {
    errors.push("Strip width must be positive");
  }
  
  if (params.stripThickness <= 0) {
    errors.push("Strip thickness must be positive");
  }
  
  // 检查带材厚度是否小于匝间间距
  const innerRadius = params.innerDiameter / 2;
  const outerRadius = params.outerDiameter / 2;
  const radialSpacing = (outerRadius - innerRadius) / params.turns;
  
  if (params.stripThickness > radialSpacing) {
    errors.push(`Strip thickness (${params.stripThickness}mm) exceeds radial spacing (${radialSpacing.toFixed(2)}mm) - coils will overlap`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
