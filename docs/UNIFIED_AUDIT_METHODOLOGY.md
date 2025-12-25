# Unified Engineering Audit Methodology (V1.0)
# 平台级统一工程审计方法论

## 1. Overview / 概述
The Unified Engineering Audit Framework establishes a standardized "Operating System" for spring engineering evaluation. It shifts the paradigm from simple "Pass/Fail" results to a comprehensive, explanation-driven audit that reflects real-world engineering failures.

统一工程审计框架为弹簧工程评估建立了一个标准化的“操作系统”。它将范式从简单的“通过/失败”结果转变为全面的、以解释为驱动的审计，反映了真实的工程失效模式。

## 2. Core Philosophy / 核心哲学: "Delta-First"
All engineering audits are driven by the primary engineering variable (the "Delta"):
- **Linear Springs (Axial/Compression):** Driven by displacement **Δx**.
- **Torsion Springs:** Driven by angular rotation **Δθ**.

所有的工程审计都由主要的工程变量（“Delta”）驱动：
- **线性弹簧（轴向/压缩）：** 由位移 **Δx** 驱动。
- **扭转弹簧：** 由角度旋转 **Δθ** 驱动。

## 3. Governing Failure Mode / 主失效模式
The overall status of a spring design is determined by the most critical failure mode, prioritized as follows:
1. **Stress (应力):** Material yielding or fatigue failure.
2. **Loadcase (工况):** Physical travel exceeding limits (coil bind, flattening).
3. **Stability (稳定):** Buckling or geometric instability.
4. **Geometry (几何):** Manufacturing constraints (Spring Index, clearance).

## 4. Audit Logic / 审计逻辑
Each audit module produces a standardized `AuditResult`:
- **PASS (Green):** Ratio < 60%. Design is safe with high margin.
- **WARN (Orange):** 60% ≤ Ratio ≤ 80%. Design is functional but requires attention.
- **FAIL (Red):** Ratio > 80%. Critical failure risk.

### Stress Audit
$\text{Ratio} = \frac{\sigma_{max}}{\sigma_{allowable}} \times 100\%$
$\text{Safety Factor} = \frac{\sigma_{allowable}}{\sigma_{max}}$

### Loadcase Audit
$\text{Ratio} = \frac{\Delta x_{used}}{\Delta x_{available}} \times 100\%$

## 5. UI Standardization / UI 标准化
The `EngineeringAuditCard` provides a premium, transparent view of the audit logic.
- **Header:** Platform Standard V1.0 Badge.
- **Central Dial:** Governing Failure Mode, Ratio, and Safety Factor.
- **Breakdown:** Color-coded status indicators for Geometry, Loadcase, Stress, and Stability.
- **Details:** Detailed metrics showing computed values vs. allowable limits.
