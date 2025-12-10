# 拉簧 Hook 类型开发计划

> 最后更新：2025-12-07
> 
> 本文档整合了 Cascade AI 和 OpenAI 的方案建议，形成最终开发计划。

---

## 零、方案对比与决策

### 原方案 vs OpenAI 建议

| 方面 | 原方案 | OpenAI 建议 | 最终决策 |
|------|--------|-------------|----------|
| **类型定义** | 分散在多个文件 | Stage 0: 统一到 `springTypes.ts` | ✅ 采纳 OpenAI |
| **HookBuilder 时机** | Stage 4（后期优化） | Stage 1（与数据流一起做） | ✅ 采纳 OpenAI |
| **验收标准** | 简单描述 | 具体可测试的条件 | ✅ 采纳 OpenAI |
| **阶段划分** | 4 个阶段 | 3 个阶段（更紧凑） | ✅ 采纳 OpenAI |

### OpenAI 建议的核心改进

1. **单一真相源（Single Source of Truth）**
   - 所有 Hook 类型定义收敛到 `springTypes.ts`
   - 避免字符串拼错 / 前后不一致的问题
   - 以后加新 Hook，只改**一个数组 + 一个 switch**

2. **HookBuilder 前置**
   - 在实现 Side Hook 之前，先把 Machine Hook 重构进 `HookBuilder.ts`
   - 避免每种 Hook 重写 Segment A + Bezier + clamp 半径的重复 bug
   - 新 Hook 类型只需定义 `HookSpec` 参数

3. **可测试的验收标准**
   - 每个阶段有明确的验收条件
   - 便于在 3D 视图中自测
   - 减少 debug 时间

### 最终阶段划分

```
Stage 0: 统一 Hook 类型定义（单一真相源）
    ↓
Stage 1: 打通数据流 + 抽象 HookBuilder（Machine Hook 重构）
    ↓
Stage 2: 实现 Side Hook（在 HookBuilder 框架下）
    ↓
Stage 3: 实现其他 Hook 类型（Extended, Crossover, Double Loop）
```

---

## 一、背景

拉簧（Extension Spring）的端钩有多种类型，每种类型的几何特征不同：

| Hook 类型 | 英文名 | 特征 |
|-----------|--------|------|
| 机器钩 | Machine Hook | 环平面包含轴线，环中心在轴线上 |
| 侧钩 | Side Hook | 环平面包含轴线，环中心在侧面 |
| 交叉钩 | Crossover Hook | 线材跨过弹簧中心 |
| 延长钩 | Extended Hook | 类似侧钩 + 延长段 |
| 双环钩 | Double Loop | 两个相邻的环 |

### ⚠️ 核心设计原则

> **所有 Hook 类型的拉力方向都必须沿着弹簧轴线！**
> 
> 这意味着：
> - 环平面必须包含弹簧轴线（`loopPlaneType: "axis-plane"`）
> - 环的开口方向朝向轴线方向
> - 不同 Hook 类型的区别在于**环中心位置**，而不是环平面方向
>
> 错误理解：Side Hook 的环平面垂直于轴线 ❌
> 正确理解：Side Hook 的环中心在侧面，但环平面仍包含轴线 ✅

---

## 二、当前状态

### ✅ 已完成
- Machine Hook 的 3D 几何实现
- 弹簧圈和拉钩之间的连接缺口修复

### ⚠️ 待完成
- Hook 类型数据流（计算页面 → 3D 可视化）
- Side Hook 几何实现
- 其他 Hook 类型

---

## 三、开发阶段

### Stage 0：统一 Hook 类型的"单一真相源"

**目标**：确保所有代码使用相同的 Hook 类型定义

**修改文件**：
```
src/lib/springTypes.ts
```

**代码**：
```typescript
// springTypes.ts
export const EXTENSION_HOOK_TYPES = [
  "machine",
  "side",
  "crossover",
  "extended",
  "doubleLoop",
] as const;

export type ExtensionHookType = (typeof EXTENSION_HOOK_TYPES)[number];

export const EXTENSION_HOOK_LABELS: Record<ExtensionHookType, { en: string; zh: string }> = {
  machine: { en: "Machine Hook", zh: "机器钩" },
  side: { en: "Side Hook", zh: "侧钩" },
  crossover: { en: "Crossover Hook", zh: "交叉钩" },
  extended: { en: "Extended Hook", zh: "延长钩" },
  doubleLoop: { en: "Double Loop", zh: "双环钩" },
};
```

**验收标准**：
- [ ] `ExtensionHookType` 类型定义完成
- [ ] Calculator 表单使用 `ExtensionHookType`
- [ ] `ExtensionDesignMeta` 包含 `hookType: ExtensionHookType`
- [ ] `ExtensionSpringParams` 包含 `hookType: ExtensionHookType`

---

### Stage 1：打通数据流 + 抽象 HookBuilder

**目标**：
1. 确保 `hookType` 从计算页面正确传递到 3D 可视化
2. 将现有 Machine Hook 逻辑抽象到 `HookBuilder.ts`

**修改文件**：
```
src/lib/stores/springSimulationStore.ts
src/components/calculators/ExtensionCalculator.tsx
src/components/three/ExtensionSpringVisualizer.tsx
src/lib/spring3d/HookBuilder.ts (新建)
src/lib/spring3d/extensionSpringGeometry.ts
```

#### 1.1 创建 HookBuilder.ts

```typescript
// src/lib/spring3d/HookBuilder.ts

import * as THREE from "three";
import type { ExtensionHookType } from "@/lib/springTypes";

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
  // axis-plane: 环平面包含轴线 (Machine Hook)
  // orthogonal-plane: 环平面垂直于轴线 (Side Hook)
  
  // 环中心位置
  centerMode: "on-axis" | "radial-offset";
  // on-axis: 环中心在轴线上 (Machine Hook)
  // radial-offset: 环中心在弹簧外侧 (Side Hook)
  
  // 间隙参数 (以 wireDiameter 为单位)
  axialGapFactor: number;              // 轴向间隙 = factor * wireDiameter
  radialOffsetFactor: number;          // 径向偏移 = factor * wireDiameter
  
  // 过渡段参数
  transitionDirection: "tangent" | "radial";
  // tangent: 沿切线方向过渡 (Machine Hook)
  // radial: 沿径向方向过渡 (Side Hook)
  
  // 延长段 (仅 Extended Hook)
  hasExtendedLeg: boolean;
  extendedLegLengthFactor: number;     // 延长段长度 = factor * meanDiameter
}

/**
 * 获取 Hook 规格
 */
export function getHookSpec(hookType: ExtensionHookType): HookSpec {
  switch (hookType) {
    case "machine":
      return {
        type: "machine",
        loopCount: 1,
        loopAngleDeg: 270,
        loopStartAngle: -Math.PI / 2,
        loopPlaneType: "axis-plane",
        centerMode: "on-axis",
        axialGapFactor: 1.2,
        radialOffsetFactor: 0,
        transitionDirection: "tangent",
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };
      
    case "side":
      return {
        type: "side",
        loopCount: 1,
        loopAngleDeg: 270,
        loopStartAngle: Math.PI,
        loopPlaneType: "orthogonal-plane",
        centerMode: "radial-offset",
        axialGapFactor: 1.2,
        radialOffsetFactor: 1.2,
        transitionDirection: "tangent",
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };
      
    case "crossover":
      return {
        type: "crossover",
        loopCount: 1,
        loopAngleDeg: 300,
        loopStartAngle: -Math.PI / 2,
        loopPlaneType: "axis-plane",
        centerMode: "on-axis",
        axialGapFactor: 1.4,
        radialOffsetFactor: 0,
        transitionDirection: "tangent", // 需要额外的扭转逻辑
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };
      
    case "extended":
      return {
        type: "extended",
        loopCount: 1,
        loopAngleDeg: 270,
        loopStartAngle: Math.PI,
        loopPlaneType: "orthogonal-plane",
        centerMode: "radial-offset",
        axialGapFactor: 1.2,
        radialOffsetFactor: 1.2,
        transitionDirection: "tangent",
        hasExtendedLeg: true,
        extendedLegLengthFactor: 0.5, // 延长段 = 0.5 * meanDiameter
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
        transitionDirection: "tangent",
        hasExtendedLeg: false,
        extendedLegLengthFactor: 0,
      };
      
    default:
      // 默认使用 Machine Hook
      return getHookSpec("machine");
  }
}

/**
 * 构建 Hook 中心线
 * 
 * @param whichEnd - "start" 或 "end"
 * @param spec - Hook 规格
 * @param bodyHelixPts - 弹簧体中心线点
 * @param meanRadius - 平均半径
 * @param wireDiameter - 线径
 * @returns Hook 中心线点数组
 */
export function buildHookCenterline(
  whichEnd: "start" | "end",
  spec: HookSpec,
  bodyHelixPts: THREE.Vector3[],
  meanRadius: number,
  wireDiameter: number
): THREE.Vector3[] {
  // TODO: 实现通用的 Hook 中心线构建逻辑
  // 根据 spec 中的参数决定：
  // 1. 轴向方向 (axisDir)
  // 2. 径向方向 (radialDir)
  // 3. 切向方向 (tangentDir)
  // 4. Hook 环中心位置
  // 5. Hook 环平面基向量 (u, v)
  // 6. 过渡段 (Segment A + Bezier)
  // 7. Hook 环圆弧
  
  return [];
}
```

#### 1.2 修改 ExtensionDesignMeta

```typescript
// src/lib/stores/springSimulationStore.ts

import type { ExtensionHookType } from "@/lib/springTypes";

export interface ExtensionDesignMeta {
  type: "extension";
  wireDiameter: number;
  outerDiameter: number;
  activeCoils: number;
  bodyLength: number;
  freeLengthInsideHooks: number;
  shearModulus: number;
  springRate: number;
  initialTension: number;
  hookType: ExtensionHookType;  // ← 新增
}
```

#### 1.3 修改 ExtensionSpringVisualizer

```typescript
// src/components/three/ExtensionSpringVisualizer.tsx

const params: ExtensionSpringParams = {
  wireDiameter,
  outerDiameter,
  activeCoils,
  bodyLength,
  freeLengthInsideHooks,
  currentExtension: currentDeflection,
  scale,
  hookType: extensionDesign.hookType,  // ← 新增
};
```

**验收标准**：

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 数据流打通 | 在 `ExtensionSpringVisualizer.tsx` 添加 `console.log(params.hookType)` | 选择不同 hookType 时，控制台输出对应值 |
| Machine Hook 不变 | 选择 Machine Hook，对比修改前后的 3D 形状 | 形状完全一致，无任何变化 |
| HookBuilder 创建 | 检查文件 `src/lib/spring3d/HookBuilder.ts` | 包含 `HookSpec` 接口和 `getHookSpec` 函数 |
| 类型安全 | TypeScript 编译 | 无类型错误 |

**具体验收步骤**：

1. **数据流测试**：
   ```typescript
   // 在 ExtensionSpringVisualizer.tsx 的 useMemo 中添加
   console.log("hookType:", extensionDesign.hookType);
   ```
   - 打开浏览器控制台
   - 在 Calculator 中切换 Hook 类型
   - 确认控制台输出正确的 hookType 值

2. **回归测试**：
   - 截图修改前的 Machine Hook 3D 形状
   - 完成重构后，对比截图
   - 确认形状完全一致

3. **代码检查**：
   ```bash
   npm run build  # 确认无编译错误
   ```

---

### Stage 2：实现 Side Hook

**目标**：在 HookBuilder 框架下实现 Side Hook

**修改文件**：
```
src/lib/spring3d/HookBuilder.ts
```

**Side Hook 几何特征**：
```
┌─────────────────────────────────────┐
│  Machine Hook          Side Hook   │
│                                     │
│       ○                    ○        │
│      /│\                  /         │
│     / │ \                /          │
│    /  │  \              ○───────    │
│   ○   │   ○            /            │
│   │   │   │           /             │
│   │   │   │          ○              │
│   │   │   │          │              │
│   ├───┼───┤          │              │
│   │   │   │          │              │
│                                     │
│  环平面包含轴线      环平面垂直于轴线  │
│  环中心在轴线上      环中心在侧面      │
└─────────────────────────────────────┘
```

**验收标准**：

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 环平面正交 | 从正视图（Front View）观察 | Hook 环与弹簧端面正交，环像贴在一边 |
| 环在侧面 | 从侧视图（Side View）观察 | Hook 在弹簧外径的侧面，不在轴线方向 |
| 过渡段不凹进 | 检查所有过渡点半径 | r >= meanRadius（已有 clamp 逻辑） |
| 路径光滑 | 旋转 3D 视图观察 | 过渡处无明显折角，曲线平滑 |
| 与参考图对比 | 对比 `docs/images/side-hooks.jpg` | 形状与参考图一致 |

**具体验收步骤**：

1. **视图测试**：
   - 点击 "Front View" 按钮，确认环平面法向量 ≈ Z
   - 点击 "Side View" 按钮，确认环在弹簧外侧

2. **几何检查**：
   ```typescript
   // 可选：在 buildHookCenterline 中添加断言
   transitionPts.forEach(pt => {
     const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
     console.assert(r >= meanRadius * 0.95, "过渡点凹进弹簧体内");
   });
   ```

3. **参考图对比**：
   - 打开 `docs/images/side-hooks.jpg`
   - 对比 3D 渲染结果

---

### Stage 3：实现其他 Hook 类型

按优先级逐个实现：

| 优先级 | Hook 类型 | 难度 | 预计时间 | 参考图 |
|--------|-----------|------|----------|--------|
| 1 | Extended Hook | ⭐⭐⭐ | 2-3 小时 | `docs/images/extended-hooks.jpg` |
| 2 | Crossover Hook | ⭐⭐⭐⭐ | 3-4 小时 | `docs/images/cross-over-center-hooks.jpg` |
| 3 | Double Loop | ⭐⭐⭐⭐ | 4-5 小时 | 需另外收集 |

**每个类型的验收标准**：

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 形状正确 | 与参考图对比 | 形状与参考图一致 |
| 过渡平滑 | 旋转 3D 视图 | 无缺口，无折角 |
| 回归测试 | 切换回 Machine Hook | Machine Hook 形状不变 |
| 类型安全 | `npm run build` | 无编译错误 |

#### Extended Hook 特殊验收

- [ ] 有明显的延长直线段
- [ ] 延长段长度约为 0.5 * meanDiameter
- [ ] 环在延长段末端

#### Crossover Hook 特殊验收

- [ ] 线材跨过弹簧中心
- [ ] 有扭转过渡段
- [ ] 环平面包含轴线（与 Machine Hook 类似）

#### Double Loop 特殊验收

- [ ] 有两个相邻的环
- [ ] 两环之间平滑过渡
- [ ] 总弧度约 340°

---

## 四、代码结构

### 最终目标结构

```
src/lib/spring3d/
├── index.ts
├── compressionSpringGeometry.ts
├── extensionSpringGeometry.ts      # 调用 HookBuilder
├── torsionSpringGeometry.ts
├── conicalSpringGeometry.ts
└── HookBuilder.ts                   # 新增：所有 Hook 逻辑集中在这里
    ├── HookSpec 接口
    ├── getHookSpec(hookType) 函数
    └── buildHookCenterline(whichEnd, spec, ...) 函数
```

### 扩展新 Hook 类型的步骤

1. 在 `springTypes.ts` 的 `EXTENSION_HOOK_TYPES` 数组中添加新类型
2. 在 `HookBuilder.ts` 的 `getHookSpec()` 中添加新类型的规格
3. 如果新类型有特殊逻辑，在 `buildHookCenterline()` 中添加分支
4. 测试并验收

---

## 五、参考资料

### Hook 类型参考图片

参考图片已保存在 `docs/images/` 目录：

| 文件 | Hook 类型 | 描述 |
|------|-----------|------|
| `machine-hooks.jpg` | Machine Hook | 3/4 圈弯出，弯曲半径较小 |
| `cross-over-center-hooks.jpg` | Cross Over Center | 最后一圈提起并扭转到中心 |
| `side-hooks.jpg` | Side Hook | 最后一圈直接弯出到侧面 |
| `extended-hooks.jpg` | Extended Hook | 类似 Side Hook + 延长段 |

### 几何特征详解

#### Machine Hook（机器钩）
```
制造方式：弯出 3/4 圈
几何特征：
- 环平面包含弹簧轴线
- 弯曲半径较小
- 环中心在轴线上
- 过渡段沿切线方向

     ○ ← 环在轴线方向
    /│\
   / │ \
  ○  │  ○
  │  │  │
  ├──┼──┤ ← 弹簧体
```

#### Cross Over Center Hook（交叉钩）
```
制造方式：提起最后一圈 + 扭转到中心
几何特征：
- 环平面包含弹簧轴线
- 弯曲半径较大（比 Machine Hook 大）
- 线材跨过弹簧中心
- 需要额外的扭转过渡

     ○ ← 环在轴线方向
    ╱ ╲
   ╱   ╲ ← 扭转过渡
  ○─────○
  │     │
  ├─────┤ ← 弹簧体
```

#### Side Hook（侧钩）
```
制造方式：直接弯出最后一圈
几何特征：
- ⚠️ 重要：环平面仍然包含弹簧轴线（拉力方向沿轴线）
- 环中心在弹簧外径的侧面（与 Machine Hook 的区别）
- 弹簧体相对于钩偏移
- 最经济的制造方式

        ↑ 拉力方向（沿轴线）
        │
        ○ ← 环开口朝上
       ╱ ╲
      ╱   ╲
     ○     │
     │     │ ← 环中心在侧面
     │
   弹簧体
```

**关键实现要点**：
- `loopPlaneType: "axis-plane"` - 环平面包含轴线（保证拉力方向正确）
- `centerMode: "radial-offset"` - 环中心沿径向偏移（在侧面）
- 这与 Machine Hook 的区别仅在于环中心位置，不是环平面方向

#### Extended Hook（延长钩）
```
制造方式：类似 Side Hook + 延长段
几何特征：
- ⚠️ 重要：环平面仍然包含弹簧轴线（拉力方向沿轴线）
- 环中心在弹簧外径的侧面
- 有额外的直线延长段
- 用于短体长钩内距
- 最贵的制造方式

      │
      ○ ← 环
     /
    / ← 延长段
   /
  ○
  │
  │ ← 弹簧体
```

### 技术参考

- [Extension Spring Hook Types - Acxess Spring](https://www.acxesspring.com/tension-extension-spring-hook-types.html)
- [Understanding Extension Spring End Types - WB Jones](https://www.springsfast.com/products/extension-springs/understanding-extension-spring-end-types/)
- [Guide to Spring End Types - Century Spring](https://www.centuryspring.com/resources/spring-end-types)

---

## 六、注意事项

### 避免的错误

1. **不要在多个地方定义 Hook 类型字符串** - 使用 `ExtensionHookType`
2. **不要为每种 Hook 重写 Segment A + Bezier 逻辑** - 使用 `HookBuilder`
3. **不要忘记半径 clamp** - 防止过渡段凹进弹簧体内
4. **不要忘记跳过重复点** - 避免 CatmullRomCurve3 产生异常

### 测试检查清单

每次修改后，检查以下内容：
- [ ] Machine Hook 仍然正常工作
- [ ] 弹簧圈和拉钩之间无缺口
- [ ] 过渡段平滑
- [ ] 两端的钩都正常显示
- [ ] 选择不同 Hook 类型时，3D 形状正确变化

---

## 七、更新日志

| 日期 | 更新内容 |
|------|----------|
| 2025-12-07 上午 | 创建文档，完成 Machine Hook，修复连接缺口 |
| 2025-12-07 下午 | 整合 OpenAI 建议，添加方案对比分析，完善验收标准 |

---

## 八、附录：OpenAI 原始建议

> 以下是 OpenAI 的原始建议，供参考。

### 建议 1：Stage 0 - 单一真相源

```typescript
// springTypes.ts
export const EXTENSION_HOOK_TYPES = [
  "machine",
  "side",
  "overCenter",
  "extended",
  "doubleLoop",
] as const;

export type ExtensionHookType = (typeof EXTENSION_HOOK_TYPES)[number];
```

### 建议 2：HookBuilder 前置

```typescript
// HookBuilder.ts
export interface HookSpec {
  type: ExtensionHookType;
  loopCount: 1 | 2;
  loopPlaneType: "axis-plane" | "offset-plane";
  loopAngleDeg: number;
  loopStartAngle: number;
  centerMode: "on-axis" | "radial-offset";
  centerOffsetRadial: number;
  axialGap: number;
  hasExtendedLeg: boolean;
  extendedLegLength: number;
}

export function buildHookCenterline(
  whichEnd: "start" | "end",
  spec: HookSpec,
  bodyHelixPts: THREE.Vector3[],
  meanRadius: number,
  wireDiameter: number,
): THREE.Vector3[] {
  // 通用逻辑
}
```

### 建议 3：验收标准

**Stage 1 验收**：
- 在 Calculator 选择不同 hookType，3D 视图里 params.hookType 确实发生变化
- hookType = "machine" 时，当前 Machine Hook 形状完全不变

**Stage 2 验收**：
- Hook 环与弹簧端面正交
- 过渡段不凹进弹簧体内
- 整体路径光滑

---

## 八、经验教训总结（2025-12-07）

> 在实现 Machine Hook 和 Side Hook 的过程中，我们遇到了多个几何和工程问题。
> 以下是总结的经验教训，**必须在实现其他 Hook 类型时遵守**。

### 🔴 不可违反的刚性几何约束（Hard Rules）

| # | 约束 | 说明 |
|---|------|------|
| 1 | **钩的受力方向 = 弹簧轴线** | 拉力沿 +Z / −Z，钩是轴向受拉构件 |
| 2 | **钩弧平面包含 Z 轴** | 钩弧平面法向量 = `radialDir`（从轴线指向线圈端点） |
| 3 | **钩弧平面与弹簧圈正交** | 从正面看：coil 是圆孔，hook 是竖着的 C / U |
| 4 | **连接点必须相切** | 钩弧起点的切线方向 = 螺旋的真实 3D 切线方向 |
| 5 | **过渡段不允许向 coil 内凹** | 半径约束：`r_transition ≥ meanRadius` |

> ⚠️ **如果任何一条被破坏 —— 钩一定是假的**

### 🟡 关键几何公式

#### 1. 钩弧平面基向量
```typescript
// 钩弧平面包含 tangentDir 和 springAxisDir
// 法向量 = cross(tangentDir, springAxisDir) = radialDir
const arcU = tangentDir.clone();  // XY 平面内的切向
const arcV = springAxisDir.clone();  // Z 轴方向
```

#### 2. 螺旋切线方向（用于相切连接）
```typescript
// 真实的 3D 螺旋切线（保留 Z 分量！）
const helixTangent3D = endPos.clone().sub(prevPos).normalize();

// ❌ 错误：清零 Z 分量
// tangentApprox.z = 0;  // 这会导致连接处有折角
```

#### 3. 计算弧的起始角度（使连接点相切）
```typescript
// 弧的切线方向 = -sin(θ)*arcU + cos(θ)*arcV
// 要求：弧起点切线 = helixTangent3D
const sinTheta0 = -helixTangent3D.dot(arcU);
const cosTheta0 = helixTangent3D.dot(arcV);
const arcStartAngle = Math.atan2(sinTheta0, cosTheta0);
```

#### 4. 计算弧中心（使弧起点在 endPos）
```typescript
const arcStartPos = new THREE.Vector3()
  .addScaledVector(arcU, sideHookRadius * Math.cos(arcStartAngle))
  .addScaledVector(arcV, sideHookRadius * Math.sin(arcStartAngle));

// 弧中心 = endPos - arcStartPos
const hookArcCenter = endPos.clone().sub(arcStartPos);
```

### 🟢 拉簧线圈几何

#### 拉簧在自由状态（Δx=0）时线圈紧密贴合

```typescript
// ❌ 错误：使用 bodyLength
// const extendedLength = (bodyLength + currentExtension) * scale;

// ✅ 正确：使用 solidBodyLength
const solidBodyLength = activeCoils * wireDiameter;
const extendedLength = (solidBodyLength + currentExtension) * scale;
```

| 状态 | pitch |
|------|-------|
| Δx = 0 | ≈ wireDiameter（线圈贴紧） |
| Δx > 0 | 逐渐增大 |

### 🟢 初始状态

```typescript
// 拉簧初始化时
currentDeflection: 0,  // 从 0 开始，线圈紧密贴合
currentLoad: designMeta.initialTension,  // 初始载荷 = 初张力
```

### 🔵 常见错误及修正

| 错误 | 原因 | 修正 |
|------|------|------|
| 钩弧是水平的（躺着） | 用 `axisDir` 当平面法向量 | 用 `radialDir` 当平面法向量 |
| 连接处有折角 | `helixTangent3D` 的 Z 分量被清零 | 保留 Z 分量 |
| 一端正确一端错误 | Start Hook 的切线方向计算错误 | 两端都用 `endPos - prevPos` |
| 线圈有间隙（Δx=0 时） | 使用 `bodyLength` 而不是 `solidBodyLength` | 使用 `activeCoils * wireDiameter` |
| 初始状态有伸长 | `currentDeflection` 默认值是 `maxDeflection / 2` | 改为 `0` |

### 🔵 调试技巧

1. **检查钩弧平面**：从正面（沿 Z 轴）看，钩应该是竖着的 C / U 形
2. **检查连接点**：放大连接处，确认没有折角
3. **检查线圈间隙**：Δx = 0 时，线圈应该紧密贴合
4. **检查两端对称性**：Start Hook 和 End Hook 应该对称

### 🔵 实现新 Hook 类型的检查清单

- [ ] 钩弧平面法向量 = `radialDir`
- [ ] 钩弧平面基向量 = `tangentDir` + `springAxisDir`
- [ ] 使用 `helixTangent3D`（保留 Z 分量）计算起始角度
- [ ] 弧起点正好在 `endPos`
- [ ] Start Hook 和 End Hook 的切线方向都是"离开弹簧体"的方向
- [ ] 过渡段不凹进弹簧体内
- [ ] 使用 `solidBodyLength` 计算 `extendedLength`
