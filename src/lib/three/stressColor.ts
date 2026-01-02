/**
 * Stress Color Mapping Utility
 * 
 * Implements a standard engineering 5-stop gradient for visualization.
 * Deterministic mapping from normalized stress ratio (tau / tauLimit) to RGB.
 * 
 * Gradient Stops:
 * 0.00 -> Blue   (Safe, Low Load)
 * 0.35 -> Cyan   (Moderate)
 * 0.70 -> Green  (Optimum)
 * 1.00 -> Yellow (Warning/Limit)
 * 1.20 -> Red    (Overstress/Yield)
 */

import * as THREE from 'three';

// Pre-defined colors for efficiency
const C1 = new THREE.Color("#0000ff"); // Blue
const C2 = new THREE.Color("#00ffff"); // Cyan
const C3 = new THREE.Color("#00ff00"); // Green
const C4 = new THREE.Color("#ffff00"); // Yellow
const C5 = new THREE.Color("#ff0000"); // Red

/**
 * Maps a normalized stress ratio to a THREE.Color.
 * @param ratio Normalized stress (stress / limit). Range 0 to 1.2+.
 * @param out Optional color object to reuse to avoid allocations.
 */
export function stressToRGB(ratio: number, out?: THREE.Color): THREE.Color {
    const color = out || new THREE.Color();
    const t = Math.max(0, Math.min(1.2, ratio));

    // Piecewise linear interpolation between stops
    if (t <= 0.0) {
        color.copy(C1);
    } else if (t < 0.35) {
        const u = t / 0.35;
        color.lerpColors(C1, C2, u);
    } else if (t < 0.70) {
        const u = (t - 0.35) / (0.70 - 0.35);
        color.lerpColors(C2, C3, u);
    } else if (t < 1.00) {
        const u = (t - 0.70) / (1.00 - 0.70);
        color.lerpColors(C3, C4, u);
    } else {
        // Red is reached at 1.20. Range [1.0, 1.2]
        const u = Math.min(1.0, (t - 1.00) / (1.20 - 1.00));
        color.lerpColors(C4, C5, u);
    }

    return color;
}
