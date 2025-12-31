import { CandidateSolution } from "./candidate-solution";

/**
 * ParetoOptimizer identifies non-dominated solutions from a candidate set.
 */
export class ParetoOptimizer {
    /**
     * Ranks candidates using Pareto multi-objective optimization.
     * Objectives (all minimized in this vector):
     * 1. Mass Proxy (Smaller is better)
     * 2. Max Stress Ratio (Smaller is better)
     * 3. -Solid Margin (Maximize margin -> Minimize negative margin)
     */
    optimize(candidates: CandidateSolution[]): CandidateSolution[] {
        if (candidates.length === 0) return [];

        let remaining = [...candidates];
        let currentRank = 1;

        const ranked: CandidateSolution[] = [];

        while (remaining.length > 0 && currentRank <= 5) {
            const front: CandidateSolution[] = [];
            const others: CandidateSolution[] = [];

            for (let i = 0; i < remaining.length; i++) {
                let dominated = false;
                for (let j = 0; j < remaining.length; j++) {
                    if (i === j) continue;
                    if (this.dominates(remaining[j], remaining[i])) {
                        dominated = true;
                        break;
                    }
                }

                if (!dominated) {
                    remaining[i].paretoRank = currentRank;
                    front.push(remaining[i]);
                } else {
                    others.push(remaining[i]);
                }
            }

            ranked.push(...front);
            remaining = others;
            currentRank++;
        }

        // Add remaining down-ranked solutions
        for (const sol of remaining) {
            sol.paretoRank = 10;
            ranked.push(sol);
        }

        return ranked;
    }

    /**
     * Returns true if candidate A dominates candidate B.
     * A dominates B if it's better or equal in ALL objectives AND strictly better in at least one.
     */
    private dominates(a: CandidateSolution, b: CandidateSolution): boolean {
        const objectivesA = [
            a.metrics.massProxy,
            a.metrics.maxStressRatio,
            -a.metrics.solidMarginMin
        ];

        const objectivesB = [
            b.metrics.massProxy,
            b.metrics.maxStressRatio,
            -b.metrics.solidMarginMin
        ];

        let betterInOne = false;
        for (let i = 0; i < objectivesA.length; i++) {
            if (objectivesA[i] > objectivesB[i] + 0.000001) {
                return false; // A is worse in at least one objective
            }
            if (objectivesA[i] < objectivesB[i] - 0.000001) {
                betterInOne = true;
            }
        }

        return betterInOne;
    }
}
