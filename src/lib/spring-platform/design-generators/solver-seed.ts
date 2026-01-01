import { CandidateContext } from "../candidate-context";

/**
 * SolverSeedGenerator uses the engine's solveForTarget to find precise feasible candidates.
 */
export class SolverSeedGenerator {
    generate(ctx: CandidateContext): any[] {
        const { engine, designSpace, material } = ctx;
        const candidates: any[] = [];

        if (!engine.solveForTarget || designSpace.targets.length === 0) return [];

        // Use the first target as the seed point
        const target = designSpace.targets[0];

        // We try to solve for n across different D values to get a variety of seeds
        const { D: DRange } = designSpace.ranges;
        const DSteps = [DRange[0], (DRange[0] + DRange[1]) / 2, DRange[1]];

        for (const D of DSteps) {
            const { d: dRange } = designSpace.ranges;
            // Try min, mid, max d
            const dOptions = [dRange[0], (dRange[0] + dRange[1]) / 2, dRange[1]];

            for (const d of dOptions) {
                // Try min and max H0 for seeds
                const h0Options = designSpace.ranges.H0
                    ? [designSpace.ranges.H0[0], designSpace.ranges.H0[1]]
                    : [undefined];

                for (const H0 of h0Options) {
                    const result = engine.solveForTarget(
                        { geometry: { d, D, H0 }, material },
                        {
                            mode: "singlePoint",
                            target1: { x: target.inputValue, y: target.targetValue },
                            clamps: { nRange: designSpace.ranges.n }
                        }
                    );

                    if (result.ok && result.solvedParams) {
                        candidates.push({
                            d,
                            D,
                            ...result.solvedParams
                        });
                    }
                }
            }
        }

        return candidates;
    }
}
