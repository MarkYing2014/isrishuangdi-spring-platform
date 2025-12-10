# 弹簧公式测试策略

> 创建日期：2025-12-07
> 状态：待实施

## 测试目标

确保所有弹簧工程计算公式的正确性，为工程师提供可靠的计算结果。

---

## 1. 测试方法

### 1.1 与手册标准值对比

使用权威手册中的示例进行验证：

| 来源 | 内容 |
|------|------|
| **SMI Handbook of Spring Design** | 标准计算示例 |
| **DIN EN 13906-1/2/3** | 欧洲弹簧设计标准 |
| **Mechanical Springs (Wahl)** | 经典弹簧设计教材 |

### 1.2 与商业软件对比

与已验证的商业软件结果进行交叉验证：

- **Spring Calculator Pro**
- **SolidWorks Spring Simulation**
- **ANSYS Spring Module**

### 1.3 边界条件测试

测试极端参数下的公式行为：

- 最小/最大旋绕比 (C = 4 ~ 16)
- 极细/极粗线径
- 极少/极多圈数

### 1.4 单位一致性测试

确保所有计算结果的单位正确：

| 参数 | 单位 |
|------|------|
| 刚度 (压/拉/锥) | N/mm |
| 刚度 (扭) | N·mm/deg |
| 应力 | MPa |
| 力 | N |
| 扭矩 | N·mm |
| 位移 | mm |
| 角度 | deg |

---

## 2. 测试用例设计

### 2.1 压缩弹簧标准用例

```
参数:
- 线径 d = 2.0 mm
- 中径 Dm = 16.0 mm
- 有效圈数 Na = 8
- 材料: 琴钢丝 (G = 79300 MPa)

预期结果:
- 刚度 k = 4.84 N/mm
- 旋绕比 C = 8
- Wahl系数 Kw = 1.184
```

### 2.2 扭转弹簧标准用例

```
参数:
- 线径 d = 2.0 mm
- 中径 Dm = 20.0 mm
- 有效圈数 Na = 6
- 材料: 琴钢丝 (E = 207000 MPa)

预期结果:
- 刚度 k_rad = 2555.56 N·mm/rad
- 刚度 k_deg = 44.6 N·mm/deg
- 曲率修正系数 Ki = 1.08
```

### 2.3 关键公式验证点

#### 扭簧刚度常数验证
```typescript
// 正确: 使用 10.8
k_rad = E × d⁴ / (10.8 × Dm × Na)

// 错误: 使用 64 (会导致刚度偏小约 6 倍)
k_wrong = E × d⁴ / (64 × Dm × Na)

// 验证: k_correct / k_wrong ≈ 64/10.8 ≈ 5.93
```

---

## 3. 自动化测试

### 3.1 安装测试框架

```bash
npm install -D vitest @vitest/ui
```

### 3.2 配置 vitest

在 `vite.config.ts` 或 `vitest.config.ts` 中添加：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

### 3.3 运行测试

```bash
# 运行所有测试
npm run test

# 运行公式测试
npm run test -- springFormulas

# 带 UI 的测试
npm run test:ui
```

### 3.4 测试文件位置

```
src/lib/engine/__tests__/
├── springFormulas.test.ts      # 公式验证测试
├── stressCalculation.test.ts   # 应力计算测试
├── fatigueAnalysis.test.ts     # 疲劳分析测试
└── dynamicsAnalysis.test.ts    # 动力学分析测试
```

---

## 4. 回归测试

### 4.1 公式变更检测

每次修改计算公式后，自动运行测试确保：

1. 新公式产生预期结果
2. 其他公式未受影响
3. 单位一致性保持

### 4.2 CI/CD 集成

在 GitHub Actions 中添加测试步骤：

```yaml
- name: Run Formula Tests
  run: npm run test -- --coverage
```

---

## 5. 手动验证清单

### 5.1 压缩弹簧

- [ ] 刚度公式 k = Gd⁴/(8Dm³Na)
- [ ] Wahl 系数 Kw = (4C-1)/(4C-4) + 0.615/C
- [ ] 剪切应力 τ = Kw × 8FDm/(πd³)
- [ ] 固高 Ls = Nt × d

### 5.2 拉伸弹簧

- [ ] 刚度公式（同压簧）
- [ ] 初拉力 F = F₀ + k×Δx
- [ ] 钩部应力计算

### 5.3 扭转弹簧

- [ ] 刚度公式 k_rad = Ed⁴/(10.8×Dm×Na) ⚠️ 关键
- [ ] 弯曲应力 σ = Ki × 32M/(πd³)
- [ ] 曲率修正系数 Ki = (4C²-C-1)/(4C(C-1))
- [ ] 固有频率 fn = (1/2π)√(k_θ/J)

### 5.4 锥形弹簧

- [ ] 初始刚度公式
- [ ] 非线性刚度变化
- [ ] 最大应力在大端

---

## 6. 测试报告模板

### 公式验证报告

| 公式 | 预期值 | 实际值 | 误差 | 状态 |
|------|--------|--------|------|------|
| 压簧刚度 | 4.84 N/mm | 4.84 N/mm | 0% | ✅ |
| 扭簧刚度 | 44.6 N·mm/deg | 44.6 N·mm/deg | 0% | ✅ |
| Wahl系数(C=8) | 1.184 | 1.184 | 0% | ✅ |

---

## 7. 参考资料

1. **SMI Handbook of Spring Design** - Spring Manufacturers Institute
2. **DIN EN 13906-1:2013** - 圆柱螺旋压缩弹簧
3. **DIN EN 13906-2:2013** - 圆柱螺旋拉伸弹簧
4. **DIN EN 13906-3:2014** - 圆柱螺旋扭转弹簧
5. **Mechanical Springs (Wahl, 1963)** - 经典弹簧设计教材
6. **Shigley's Mechanical Engineering Design** - 机械设计教材
