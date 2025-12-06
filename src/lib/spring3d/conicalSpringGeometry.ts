/**
 * Conical Spring 3D Geometry Generator
 * 锥形弹簧3D几何生成器
 * 
 * Engineering-accurate model with:
 * - Closed and ground ends (并紧磨平端)
 * - Variable pitch along height
 * - Non-linear compression behavior
 * - Coil collapse simulation
 */

import * as THREE from "three";

// ================================================================
// Types
// ================================================================

export interface ConicalSpringParams {
  /** Wire diameter d (mm) */
  wireDiameter: number;
  /** Large end outer diameter D1 (mm) - bottom */
  largeOuterDiameter: number;
  /** Small end outer diameter D2 (mm) - top */
  smallOuterDiameter: number;
  /** Free length L0 (mm) */
  freeLength: number;
  /** Active coils Na */
  activeCoils: number;
  /** Total coils Nt (includes dead coils at ends) */
  totalCoils?: number;
  /** End type */
  endType: 'open' | 'closed' | 'closed_ground';
  /** Current deflection (mm) */
  currentDeflection?: number;
  /** Number of collapsed coils */
  collapsedCoils?: number;
  /** Scale factor for visualization */
  scale: number;
}

export interface ConicalSpringGeometry {
  /** Main body geometry */
  bodyGeometry: THREE.TubeGeometry;
  /** Bottom end cap geometry (for ground ends) */
  bottomEndGeometry: THREE.TubeGeometry | null;
  /** Top end cap geometry (for ground ends) */
  topEndGeometry: THREE.TubeGeometry | null;
  /** Collapsed section geometry */
  collapsedGeometry: THREE.TubeGeometry | null;
  /** Active section geometry */
  activeGeometry: THREE.TubeGeometry | null;
  /** Total height of spring */
  totalHeight: number;
  /** Wire radius (scaled) */
  wireRadius: number;
  /** Collapsed ratio (0-1) */
  collapsedRatio: number;
  /** Clipping planes for ground ends */
  clipPlanes: { bottom: THREE.Plane; top: THREE.Plane } | null;
  /** End disc positions for ground flat surfaces */
  endDiscs: {
    bottomPosition: number;
    topPosition: number;
    largeRadius: number;  // Bottom end radius
    smallRadius: number;  // Top end radius
    wireRadius: number;
  } | null;
}

export interface ConicalCoilData {
  /** Coil index (0-based) */
  index: number;
  /** Mean diameter at this coil */
  meanDiameter: number;
  /** Height position of this coil */
  height: number;
  /** Local pitch at this coil */
  pitch: number;
  /** Local spring rate contribution */
  localSpringRate: number;
  /** Is this coil collapsed? */
  isCollapsed: boolean;
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Calculate mean diameter at a given height ratio
 * 计算给定高度比例处的平均直径
 */
function getMeanDiameterAtRatio(
  largeMeanDiameter: number,
  smallMeanDiameter: number,
  ratio: number // 0 = bottom (large), 1 = top (small)
): number {
  return largeMeanDiameter + (smallMeanDiameter - largeMeanDiameter) * ratio;
}

/**
 * Calculate the pitch at each coil for closed ground ends
 * 计算并紧磨平端的节距分布
 */
function calculatePitchDistribution(
  freeLength: number,
  activeCoils: number,
  wireDiameter: number,
  endType: 'open' | 'closed' | 'closed_ground'
): { pitches: number[]; deadCoilsBottom: number; deadCoilsTop: number } {
  const deadCoilsBottom = endType === 'closed_ground' || endType === 'closed' ? 1 : 0;
  const deadCoilsTop = endType === 'closed_ground' || endType === 'closed' ? 1 : 0;
  
  const totalCoils = activeCoils + deadCoilsBottom + deadCoilsTop;
  const pitches: number[] = [];
  
  // Dead coils have pitch = wire diameter (touching)
  // Active coils share the remaining height
  const deadHeight = (deadCoilsBottom + deadCoilsTop) * wireDiameter;
  const activeHeight = freeLength - deadHeight;
  const activePitch = activeHeight / activeCoils;
  
  for (let i = 0; i < totalCoils; i++) {
    if (i < deadCoilsBottom) {
      // Bottom dead coil
      pitches.push(wireDiameter);
    } else if (i >= totalCoils - deadCoilsTop) {
      // Top dead coil
      pitches.push(wireDiameter);
    } else {
      // Active coil
      pitches.push(activePitch);
    }
  }
  
  return { pitches, deadCoilsBottom, deadCoilsTop };
}

// ================================================================
// Main Geometry Generator
// ================================================================

/**
 * 生成带并紧 + 塌圈的锥形弹簧中心线 (OpenAI 优化方案)
 * 
 * 核心改进:
 * - 自由状态：按 pitches[] 分配高度
 * - 压缩状态：前 collapsedCoils 圈锁死为节距 = d，其余圈按比例压缩
 * - 死圈半径：底部死圈用大端直径，顶部死圈用小端直径
 * 
 * @param params 锥形弹簧参数
 * @returns 中心线点和圈数据
 */
export function generateConicalSpringCenterline(
  params: ConicalSpringParams
): {
  points: THREE.Vector3[];
  coilData: ConicalCoilData[];
  collapsedPoints: THREE.Vector3[];
  activePoints: THREE.Vector3[];
  collapsedRatio: number;
} {
  const {
    wireDiameter,
    largeOuterDiameter,
    smallOuterDiameter,
    freeLength,
    activeCoils,
    endType,
    currentDeflection = 0,
    collapsedCoils: collapsedCoilsInput = 0,
    scale,
  } = params;

  // --- 1. 计算自由状态下每一圈的节距（包含死圈） --------------------
  const largeMeanDiameter = largeOuterDiameter - wireDiameter;
  const smallMeanDiameter = smallOuterDiameter - wireDiameter;

  const {
    pitches: basePitches,
    deadCoilsBottom,
    deadCoilsTop,
  } = calculatePitchDistribution(
    freeLength,
    activeCoils,
    wireDiameter,
    endType
  );

  const totalCoils = basePitches.length;

  // 自由高度（理论上应 ≈ freeLength）
  const freeHeight = basePitches.reduce((s, p) => s + p, 0);

  // 目标总高度 = 自由高度 - 压缩量，不能低于全部圈完全并紧时的高度
  const minHeight = totalCoils * wireDiameter;
  const targetHeight = Math.max(freeHeight - currentDeflection, minHeight);

  // --- 2. 根据 collapsedCoils 把前几圈锁死为并紧状态 ------------------
  const collapsedCoils = Math.max(
    0,
    Math.min(collapsedCoilsInput, totalCoils - 1)
  );

  const compressedPitches = [...basePitches];

  // 已塌的圈：节距强制为 wireDiameter（并紧）
  for (let i = 0; i < collapsedCoils; i++) {
    compressedPitches[i] = wireDiameter;
  }

  const collapsedHeight = collapsedCoils * wireDiameter;

  // 剩余可压缩的圈
  const remainingCoils = totalCoils - collapsedCoils;
  const baseRemainingHeight = basePitches
    .slice(collapsedCoils)
    .reduce((s, p) => s + p, 0);

  // 剩余高度不能比"全并紧"还小
  const minRemainingHeight = remainingCoils * wireDiameter;
  const targetRemainingHeight = Math.max(
    targetHeight - collapsedHeight,
    minRemainingHeight
  );

  // 其余圈的节距整体按比例缩放
  const scalePitch =
    baseRemainingHeight > 1e-6
      ? targetRemainingHeight / baseRemainingHeight
      : 1.0;

  for (let i = collapsedCoils; i < totalCoils; i++) {
    compressedPitches[i] = basePitches[i] * scalePitch;
  }

  // --- 3. 预计算每圈起始高度（前缀和），后面生成点时可以 O(1) 查 --------
  const coilStartHeights: number[] = new Array(totalCoils + 1);
  coilStartHeights[0] = 0;
  for (let i = 0; i < totalCoils; i++) {
    coilStartHeights[i + 1] = coilStartHeights[i] + compressedPitches[i];
  }

  // --- 4. 生成中心线点 -----------------------------------------------
  const points: THREE.Vector3[] = [];
  const coilData: ConicalCoilData[] = [];

  const samplesPerCoil = 36;
  const totalSamples = totalCoils * samplesPerCoil;

  // 用于记录每圈的代表数据（用 coil 进入时的那个点）
  let lastRecordedCoil = -1;

  for (let i = 0; i <= totalSamples; i++) {
    const s = i / totalSamples; // 0 ~ 1
    const coilPos = s * totalCoils; // 0 ~ totalCoils
    const coilIndex = Math.min(Math.floor(coilPos), totalCoils - 1);
    const localT = coilPos - coilIndex; // 当前圈内 0~1

    // 高度：本圈起始高度 + 本圈内线性插值
    const h0 = coilStartHeights[coilIndex];
    const pitchHere = compressedPitches[coilIndex];
    const height = (h0 + localT * pitchHere) * scale; // Y 方向

    // 计算锥形半径：
    //   - 死圈保持端部直径不变
    //   - 活动圈在 [deadBottom, total - deadTop] 之间线性过渡
    let axialRatio: number;
    if (coilIndex < deadCoilsBottom) {
      // 底部死圈：用大端直径
      axialRatio = 0;
    } else if (coilIndex >= totalCoils - deadCoilsTop) {
      // 顶部死圈：用小端直径
      axialRatio = 1;
    } else {
      // 活动圈：线性过渡
      const activeIndex = coilIndex - deadCoilsBottom + localT; // 在活动圈段内的索引
      const activeSpan = Math.max(1e-6, totalCoils - deadCoilsBottom - deadCoilsTop);
      axialRatio = Math.max(0, Math.min(1, activeIndex / activeSpan));
    }

    const meanDiameter = getMeanDiameterAtRatio(
      largeMeanDiameter,
      smallMeanDiameter,
      axialRatio
    );
    const radius = (meanDiameter / 2) * scale;

    // 角度：每圈转一圈，塌圈其实仍保持一圈，只是高度变小
    const theta = 2 * Math.PI * coilPos;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);
    const y = height;

    const p = new THREE.Vector3(x, y, z);
    points.push(p);

    // 每进入一个新 coilIndex 记录一次该圈的特征数据
    if (coilIndex !== lastRecordedCoil) {
      const isCollapsed = coilIndex < collapsedCoils;
      const localPitch = compressedPitches[coilIndex];

      // 简化局部刚度（真正计算交给分析模块）
      const kLocal = Math.pow(wireDiameter, 4) / (8 * Math.pow(meanDiameter, 3));

      coilData.push({
        index: coilIndex,
        meanDiameter,
        height: h0, // 该圈起始高度（未缩放）
        pitch: localPitch,
        localSpringRate: kLocal,
        isCollapsed,
      });

      lastRecordedCoil = coilIndex;
    }
  }

  // --- 5. 按塌圈比例拆分 collapsed / active 方便着色 --------------------
  const collapsedRatio = collapsedCoils / totalCoils;
  const splitIndex = Math.floor(totalSamples * collapsedRatio);

  const collapsedPoints = splitIndex > 1 ? points.slice(0, splitIndex + 1) : [];
  const activePoints = splitIndex > 0 ? points.slice(Math.max(splitIndex - 1, 0)) : points;

  return {
    points,
    coilData,
    collapsedPoints,
    activePoints,
    collapsedRatio,
  };
}

/**
 * Generate closed ground end geometry
 * 生成并紧磨平端几何
 */
function generateGroundEndGeometry(
  centerPoint: THREE.Vector3,
  radius: number,
  wireRadius: number,
  isBottom: boolean,
  scale: number
): THREE.TubeGeometry | null {
  // Create a flat arc for the ground end
  const arcPoints: THREE.Vector3[] = [];
  const arcAngle = Math.PI * 0.8; // 80% of a full turn for ground end
  const numPoints = 20;
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const angle = t * arcAngle;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = centerPoint.y;
    
    arcPoints.push(new THREE.Vector3(x, y, z));
  }
  
  if (arcPoints.length < 2) return null;
  
  const curve = new THREE.CatmullRomCurve3(arcPoints);
  return new THREE.TubeGeometry(curve, numPoints, wireRadius, 12, false);
}

/**
 * Build complete conical spring geometry
 * 构建完整的锥形弹簧几何
 */
export function buildConicalSpringGeometry(
  params: ConicalSpringParams
): ConicalSpringGeometry {
  const { wireDiameter, endType, scale } = params;
  
  // Generate centerline
  const { points, coilData, collapsedPoints, activePoints, collapsedRatio } = 
    generateConicalSpringCenterline(params);
  
  const wireRadius = (wireDiameter / 2) * scale;
  
  // Create main body curve
  const bodyCurve = new THREE.CatmullRomCurve3(points);
  const bodyGeometry = new THREE.TubeGeometry(
    bodyCurve,
    points.length - 1,
    wireRadius,
    16,
    false
  );
  
  // Create collapsed section geometry
  let collapsedGeometry: THREE.TubeGeometry | null = null;
  if (collapsedPoints.length >= 2) {
    const collapsedCurve = new THREE.CatmullRomCurve3(collapsedPoints);
    collapsedGeometry = new THREE.TubeGeometry(
      collapsedCurve,
      collapsedPoints.length - 1,
      wireRadius,
      16,
      false
    );
  }
  
  // Create active section geometry
  let activeGeometry: THREE.TubeGeometry | null = null;
  if (activePoints.length >= 2) {
    const activeCurve = new THREE.CatmullRomCurve3(activePoints);
    activeGeometry = new THREE.TubeGeometry(
      activeCurve,
      activePoints.length - 1,
      wireRadius,
      16,
      false
    );
  }
  
  // Create ground end geometries (partial arcs for visual reference)
  let bottomEndGeometry: THREE.TubeGeometry | null = null;
  let topEndGeometry: THREE.TubeGeometry | null = null;
  
  // Calculate radii at ends
  const largeMeanDiameter = params.largeOuterDiameter - wireDiameter;
  const smallMeanDiameter = params.smallOuterDiameter - wireDiameter;
  const largeRadius = (largeMeanDiameter / 2) * scale;
  const smallRadius = (smallMeanDiameter / 2) * scale;
  
  // Calculate min/max Y for clipping
  const minY = points.length > 0 ? points[0].y : 0;
  const maxY = points.length > 0 ? points[points.length - 1].y : 0;
  
  // Grind depth: typically 30% of wire diameter for good flat surface
  const grindDepth = wireRadius * 0.6; // 30% of wire diameter
  
  // Total height before grinding
  const rawHeight = maxY - minY;
  
  // Create clipping planes for ground ends
  // Note: Clipping planes work in world coordinates, but we apply them
  // BEFORE the group transform, so they use local coordinates
  let clipPlanes: { bottom: THREE.Plane; top: THREE.Plane } | null = null;
  let endDiscs: ConicalSpringGeometry['endDiscs'] = null;
  
  if (endType === 'closed_ground') {
    // Bottom plane: normal pointing up (+Y), clips below grindDepth from bottom
    const bottomPlane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -(minY + grindDepth)
    );
    
    // Top plane: normal pointing down (-Y), clips above (maxY - grindDepth)
    const topPlane = new THREE.Plane(
      new THREE.Vector3(0, -1, 0),
      maxY - grindDepth
    );
    
    clipPlanes = { bottom: bottomPlane, top: topPlane };
    
    // End disc positions - these are in LOCAL coordinates (relative to group)
    // The group will be offset by -totalHeight/2, so we need positions relative to minY
    endDiscs = {
      bottomPosition: minY + grindDepth,  // Just above the clip plane
      topPosition: maxY - grindDepth,      // Just below the clip plane
      largeRadius: largeRadius + wireRadius,  // Outer radius at bottom
      smallRadius: smallRadius + wireRadius,  // Outer radius at top
      wireRadius,
    };
  }
  
  // Total height is the raw height (we'll handle clipping visually)
  const totalHeight = rawHeight;
  
  return {
    bodyGeometry,
    bottomEndGeometry,
    topEndGeometry,
    collapsedGeometry,
    activeGeometry,
    totalHeight,
    wireRadius,
    collapsedRatio,
    clipPlanes,
    endDiscs,
  };
}

// ================================================================
// Non-linear Spring Rate Calculation
// ================================================================

export interface ConicalSpringRateResult {
  /** Initial spring rate at free length (N/mm) */
  initialSpringRate: number;
  /** Current spring rate at deflection (N/mm) */
  currentSpringRate: number;
  /** Force at current deflection (N) */
  currentForce: number;
  /** Array of force-deflection points for curve */
  forceDeflectionCurve: { deflection: number; force: number; springRate: number }[];
  /** Solid height (mm) */
  solidHeight: number;
  /** Maximum deflection before solid (mm) */
  maxDeflection: number;
  /** Number of collapsed coils at current deflection */
  collapsedCoils: number;
}

/**
 * Calculate non-linear spring rate for conical spring
 * 计算锥形弹簧的非线性刚度
 * 
 * Key insight: As the spring compresses, larger diameter coils collapse first,
 * leaving smaller diameter coils active. This increases the effective spring rate.
 * 
 * k_i = G * d^4 / (8 * Dm_i^3 * 1)  for each coil
 * 1/k_total = Σ(1/k_i) for series springs
 */
export function calculateConicalSpringRate(
  params: {
    wireDiameter: number;
    largeOuterDiameter: number;
    smallOuterDiameter: number;
    freeLength: number;
    activeCoils: number;
    shearModulus: number; // G in MPa
  },
  currentDeflection: number = 0
): ConicalSpringRateResult {
  const {
    wireDiameter: d,
    largeOuterDiameter,
    smallOuterDiameter,
    freeLength: L0,
    activeCoils: Na,
    shearModulus: G,
  } = params;

  // Mean diameters
  const D1 = largeOuterDiameter - d; // Large mean diameter
  const D2 = smallOuterDiameter - d; // Small mean diameter
  
  // Calculate individual coil properties
  const coilRates: number[] = [];
  const coilHeights: number[] = [];
  const coilDiameters: number[] = [];
  
  // Pitch for active coils (assuming closed ground ends)
  const deadCoils = 2; // 1 at each end
  const activeHeight = L0 - deadCoils * d;
  const pitch = activeHeight / Na;
  
  for (let i = 0; i < Na; i++) {
    // Coil position ratio (0 = bottom/large, 1 = top/small)
    const ratio = i / (Na - 1);
    
    // Mean diameter at this coil
    const Dm = D1 + (D2 - D1) * ratio;
    coilDiameters.push(Dm);
    
    // Height of this coil from bottom
    const height = d + i * pitch; // Start after bottom dead coil
    coilHeights.push(height);
    
    // Spring rate for this single coil
    // k = G * d^4 / (8 * Dm^3 * 1)
    const k = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * 1);
    coilRates.push(k);
  }
  
  // Calculate solid height
  const solidHeight = (Na + deadCoils) * d;
  const maxDeflection = L0 - solidHeight;
  
  // Calculate initial spring rate (all coils active, series combination)
  // 1/k_total = Σ(1/k_i)
  let invKTotal = 0;
  for (const k of coilRates) {
    invKTotal += 1 / k;
  }
  const initialSpringRate = 1 / invKTotal;
  
  // Generate force-deflection curve
  const forceDeflectionCurve: { deflection: number; force: number; springRate: number }[] = [];
  const numPoints = 50;
  
  let collapsedCoils = 0;
  
  for (let i = 0; i <= numPoints; i++) {
    const deflection = (i / numPoints) * maxDeflection;
    
    // Determine which coils are collapsed
    // Larger diameter coils collapse first (they have lower spring rate)
    let collapsed = 0;
    let remainingDeflection = deflection;
    
    // Calculate deflection at which each coil collapses
    // A coil collapses when its pitch reduces to wire diameter
    for (let c = 0; c < Na; c++) {
      const coilDeflectionToCollapse = pitch - d;
      if (remainingDeflection >= coilDeflectionToCollapse && collapsed < Na - 1) {
        collapsed++;
        remainingDeflection -= coilDeflectionToCollapse;
      } else {
        break;
      }
    }
    
    // Calculate current spring rate with collapsed coils
    let invK = 0;
    for (let c = collapsed; c < Na; c++) {
      invK += 1 / coilRates[c];
    }
    const currentK = invK > 0 ? 1 / invK : coilRates[Na - 1];
    
    // Calculate force using progressive spring rate
    // For non-linear springs, we integrate: F = ∫k(δ)dδ
    // Simplified: use average spring rate up to this point
    let force = 0;
    let prevDeflection = 0;
    let prevCollapsed = 0;
    
    for (let j = 0; j <= i; j++) {
      const d_j = (j / numPoints) * maxDeflection;
      
      // Recalculate collapsed coils at this point
      let c_j = 0;
      let rd = d_j;
      for (let c = 0; c < Na; c++) {
        const ctc = pitch - d;
        if (rd >= ctc && c_j < Na - 1) {
          c_j++;
          rd -= ctc;
        } else {
          break;
        }
      }
      
      // Spring rate at this point
      let invK_j = 0;
      for (let c = c_j; c < Na; c++) {
        invK_j += 1 / coilRates[c];
      }
      const k_j = invK_j > 0 ? 1 / invK_j : coilRates[Na - 1];
      
      // Incremental force
      const dDeflection = d_j - prevDeflection;
      force += k_j * dDeflection;
      
      prevDeflection = d_j;
      prevCollapsed = c_j;
    }
    
    forceDeflectionCurve.push({
      deflection,
      force,
      springRate: currentK,
    });
    
    if (deflection <= currentDeflection) {
      collapsedCoils = collapsed;
    }
  }
  
  // Get current values
  const currentPoint = forceDeflectionCurve.find(p => p.deflection >= currentDeflection) 
    || forceDeflectionCurve[forceDeflectionCurve.length - 1];
  
  return {
    initialSpringRate,
    currentSpringRate: currentPoint.springRate,
    currentForce: currentPoint.force,
    forceDeflectionCurve,
    solidHeight,
    maxDeflection,
    collapsedCoils,
  };
}
