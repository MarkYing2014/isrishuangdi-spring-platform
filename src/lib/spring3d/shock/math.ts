/**
 * Shock Spring Module - Math Formulas
 * 
 * Stateless engineering formulas for stress, correction factors, and basic stiffness.
 * NO state, NO non-linear logic here. Just pure equations.
 */

// ============================================================================
// 1. Correction Factors
// ============================================================================

/**
 * Wahl Curvature Correction Factor
 * Kw = (4C - 1)/(4C - 4) + 0.615/C
 */
export function wahlFactor(C: number): number {
    if (C <= 1) return 1.0; // Avoid Singularity
    return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

/**
 * Bergsträsser Factor (Alternative, simpler)
 * Kb = (4C + 2) / (4C - 3)
 */
export function bergstrasserFactor(C: number): number {
    if (C <= 0.75) return 1.0;
    return (4 * C + 2) / (4 * C - 3);
}


// ============================================================================
// 2. Stress Calculations
// ============================================================================

/**
 * Uncorrected Torsional Stress
 * tau = 8 * F * D / (pi * d^3)
 */
export function torsionalStress(F: number, D: number, d: number): number {
    if (d <= 0) return 0;
    return (8 * F * D) / (Math.PI * Math.pow(d, 3));
}

/**
 * Corrected Shear Stress (Wahl)
 * tau_corrected = Kw * tau
 */
export function correctedShearStress(F: number, D: number, d: number): number {
    if (d <= 0 || D <= 0) return 0;
    const C = D / d;
    const Kw = wahlFactor(C);
    return Kw * torsionalStress(F, D, d);
}


// ============================================================================
// 3. Stiffness Calculations (Linear / Instantaneous)
// ============================================================================

/**
 * Elementary Spring Rate for a segment (or whole spring if uniform)
 * k = (G * d^4) / (8 * D^3 * Na)
 */
export function linearStiffness(G: number, d: number, D: number, Na: number): number {
    if (Na <= 0 || D <= 0) return 0;
    return (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * Na);
}

/**
 * Torsional Rigidity of a wire section
 * J = (pi * d^4) / 32
 * GJ = G * J
 */
export function torsionalRigidity(G: number, d: number): number {
    return G * (Math.PI * Math.pow(d, 4)) / 32;
}

// ============================================================================
// 4. Energy Calculations
// ============================================================================

/**
 * Elastic Potential Energy (Linear Spring)
 * E = 0.5 * k * x^2  OR  E = 0.5 * F * x
 */
export function linearEnergy(k: number, x: number): number {
    return 0.5 * k * x * x;
}

// ============================================================================
// 5. Buckling Calculations
// ============================================================================

/**
 * Critical Buckling Deflection (Approximate)
 * Returns the critical deflection ratio (x_crit / L0)
 * 
 * Based on slenderness lambda = L0 / D
 * and end fixity factor nu (0.5 for fixed-fixed, 1.0 for hinged-hinged)
 * 
 * Simplified formula often used:
 * if L0/D > 2.62 (fixed ends), instability exists
 */
export function checkBucklingStability(L0: number, D: number, isGuided: boolean): "stable" | "buckle_risk" {
    const slenderness = L0 / D;
    // Guided springs are generally stable
    if (isGuided) return "stable";

    // Un-guided rule of thumb: L0/D < 4 is usually okay, > 5.2 is critical
    if (slenderness > 4.0) return "buckle_risk";

    return "stable";
}
