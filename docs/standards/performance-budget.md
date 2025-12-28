# Spring Platform Performance Budget

**Applies to:** Preview Mode / Audit Mode (Engineering UI)

---

## 1. Scope & Intent

This document defines the mandatory performance budgets for all Spring Platform visualizers and audit interfaces, including:

- Compression / Variable Pitch / Die / Torsion / Arc / System-level views
- Preview Mode (interactive engineering visualization)
- Audit Mode (PPAP / PSW / IATF-aligned review UI)

The goal is to ensure the system is:

> **Smooth in Preview, Trustworthy in Audit, and Economical in Production.**

This budget is **enforced**, not advisory.

---

## 2. Mode Definitions

### 2.1 Preview Mode

**Purpose**  
Real-time engineering intuition and interactive validation.

**Primary priority**
- Visual smoothness
- Low interaction latency
- Predictable animation behavior

### 2.2 Audit Mode

**Purpose**  
Manufacturer-defensive, explainable, and standard-aligned conclusions.

**Primary priority**
- Deterministic results
- Fast access to PASS / WARN / FAIL
- Clear governing limits and traceability

---

## 3. User-Visible Performance Targets (KPI)

### 3.1 Preview Mode KPIs

| Metric | Budget |
|--------|--------|
| Frame Rate | ≥ 50 FPS (target 60 FPS) |
| Interaction latency (slider / play) | ≤ 50 ms (95th percentile) |
| First interactive render | ≤ 1.5 s (desktop), ≤ 2.5 s (mid-tier laptop) |
| Continuous animation | No FPS decay over 30 s |

**Definition of "interactive"**  
Camera rotation + spring visible + animation controllable.

---

### 3.2 Audit Mode KPIs

| Metric | Budget |
|--------|--------|
| First meaningful paint (Summary) | ≤ 800 ms |
| System / Stage curve render | ≤ 200 ms |
| Playhead → 3D sync latency | ≤ 80 ms (95th percentile) |
| HTML report generation | ≤ 2.0 s |
| PDF report generation | ≤ 6.0 s |

**First meaningful paint includes:**
- PASS / WARN / FAIL
- θ_safe_system
- Governing stage + governing limit code

---

## 4. Network Budget (Hard Limit)

### 4.1 Cold-Start Page Load (per session)

| Asset | Budget (gzip) |
|-------|---------------|
| Core JS bundle | ≤ 350 KB |
| 3D / Three.js chunks (lazy) | ≤ 450 KB |
| Fonts & icons | ≤ 150 KB |
| **Total initial transfer** | **≤ 1.2 MB** |

### 4.2 3D Assets

- ❌ No geometry downloaded over network
- ✔ All spring geometry must be runtime-generated
- Environment HDR (if used): ≤ 600 KB (Studio preset preferred)

**Absolute page transfer cap:**

> **≤ 2 MB per page load**

---

**DoD (Network)**
- Chrome DevTools → Network → "Transferred" ≤ 2 MB on cold load.
- No spring type introduces new static geometry assets.

---

## 5. CPU & Memory Budget

### 5.1 CPU (Main Thread)

| Operation | Budget |
|-----------|--------|
| Per-frame compute | ≤ 4 ms |
| Geometry rebuild (one-time) | ≤ 20 ms |
| Audit calculation pass | ≤ 30 ms |

❌ **Per-frame geometry creation or disposal is prohibited.**

---

### 5.2 Memory

| Resource | Budget |
|----------|--------|
| Vertices per spring mesh | ≤ 120k (target ≤ 60k) |
| BufferGeometry size | ≤ 8 MB per spring |
| Page JS heap peak | ≤ 250 MB |

**DoD (CPU & Memory)**
- Continuous Play (30 s) shows no FPS decay.
- Chrome Performance shows no sustained GC churn.
- Geometry buffers are reused or updated in-place.

---

## 6. Animation Contract (Stroke-Driven SSOT)

### 6.1 Single Source of Truth

All animations must be driven by exactly one scalar:
- **Linear springs:** `previewStrokeMm`
- **Torsional systems:** `thetaDeg` → projected stroke

❌ **No secondary animation drivers allowed.**

---

### 6.2 Allowed Per-Frame Changes

| Allowed | Forbidden |
|---------|-----------|
| Update vertex buffer positions | Creating new geometry |
| Update shader uniforms | Disposing geometry per frame |
| Update playhead markers | Re-running full system solve |

---

### 6.3 Variable Pitch Specific Rules

- **Active coils** (pitch > wire diameter)  
  ✔ Gap closes progressively

- **Dead / solid coils** (pitch ≤ wire diameter)  
  ✔ Zero compression  
  ✔ Zero pitch change

- Visual outcome must clearly show **localized closure**, not uniform shortening.

**DoD (Variable Pitch)**
- At partial stroke (~30%), user can visually identify which coils are closing.
- Dead coils remain rigid throughout animation.
- Slider drag remains smooth without frame drops.

---

## 7. Audit Mode Rendering Priority

Audit Mode must render in the following order:

1. **Audit Summary**
   - Result badge
   - θ_safe_system
   - Governing stage + governing limit code

2. **System Curve**
   - θ_safe / θ_hard / θ_customer markers

3. **Stage Cards**
   - Utilization bars
   - Individual limits

4. **3D Explanation**
   - May be lazy-loaded
   - Must not block conclusions

**DoD (Audit)**
- User can read final audit conclusion within 1 second.
- 3D may load later but never delays PASS/FAIL.

---

## 8. Caching & Recompute Rules

- System curves are memoized by system hash
- Playhead movement:
  - ✔ Update marker only
  - ❌ Recompute system curves
- Report generation must reuse cached audit results

---

## 9. Developer Tooling & Enforcement

### 9.1 Debug Overlay (DEV only)

Must expose:
- FPS (rolling average)
- Geometry rebuild count / minute
- Vertex count
- JS heap usage

---

### 9.2 CI Enforcement (Required)

- Bundle size check (fail CI if exceeded)
- Cold-start transfer snapshot
- Performance regression test for animation loop

---

## 10. Non-Compliance Policy

Any feature that violates this budget:
- ❌ Cannot ship to production
- ❌ Cannot be enabled by default
- Requires explicit architectural review

---

## 11. Ownership

| Domain | Responsibility |
|--------|----------------|
| Engineering | Animation, geometry, performance |
| Quality / Audit | Determinism, traceability, clarity |
| Platform | Enforcement via tooling & CI |

---

> **This document is normative.**  
> All Preview and Audit features must comply.
