# DebugPerformanceBadge Component Specification

**Purpose:** Real-time performance monitoring overlay for development and QA.

---

## 1. Component Scope

The `DebugPerformanceBadge` is a **DEV-only** floating overlay that displays critical performance metrics in real-time during Preview and Audit mode development.

**Visibility Rules:**
- ✅ Visible when `process.env.NODE_ENV === 'development'`
- ✅ Visible when `?debug=perf` query param is present
- ❌ Never visible in production builds

---

## 2. Display Fields

### 2.1 Required Metrics

| Field | Label | Unit | Source |
|-------|-------|------|--------|
| Frame Rate | `FPS` | frames/sec | `useFrame` delta average |
| Frame Time | `Frame` | ms | Last frame duration |
| Vertex Count | `Verts` | k (thousands) | Scene traversal |
| Draw Calls | `Draws` | count | `renderer.info.render.calls` |
| Geometry Rebuilds | `Rebuilds` | /min | Custom counter |
| JS Heap | `Heap` | MB | `performance.memory.usedJSHeapSize` |

### 2.2 Optional Metrics (Expanded View)

| Field | Label | Unit |
|-------|-------|------|
| Triangles | `Tris` | k |
| Textures | `Tex` | count |
| Programs | `Progs` | count |
| GC Events | `GC` | /min |

---

## 3. Refresh Frequency

| Metric | Update Interval |
|--------|-----------------|
| FPS / Frame Time | Every frame (rolling 60-frame average) |
| Vertex Count | Every 500ms |
| Draw Calls | Every frame |
| Geometry Rebuilds | Every 1000ms (count since last update) |
| JS Heap | Every 2000ms |

---

## 4. Color Coding Rules

### 4.1 FPS Indicator

| FPS Range | Color | Status |
|-----------|-------|--------|
| ≥ 55 | `🟢 green-500` | Excellent |
| 45 – 54 | `🟡 yellow-500` | Acceptable |
| 30 – 44 | `🟠 orange-500` | Warning |
| < 30 | `🔴 red-500` | Critical |

### 4.2 Frame Time Indicator

| Frame Time | Color | Status |
|------------|-------|--------|
| ≤ 8 ms | `🟢 green-500` | Excellent |
| 9 – 16 ms | `🟡 yellow-500` | Acceptable |
| 17 – 33 ms | `🟠 orange-500` | Warning |
| > 33 ms | `🔴 red-500` | Critical |

### 4.3 Vertex Count Indicator

| Vertex Count | Color | Status |
|--------------|-------|--------|
| ≤ 60k | `🟢 green-500` | Target |
| 61k – 120k | `🟡 yellow-500` | Acceptable |
| 121k – 200k | `🟠 orange-500` | Warning |
| > 200k | `🔴 red-500` | Critical |

### 4.4 Heap Memory Indicator

| Heap Usage | Color | Status |
|------------|-------|--------|
| ≤ 150 MB | `🟢 green-500` | Healthy |
| 151 – 250 MB | `🟡 yellow-500` | Elevated |
| 251 – 400 MB | `🟠 orange-500` | Warning |
| > 400 MB | `🔴 red-500` | Critical |

### 4.5 Geometry Rebuilds Indicator

| Rebuilds/min | Color | Status |
|--------------|-------|--------|
| 0 – 2 | `🟢 green-500` | Normal |
| 3 – 10 | `🟡 yellow-500` | Frequent |
| 11 – 30 | `🟠 orange-500` | Excessive |
| > 30 | `🔴 red-500` | Critical (likely per-frame rebuild) |

---

## 5. Layout Specification

```
┌─────────────────────────────┐
│ 🎯 PERF                     │
├─────────────────────────────┤
│ FPS    ● 58                 │
│ Frame  ● 4.2 ms             │
│ Verts  ● 45k                │
│ Draws  ○ 12                 │
│ Heap   ● 142 MB             │
│ Rebuilds ● 0/min            │
└─────────────────────────────┘
```

**Position:** Bottom-right corner, 16px from edges  
**Size:** 180px width, auto height  
**Background:** `rgba(15, 23, 42, 0.90)` (slate-900 with opacity)  
**Font:** `font-mono`, 11px  
**Z-Index:** 9999

---

## 6. Interaction

| Action | Behavior |
|--------|----------|
| Click header | Toggle expanded/collapsed |
| Double-click | Reset all counters |
| Drag | Reposition badge |
| `Shift + P` | Toggle visibility |

---

## 7. Implementation Notes

```typescript
// Pseudo-structure
interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  vertexCount: number;
  drawCalls: number;
  geometryRebuilds: number;
  heapUsage: number;
}

// Use useFrame for per-frame metrics
// Use setInterval for periodic metrics
// Memoize color calculations
```

---

## 8. DoD Checklist

- [ ] Badge only renders in development/debug mode
- [ ] All required metrics are displayed
- [ ] Color coding follows specification
- [ ] Refresh rates match specification
- [ ] Badge is draggable and collapsible
- [ ] No performance impact from badge itself (< 0.5ms/frame)
- [ ] Keyboard shortcut works

---

> **This specification is normative for all DEV build performance overlays.**
