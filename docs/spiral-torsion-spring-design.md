# Spiral Torsion Spring Design Documentation
# 螺旋扭转弹簧设计说明文档

## Reference / 参考文献
**Handbook of Spring Design - Spiral Torsion Springs**

---

## 1. Overview / 概述

Spiral torsion springs (also known as clock springs or power springs) store energy through bending of flat strip material wound in a spiral configuration. Unlike helical torsion springs that use round wire, spiral torsion springs use flat rectangular strip material.

螺旋扭转弹簧（也称为发条弹簧或动力弹簧）通过弯曲卷绕成螺旋形的扁平带材来储存能量。与使用圆线的螺旋扭转弹簧不同，螺旋扭转弹簧使用扁平矩形带材。

---

## 2. Engineering Formulas / 工程公式

### 2.1 Torque Formula / 扭矩公式

$$M = \frac{\pi E b t^3 \theta_{rev}}{6L}$$

Where / 其中:
- **M** = Torque / 扭矩 (N·mm)
- **E** = Elastic modulus / 弹性模量 (MPa)
- **b** = Strip width / 带材宽度 (mm)
- **t** = Strip thickness / 带材厚度 (mm)
- **θ_rev** = Rotation angle in revolutions / 转角（圈数）
- **L** = Active length of strip / 有效带材长度 (mm)

### 2.2 Spring Rate / 扭转刚度

$$k_{rev} = \frac{\pi E b t^3}{6L} \quad \text{[N·mm/revolution]}$$

$$k_{deg} = \frac{k_{rev}}{360} \quad \text{[N·mm/degree]}$$

### 2.3 Bending Stress / 弯曲应力

$$\sigma = \frac{6M}{bt^2} \quad \text{[MPa]}$$

**Important / 重要**: The primary stress in spiral torsion springs is **bending stress** (σ), NOT shear stress (τ).

螺旋扭转弹簧的主应力是**弯曲应力** (σ)，而非剪切应力 (τ)。

---

## 3. Angle Semantics / 角度语义

### 3.1 Angle Definitions / 角度定义

| Parameter | Description (EN) | 描述 (ZH) |
|-----------|------------------|-----------|
| **preloadAngle (θ₀)** | Pre-twist at installation | 安装时的预扭转角度 |
| **minWorkingAngle (θ_min)** | Additional rotation from installed position (minimum) | 相对安装位置的额外转角（最小） |
| **maxWorkingAngle (θ_max)** | Additional rotation from installed position (maximum) | 相对安装位置的额外转角（最大） |
| **closeOutAngle (θ_co)** | Angle at which coils begin to contact | 圈间开始接触的角度 |

### 3.2 Total Angle Calculation / 总角度计算

$$\theta_{total} = \theta_0 + \theta_{working}$$

The working angles (θ_min, θ_max) are **additional rotations** from the installed (preloaded) position.

工作角度 (θ_min, θ_max) 是相对于安装（预紧）位置的**额外转角**。

---

## 4. Close-out Behavior / 贴合行为

### 4.1 Linear Region / 线性区

The torque-angle relationship is **linear only up to the close-out angle** (typically ~1 revolution = 360°).

扭矩-角度关系**仅在 close-out 角度之前是线性的**（通常约 1 圈 = 360°）。

### 4.2 Beyond Close-out / 超过 Close-out

**Per Handbook of Spring Design:**
- Beyond close-out, torque increases rapidly and non-linearly
- The Handbook does NOT provide a reliable post-close-out model
- This calculator does NOT compute torque beyond the close-out limit

**根据 Handbook of Spring Design:**
- 超过 close-out 后，扭矩急剧非线性增加
- 手册没有提供可靠的 close-out 后模型
- 本计算器不计算超过 close-out 限制的扭矩

### 4.3 Operating Status / 操作状态

| Status | Condition | Description |
|--------|-----------|-------------|
| **SAFE** | θ ≤ 0.8 × θ_co | Linear operating range / 线性工作区 |
| **WARNING** | 0.8 × θ_co < θ ≤ θ_co | Approaching close-out / 接近贴合区 |
| **EXCEEDED** | θ > θ_co | Close-out exceeded / 已超过贴合点 |

---

## 5. Allowable Stress / 许用应力

### 5.1 Design Rules / 设计准则

| Rule | Formula | Description |
|------|---------|-------------|
| **0.45 × UTS** | σ_allow = 0.45 × UTS | Static bending (default) / 静态弯曲（默认） |
| **0.50 × YS** | σ_allow = 0.50 × (0.85 × UTS) | Yield strength criterion / 屈服强度准则 |
| **0.30 × UTS** | σ_allow = 0.30 × UTS | Conservative design / 保守设计 |
| **Custom** | User-defined | User override / 用户自定义 |

### 5.2 Traceability / 可追溯性

The calculator displays the source of σ_allow in the results:
```
σ_allow derived from: 0.45 × UTS (1860 MPa) = 837 MPa (经验默认，可配置)
```

This ensures engineering traceability and allows users to verify the design basis.

计算器在结果中显示 σ_allow 的来源，确保工程可追溯性，允许用户验证设计依据。

---

## 6. Correction Factors / 修正系数

### 6.1 End Condition Factor (C_end) / 端部条件系数

| Inner End | Outer End | C_end |
|-----------|-----------|-------|
| Fixed | Fixed | 1.0 |
| Fixed | Free/Guided | 0.9 |
| Free/Guided | Fixed | 0.9 |
| Free/Guided | Free/Guided | 0.8 |

### 6.2 Stress Concentration Factor (Kt) / 应力集中系数

| Condition | Kt |
|-----------|-----|
| Inner end fixed | 1.2 |
| Other | 1.0 |

---

## 7. Energy Storage / 能量储存

$$U = T_0 \cdot \theta_{rad} + \frac{1}{2} k_{rad} \cdot \theta_{rad}^2 \quad \text{[N·mm = mJ]}$$

Where:
- $k_{rad} = k_{deg} \times \frac{180}{\pi}$ (N·mm/rad)
- $\theta_{rad} = \theta_{deg} \times \frac{\pi}{180}$ (rad)

---

## 8. Validation Checks / 验证检查

### 8.1 Geometry Validation / 几何验证

| Check | Condition | Severity |
|-------|-----------|----------|
| Outer > Inner diameter | Do > Di | Warning |
| Clearance check | Do > Di + 2t | Warning |
| Aspect ratio low | b/t < 3 | Warning (buckling risk) |
| Aspect ratio high | b/t > 20 | Warning (forming difficulty) |

### 8.2 Angle Unit Guard / 角度单位防护

| Check | Condition | Severity |
|-------|-----------|----------|
| Very small angle | θ ≤ 5° | Warning (may be rev input) |
| Very large angle | θ > 720° | Error (may be rev input) |

---

## 9. API Reference / API 参考

### 9.1 Engine Module / 引擎模块

```typescript
import { 
  calculateSpiralTorsionSpring,
  type SpiralTorsionSpringInput,
  type SpiralTorsionSpringResult,
  type OperatingStatus,
  type AllowableStressRule,
} from "@/lib/engines/spiralTorsionSpringEngine";
```

### 9.2 Store Integration / Store 集成

```typescript
import { 
  useSpringDesignStore,
  type SpiralTorsionGeometry,
  isSpiralTorsionDesign,
} from "@/lib/stores/springDesignStore";
```

---

## 10. Revision History / 修订历史

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-13 | 1.0 | Initial release with PDF-compliant formulas |
| 2025-12-13 | 1.1 | Added allowable stress traceability |
| 2025-12-13 | 1.2 | Added operatingStatus and global store integration |

---

## 11. Engineering Verification / 工程验收

This implementation has been reviewed and verified against the **Handbook of Spring Design** with the following key points confirmed:

1. ✅ Torque formula: M = πEbt³θ_rev/(6L)
2. ✅ Stress type: Bending stress (σ), not shear (τ)
3. ✅ Close-out behavior: No post-close-out torque calculation
4. ✅ Allowable stress: Explicit, traceable, user-configurable
5. ✅ Operating status: SAFE/WARNING/EXCEEDED based on 0.8×θ_co threshold
6. ✅ Angle semantics: Working angles are additional rotation from installed position

**Final Review Status: PASSED**
