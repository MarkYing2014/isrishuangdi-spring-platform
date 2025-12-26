# Garter Spring V2 FEA Strategy

To achieve reliable engineering validation for Garter Springs, we implement a two-layer FEA strategy. This balances the need for rapid estimation (Layer A) with high-fidelity production analysis (Layer B).

## Layer A: Fast Approximation (V2-FA)
**Goal:** Verify stress trends, stiffness, and parameter sensitivity in minutes.

### 1. Modeling Strategy (Unwrapped Equivalent)
Instead of modeling the full toroidal geometry, we model the spring as a **linear** helical spring (unwrapped). The hoop stretch is applied as an axial displacement.
- **Geometry:** Linear helical centerline. Length = $\pi \cdot D_{free}$.
- **Load:** Axial displacement $\Delta L = \pi \cdot (D_{inst} - D_{free})$ applied to one end.
- **Boundary Conditions:**
  - One end Fixed (or Pinned allowing rotation).
  - Other end Axially Displaced.
  - Rotation must be allowed to prevent artificial torsion stiffening.

### 2. Mesh Specification
- **Element Type:** Beam Elements
  - **CalculiX:** `B31` (Linear Beam) or `B32` (Quadratic Beam).
  - **ANSYS:** `BEAM188`.
- **Density:** 24-48 elements per coil.
- **Output:**
  - Axial Reaction Force (= Hoop Tension $F_t$).
  - Max Equivalent Stress (von Mises).

---

## Layer B: Production Grade (V2-Accurate)
**Goal:** Analyze joint integrity, hook stress, and contact pressures.

### 1. Modeling Strategy (Sub-modeling)
Full solid models of 100+ coils are computationally expensive. We use a global-local approach.

#### Step B1: Global Ring (Beam)
- Model the full circular garter spring using Beam elements.
- Apply radial displacement to expand from $D_{free}$ to $D_{inst}$.
- Extract: Global tension $F_t$ and local displacement/rotation at the joint location.

#### Step B2: Joint Sub-model (Solid)
- Model only the joint area + 3-5 adjacent coils using High-Fidelity Solid elements.
- **Geometry:** True 3D wire geometry including Hook/Screw/Loop details.
- **Boundary:** Apply displacements/forces extracted from B1 to the cut ends of the sub-model.
- **Contact:**
  - Self-contact (coil-to-coil) if pitch is tight.
  - **Critical:** Joint contact (hook-to-loop interaction).

### 2. Mesh Specification (Sub-model)
- **Element Type:** Quadratic Tetrahedrons
  - **CalculiX:** `C3D10` (Second-order Tet).
  - **ANSYS:** `SOLID187`.
- **Density:**
  - **Cross-section:** Minimum 6-8 elements across wire diameter ($d$).
  - **Joint Region:** 10-14 elements across diameter (finer for contact accuracy).
  - **Curvature:** Max element size $\le d/3$ (normal), $\le d/6$ (joint).
- **Physics:**
  - Small sliding contact.
  - Friction coefficient $\mu = 0.1$ (default).

---

## 3. Integration Plan
1.  **Platform V2 Engine**: Runs `garterV2.ts` (Analytical) instantly.
2.  **One-Click FEA**: Generates a CalculiX `.inp` file for **Layer A** (Beam model) for quick validation.
3.  **Advanced Request**: Engineer prepares **Layer B** model for analyzing newly designed joint types or failure cases.
