import { EvolutionState } from "./types";

const STORAGE_PREFIX = "seos_evolution_";

/**
 * Save evolution state for a specific project/design
 */
export function saveEvolution(projectId: string, state: EvolutionState): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save evolution state", e);
    }
}

/**
 * Load evolution state for a specific project/design
 */
export function loadEvolution(projectId: string): EvolutionState {
    if (typeof window === "undefined") return { snapshots: [] };
    try {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load evolution state", e);
    }
    return { snapshots: [] };
}

/**
 * Clear evolution history (optional utility)
 */
export function clearEvolution(projectId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
}
