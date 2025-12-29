# Quality Chart UX Spec

## 1. 目标与非目标 (Goals & Non-Goals)

### 目标
- **默认视图服务于 QC Gate 决策**：是否可进入 Analysis（PASS/WARN/FAIL）。
- **交互重心**：异常 (Violations)、子组 (Subgroups)、规则 (Rules)，避免“点云挖矿”。
- **大数据支持**：支持 10k~200k 点级数据的可用交互（按策略降级）。

### 非目标
- 不把 “Raw point（每条样本）” 作为默认可 hover 对象。
- 不在 Chart 层做复杂工程计算（SPC 统计由 analysis 层提供）。

---

## 2. 核心心智模型 (3-Layer Interaction Model)

### Layer A: Gate View (默认 Default)
- **交互对象**：控制线 (CL/UCL/LCL)、违规点 (Violations)、违规段 (Run/Trend)、规则摘要。
- **禁止**：对所有通过 (PASS) 的原始点进行逐点 tooltip。
- **视觉**：
    - PASS 点：低对比度、小点或透明。
    - FAIL/WARN 点：高对比度、大点、醒目颜色。

### Layer B: Subgroup View (Xbar-R / Xbar-S)
- **交互对象**：子组点（均值/极差）。
- **操作**：
    - Hover 显示子组统计量 (Mean, Range)。
    - Click 展开子组内部详情（5个样本表格）。

### Layer C: Raw View (Debug Mode - Opt-in)
- **定位**：仅用于 debug/追溯。
- **开关**：显式 toggle "Show Raw Points" / "Debug View"。
- **能力**：启用后允许原始点 tooltip、brush selection、zoom。

---

## 3. 状态机与行为 (Status Behavior)

图表必须反映整体 QC Gate 状态：

| Gate Status | 行为规则 |
| :--- | :--- |
| **BLOCKED_RED** (FAIL > 0) | 默认仅高亮 FAIL 相关点/段；Raw Tooltip 关闭。 |
| **READY_AMBER** (WARN > 0) | 允许分析，但顶部显示 Warning 摘要 + "View violations". |
| **READY_GREEN** (All PASS) | 弱化点云，强调稳定性与能力 (Cp/Cpk/Trend). |

---

## 4. Tooltip 规范 (Tooltip Spec)

### Default Gate View Tooltip
- **触发**：仅 Violations 和 Control Lines。
- **禁止**：无语义的 index (e.g., `i=6722`)。
- **内容示例**：
    ```text
    Violation: Beyond UCL
    Subgroup: #1342 (or Timestamp)
    Value: 115.4
    Rule: WE1 (Western Electric 1)
    Action: [Investigate] [Exclude]
    ```

### Subgroup Tooltip
- **内容**：
    ```text
    Subgroup #1342
    Mean = 123.4
    Range = 8.2
    Out of control: YES (Rule WE1)
    ```

### Raw View Tooltip
- **触发**：仅在 Debug Mode 开启时允许。
- **内容**：RowID (PartNo/DateTime), Value, Normalized Value, Mapping Info.

---

## 5. 视觉编码 (Visual Encoding)

| 状态 | 样式建议 |
| :--- | :--- |
| **PASS** | 灰色/浅蓝色，透明度 0.3~0.5，半径 2px (Recharts: `dot={false}` or small). |
| **WARN** | 黄色描边或侧边条，半径 3px。 |
| **FAIL** | 红色实心 (#EF4444)，半径 4px+，Z-index 最高。 |
| **CL** | 灰色/中性色细实线/虚线。 |
| **UCL/LCL** | 红色/警示色虚线。 |

---

## 6. 性能策略 (Performance Strategy)

- **≤ 20k 点**：可渲染 Raw Points，但 Tooltip 按层级限制。
- **20k ~ 200k**：
    - **PASS 点**：采用聚合 (Binning) 或 LTTB 降采样。
    - **Violations**：**全量渲染**，必须保真。
- **≥ 200k**：强制 Binning，Raw 仅在 Zoom 后局部渲染。

---

## 7. 交互控件 (Controls)

- **View Mode Switch**: [ Gate View | Debug View ]
- **Timeline/Brush**: 仅在 Raw/Subgroup 模式下可用。
- **Filter**: "Show only violations" (Toggle).

---
