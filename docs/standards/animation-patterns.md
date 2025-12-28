# Animation Patterns Reference

**Purpose:** Allowed and forbidden animation patterns for each spring type.

---

## 1. Overview

This document defines the specific animation behaviors that are **allowed** and **forbidden** for each spring visualization type. All implementations must conform to these patterns.

---

## 2. Variable Pitch Compression Spring

### 2.1 Animation Driver

| Property | Specification |
|----------|---------------|
| SSOT | `previewStrokeMm` |
| Range | `[0, gapTotal]` |
| Direction | Compression only (axial) |

### 2.2 Allowed Patterns

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| ✅ Progressive gap closure | Active coils close sequentially by stiffness | `animateSegmentsByStrokeProgressive()` |
| ✅ Position buffer update | Modify existing vertex positions | `positionAttr.set(...)` + `needsUpdate` |
| ✅ Per-segment tracking | Track each segment's compressed state | `segmentStates[]` |
| ✅ Dead coil rigidity | Dead coils maintain zero compression | `if (gap <= 0) compression = 0` |
| ✅ Stress color update | Update vertex colors based on utilization | `colorAttr.set(...)` |

### 2.3 Forbidden Patterns

| Pattern | Reason | Alternative |
|---------|--------|-------------|
| ❌ Uniform scale | Unrealistic, hides progressive contact | Use per-coil compression |
| ❌ Per-frame geometry create | Causes GC churn, FPS drops | Update buffers in-place |
| ❌ Multiple animation drivers | Breaks SSOT principle | Single `strokeMm` source |
| ❌ Geometry disposal | Memory thrashing | Reuse geometry |
| ❌ Re-discretization per frame | CPU intensive | Discretize once, animate positions |

### 2.4 Visual Requirements

```
At 30% stroke:
┌─────────────────────────────────────┐
│  Coil 1 (soft)   ████░░░░░ closed   │
│  Coil 2 (soft)   ███░░░░░░ closing  │
│  Coil 3 (med)    █░░░░░░░░ starting │
│  Coil 4 (stiff)  ░░░░░░░░░ open     │
│  Dead coil       ========= rigid    │
└─────────────────────────────────────┘
```

---

## 3. Arc Spring (DMF Spring)

### 3.1 Animation Driver

| Property | Specification |
|----------|---------------|
| SSOT | `alphaDeg` (working angle) |
| Range | `[alpha0, alphaC]` (unloaded to solid) |
| Motion | Angular rotation about arc center |

### 3.2 Allowed Patterns

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| ✅ Arc angle interpolation | Smooth transition between free and solid angle | `lerpAngle(alpha0, alphaC, t)` |
| ✅ Torque curve display | Show M(α) relationship | Static curve + marker |
| ✅ Centerline recalculation | Update arc path geometry | `createArcCenterline()` |
| ✅ Tube follow centerline | TubeGeometry follows new path | `setFromPoints(centerline)` |
| ✅ Coil compression visual | Visible pitch reduction | Update helix parameters |

### 3.3 Forbidden Patterns

| Pattern | Reason | Alternative |
|---------|--------|-------------|
| ❌ Linear stroke animation | Arc springs rotate, not translate | Use angular animation |
| ❌ Ignore arc curvature | Core geometric property | Always show curved path |
| ❌ Skip hysteresis | Engineering requirement | Show loading/unloading difference |
| ❌ New geometry per frame | Performance | Update existing buffers |

### 3.4 Visual Requirements

```
Arc Spring Animation States:
┌────────────────────────────────────────┐
│  Free Angle (α₀)     ╭─────────╮       │
│                      │   ○○○   │       │
│                      ╰─────────╯       │
├────────────────────────────────────────┤
│  Working Angle (αwork) ╭───────╮       │
│                        │ ○○○○  │       │
│                        ╰───────╯       │
├────────────────────────────────────────┤
│  Solid Angle (αC)      ╭─────╮         │
│                        │█████│         │
│                        ╰─────╯         │
└────────────────────────────────────────┘
```

---

## 4. Torsional Spring System (Spring Pack)

### 4.1 Animation Driver

| Property | Specification |
|----------|---------------|
| SSOT | `thetaDeg` (system rotation angle) |
| Range | `[0, thetaHardSystemDeg]` |
| Projection | `strokeMm = thetaRad × Ri` per stage |

### 4.2 Allowed Patterns

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| ✅ Per-stage projection | Each stage compresses based on own radius | `stroke_i = theta × R_i` |
| ✅ Staged engagement | Later stages engage after earlier ones solid | Check `theta_start` |
| ✅ Carrier rotation visual | Show physical rotation | Rotate carrier mesh |
| ✅ Curve marker update | Move playhead on charts | Update reference line X |
| ✅ Interleaved spring layout | Springs alternate by stage | Angular offset per group |

### 4.3 Forbidden Patterns

| Pattern | Reason | Alternative |
|---------|--------|-------------|
| ❌ Recompute system curves | CPU intensive, curves are static | Cache and memoize |
| ❌ Ignore engagement angles | Physically incorrect | Respect `theta_start` |
| ❌ Uniform stage compression | Stages have different R values | Per-stage calculation |
| ❌ Skip bottleneck display | Audit requirement | Always show governing limit |
| ❌ Multiple theta sources | Breaks SSOT | Single `thetaDeg` driver |

### 4.4 Visual Requirements

```
System Animation at θ = 8°:
┌────────────────────────────────────────┐
│  Stage 1 (θ_start=0°)                  │
│    R=85mm → s=11.9mm → compressing ███ │
├────────────────────────────────────────┤
│  Stage 2 (θ_start=4°)                  │
│    R=85mm → s=5.9mm → compressing ██   │
├────────────────────────────────────────┤
│  Stage 3 (θ_start=6°)                  │
│    R=90mm → s=3.1mm → starting █       │
└────────────────────────────────────────┘
```

---

## 5. Regular Compression Spring

### 5.1 Animation Driver

| Property | Specification |
|----------|---------------|
| SSOT | `previewStrokeMm` |
| Range | `[0, L_free - L_solid]` |
| Motion | Axial compression |

### 5.2 Allowed Patterns

| Pattern | Description |
|---------|-------------|
| ✅ Uniform pitch reduction | All active coils compress equally |
| ✅ Position buffer update | Modify existing vertices |
| ✅ Stress color gradient | Show τ/τ_allow distribution |
| ✅ Dead coil rigidity | End coils maintain position |

### 5.3 Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| ❌ Scale transform | Distorts wire diameter |
| ❌ Per-frame geometry create | GC churn |
| ❌ Ignore dead coils | Incorrect physics |

---

## 6. Common Rules (All Spring Types)

### 6.1 Universal Allowed

| Pattern | Reason |
|---------|--------|
| ✅ `BufferAttribute.needsUpdate = true` | Proper Three.js update signal |
| ✅ `useMemo` for geometry creation | Prevent unnecessary rebuilds |
| ✅ `useFrame` for animation loop | Synchronized with render cycle |
| ✅ Shader uniform updates | GPU-efficient color changes |

### 6.2 Universal Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `new BufferGeometry()` per frame | Memory leak, GC pressure |
| ❌ `geometry.dispose()` per frame | Unnecessary cleanup overhead |
| ❌ Non-memoized geometry in render | Creates new objects each render |
| ❌ Blocking main thread > 16ms | Causes frame drops |
| ❌ `setInterval` for animation | Use requestAnimationFrame |

---

## 7. Quick Reference Matrix

| Spring Type | Driver | Per-Frame Allowed | Per-Frame Forbidden |
|-------------|--------|-------------------|---------------------|
| Compression | strokeMm | Buffer positions | New geometry |
| Variable Pitch | strokeMm | Buffer positions, per-segment | New geometry, uniform scale |
| Extension | strokeMm | Buffer positions | New geometry |
| Torsion | angleDeg | Buffer positions | New geometry |
| Arc | alphaDeg | Buffer positions, centerline | New geometry |
| Torsional System | thetaDeg | Marker positions, carrier rotation | Curve recompute, new geometry |

---

## 8. Compliance Checklist

For each new spring visualizer implementation:

- [ ] Single animation driver identified
- [ ] No per-frame geometry creation
- [ ] Buffer updates use `needsUpdate` flag
- [ ] Memoization applied to geometry creation
- [ ] Dead/rigid sections handled correctly
- [ ] Visual outcome matches specification
- [ ] FPS maintained at 55+ during animation

---

> **All visualizer implementations must conform to these patterns.**
