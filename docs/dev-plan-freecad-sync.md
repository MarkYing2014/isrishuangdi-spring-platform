# FreeCAD Python 脚本与 Three.js 同步开发计划

## 目标

确保 FreeCAD 生成的 CAD 模型与 Three.js 前端预览在几何上完全一致，包括：
- 中心线算法
- 节距计算
- 端面处理
- 钩环/腿部几何

## 已完成 ✅

### 压缩弹簧 (Compression Spring)

| 文件 | 状态 |
|------|------|
| Three.js: `src/lib/spring3d/compressionSpringGeometry.ts` | ✅ 参考 |
| FreeCAD: `cad-worker/freecad/run_export.py` → `make_compression_spring()` | ✅ 已同步 |

**同步的算法：**
- 死圈计算: `deadCoils = totalCoils - activeCoils`
- 死圈节距: `pitchDead = wireDiameter`
- 有效圈节距: `(freeLength - deadHeight) / activeCoils`
- 端面磨平深度: `0.3 * wireDiameter`
- 中心线采样: 800 点
- Z 位置: 3 段式 (底部死圈 / 有效圈 / 顶部死圈)

---

## 待完成 📋

### 1. 拉伸弹簧 (Extension Spring)

| 文件 | 状态 |
|------|------|
| Three.js: `src/lib/spring3d/extensionSpringGeometry.ts` | 📖 待参考 |
| FreeCAD: `cad-worker/freecad/run_export.py` → `make_extension_spring()` | ⏳ 待同步 |

**需要同步的特性：**
- [ ] 密绕螺旋体 (coil-to-coil contact)
- [ ] 初始张力区域
- [ ] 钩环类型 (HookBuilder)
  - [ ] Machine Hook
  - [ ] Crossover Hook
  - [ ] Side Loop
  - [ ] Extended Hook
  - [ ] Double Loop
- [ ] 钩环 Bezier 过渡曲线
- [ ] 钩环半径限制 (防止凹进)

**参考文件：**
- `src/lib/spring3d/extensionSpringGeometry.ts`
- `src/lib/cad/hookParams.ts`
- `src/lib/cad/HookBuilder.ts`

---

### 2. 扭转弹簧 (Torsion Spring)

| 文件 | 状态 |
|------|------|
| Three.js: `src/lib/spring3d/torsionSpringGeometry.ts` | 📖 待参考 |
| FreeCAD: `cad-worker/freecad/run_export.py` → `make_torsion_spring()` | ⏳ 待同步 |

**需要同步的特性：**
- [ ] 螺旋体节距计算
- [ ] 腿部类型
  - [ ] 直腿 (Straight)
  - [ ] 弯腿 (Bent)
  - [ ] 短钩 (Short Hook)
- [ ] 腿部角度
- [ ] 腿部 Bezier 过渡
- [ ] 旋向 (左旋/右旋)

**参考文件：**
- `src/lib/spring3d/torsionSpringGeometry.ts`

---

### 3. 锥形弹簧 (Conical Spring)

| 文件 | 状态 |
|------|------|
| Three.js: `src/lib/spring3d/conicalSpringGeometry.ts` | 📖 待参考 |
| FreeCAD: `cad-worker/freecad/run_export.py` → `make_conical_spring()` | ⏳ 待同步 |

**需要同步的特性：**
- [ ] 变径螺旋线 (半径插值方式)
- [ ] 节距计算 (等节距 vs 变节距)
- [ ] 端面处理
- [ ] 嵌套能力 (telescoping)

**参考文件：**
- `src/lib/spring3d/conicalSpringGeometry.ts`
- `src/lib/geometry/conicalSpringCurve.ts`

---

## 开发规范

### 1. 算法同步原则

```
Three.js (TypeScript)          FreeCAD (Python)
─────────────────────          ─────────────────
generateCenterline()    →      generate_xxx_centerline()
createClipPlanes()      →      ground_ends cutting
buildHookGeometry()     →      build_hook_geometry()
```

### 2. 参数命名对照

| Three.js | FreeCAD Python | 说明 |
|----------|----------------|------|
| `wireDiameter` | `wire_diameter` 或 `d` | 线径 |
| `meanDiameter` | `mean_diameter` 或 `Dm` | 中径 |
| `activeCoils` | `active_coils` 或 `Na` | 有效圈数 |
| `totalCoils` | `total_coils` 或 `Nt` | 总圈数 |
| `freeLength` | `free_length` 或 `L0` | 自由长度 |
| `currentDeflection` | `current_deflection` | 当前变形量 |

### 3. 测试验证

每个弹簧类型同步后，需要验证：

1. **几何一致性**: 导出 STL 后在 Three.js 中加载，与原生预览对比
2. **尺寸精度**: 关键尺寸误差 < 0.01mm
3. **端面处理**: 磨平位置与 Three.js clipping planes 一致

### 4. 文件结构

```
cad-worker/
└── freecad/
    ├── run_export.py           # 主脚本 (所有弹簧类型)
    ├── compression_spring.py   # 压缩弹簧模块 (可选拆分)
    ├── extension_spring.py     # 拉伸弹簧模块 (可选拆分)
    ├── torsion_spring.py       # 扭转弹簧模块 (可选拆分)
    ├── conical_spring.py       # 锥形弹簧模块 (可选拆分)
    └── hook_builder.py         # 钩环构建器 (与 HookBuilder.ts 同步)
```

---

## 优先级

1. **P0 - 已完成**: 压缩弹簧
2. **P1 - 高优先级**: 拉伸弹簧 (钩环是关键特性)
3. **P2 - 中优先级**: 扭转弹簧
4. **P3 - 低优先级**: 锥形弹簧

---

## 时间估算

| 任务 | 预计工时 |
|------|----------|
| 拉伸弹簧 + HookBuilder | 4-6 小时 |
| 扭转弹簧 | 2-3 小时 |
| 锥形弹簧 | 2-3 小时 |
| 测试验证 | 2 小时 |
| **总计** | **10-14 小时** |

---

## 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2025-12-08 | 创建开发计划，完成压缩弹簧同步 |
