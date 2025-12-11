# 数据一致性待办事项

> 创建日期：2025-12-07
> 状态：✅ 已完成（2025-12-10 更新）

## 问题概述

计算页面的数据需要正确传递到力–位移测试页面和工程分析页面，确保数据一致性。

---

## 2025-12-10 更新：全局 Store 统一

### 问题：TorsionCalculator 和 ConicalCalculator 未调用 setDesign

**已修复**：所有四个计算器现在都调用 `setDesign` 保存设计到全局 store。

| 计算器 | setDesign 调用 | 状态 |
|--------|----------------|------|
| CompressionCalculator | ✅ onSubmit 中调用 | 已有 |
| ExtensionCalculator | ✅ saveAndNavigateToCad 中调用 | 已有 |
| TorsionCalculator | ✅ onSubmit 中调用 | **新增** |
| ConicalCalculator | ✅ onSubmitLinear 中调用 | **新增** |

---

## 待修复问题

### 1. ✅ Force Tester 页面未读取 hookType（已修复）

**文件**：`src/app/tools/force-tester/page.tsx`

**问题**：第 365 行硬编码了 `hookType: "machine"`

```typescript
// 当前代码（错误）
hookType: "machine", // TODO: Get from URL params when hookType selector is added
```

**修复方案**：
```typescript
// 从 URL 读取 hookType
const urlHookType = searchParams.get("hookType") as ExtensionHookType | null;

// 在 designMeta 中使用
hookType: urlHookType || "machine",
```

---

### 2. ✅ Calculator 的 forceTesterUrl 未包含 hookType（已修复）

**文件**：`src/components/calculators/ExtensionCalculator.tsx`

**问题**：第 70-84 行的 `forceTesterUrl` 未包含 `hookType` 参数

```typescript
// 当前代码（不完整）
const forceTesterUrl = useMemo(() => {
  const values = form.getValues();
  const params = new URLSearchParams({
    type: "extension",
    OD: values.outerDiameter.toString(),
    d: values.wireDiameter.toString(),
    // ... 缺少 hookType
  });
  return `/tools/force-tester?${params.toString()}`;
}, [form]);
```

**修复方案**：
```typescript
const params = new URLSearchParams({
  type: "extension",
  OD: values.outerDiameter.toString(),
  d: values.wireDiameter.toString(),
  Na: values.activeCoils.toString(),
  Lb: values.bodyLength.toString(),
  Li: values.freeLengthInsideHooks.toString(),
  G: values.shearModulus.toString(),
  F0: values.initialTension.toString(),
  dxMax: values.workingDeflection.toString(),
  hookType: values.hookType,  // ← 添加这行
});
```

---

### 3. ✅ Analysis 页面已正确处理 hookType

**文件**：`src/app/tools/analysis/page.tsx`

**状态**：已正确实现

- 第 108-109 行：从 URL 读取 `hookType`
- 第 257 行：传递给 `initializeExtension`

---

## 完整的数据流检查清单

### Extension Spring 参数

| 参数 | Calculator → Force Tester | Calculator → Analysis | Force Tester 使用 | Analysis 使用 |
|------|---------------------------|----------------------|-------------------|---------------|
| `outerDiameter` (OD) | ✅ | ✅ | ✅ | ✅ |
| `wireDiameter` (d) | ✅ | ✅ | ✅ | ✅ |
| `activeCoils` (Na) | ✅ | ✅ | ✅ | ✅ |
| `bodyLength` (Lb) | ✅ | ✅ | ✅ | ✅ |
| `freeLengthInsideHooks` (Li) | ✅ | ❌ | ✅ | ❌ |
| `shearModulus` (G) | ✅ | ❌ | ✅ | 使用默认值 |
| `initialTension` (F0/Fi) | ✅ | ✅ | ✅ | ✅ |
| `workingDeflection` (dxMax) | ✅ | ✅ | ✅ | ✅ |
| `hookType` | ❌ 缺失 | ✅ | ❌ 硬编码 | ✅ |

---

## 修复优先级

1. **高优先级**：`hookType` 传递（影响 3D 可视化）
2. **中优先级**：`freeLengthInsideHooks` 传递到 Analysis
3. **低优先级**：`shearModulus` 传递到 Analysis（当前使用默认值 79300）

---

## 测试步骤

修复后，按以下步骤验证：

1. 在 Calculator 页面选择 **Side Hook**
2. 点击 **Send to Force Tester**
3. 验证 Force Tester 页面的 3D 模型显示 Side Hook（不是 Machine Hook）
4. 点击 **Send to Engineering Analysis**
5. 验证 Analysis 页面的 3D 模型也显示 Side Hook

---

## 相关文件

- `src/components/calculators/ExtensionCalculator.tsx`
- `src/app/tools/force-tester/page.tsx`
- `src/app/tools/analysis/page.tsx`
- `src/lib/stores/springSimulationStore.ts`
