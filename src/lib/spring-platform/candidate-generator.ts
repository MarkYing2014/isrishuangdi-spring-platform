import { CandidateContext } from "./candidate-context";
import { CandidateSolution } from "./candidate-solution";
import { DiscreteEnumerator } from "./design-generators/discrete-enumerator";
import { SolverSeedGenerator } from "./design-generators/solver-seed";
import { LocalPerturbationGenerator } from "./design-generators/local-perturb";
import { MetricUtils } from "./metrics";
import { PlatformResult } from "./types";

/**
 * CandidateGenerator is the main entry point for generating and filtering designs.
 */
export class CandidateGenerator {
    private discrete = new DiscreteEnumerator();
    private seeds = new SolverSeedGenerator();
    private perturb = new LocalPerturbationGenerator();

    /**
     * Generates a filtered list of feasible design candidates.
     */
    async generateAll(ctx: CandidateContext): Promise<CandidateSolution[]> {
        const { engine, material, designSpace } = ctx;

        // 1. Generate Raw Parameters from multiple sources
        let rawParams: any[] = [];

        // Discrete Grid
        rawParams.push(...this.discrete.generate(designSpace));

        // Solver Seeds
        const seedParams = this.seeds.generate(ctx);
        rawParams.push(...seedParams);

        // Local Perturbations around seeds
        for (const seed of seedParams) {
            rawParams.push(...this.perturb.generate(seed));
        }

        // 2. De-duplicate based on d, D, n
        const uniqueParams = this.deduplicate(rawParams);
        console.log(`CandidateGenerator: Generated ${rawParams.length} raw, ${uniqueParams.length} unique candidates.`);

        // 3. Evaluate and Filter
        const solutions: CandidateSolution[] = [];
        let processed = 0;
        const total = uniqueParams.length;

        for (const params of uniqueParams) {
            processed++;
            // Yield every 20 candidates to keep UI responsive
            if (processed % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            try {
                let geometry: any = { ...params, Hb: 0 };

                if (designSpace.springType === "shock") {
                    const n_total = params.n || 8;
                    const n_closed = 3.0; // Standard 1.5 each end
                    const n_active = Math.max(0.5, n_total - n_closed);

                    // Estimate pitch to match H0 if provided
                    let pitchVal = params.p || (params.D / 3);
                    if (params.H0) {
                        const d = params.d || 10;
                        const h_closed = n_closed * d * 1.05; // Approx height contribution from closed ends
                        pitchVal = Math.max(d * 1.1, (params.H0 - h_closed) / n_active);
                    }

                    geometry = {
                        totalTurns: n_total,
                        samplesPerTurn: 64, // Added to prevent crash
                        meanDia: { start: params.D, mid: params.D, end: params.D, shape: "linear" },
                        wireDia: { start: params.d, mid: params.d, end: params.d },
                        pitch: {
                            style: "symmetric",
                            closedTurns: n_closed / 2,
                            workingMin: pitchVal,
                            workingMax: pitchVal,
                            closedPitchFactor: 1.0
                        },
                        grinding: { mode: "visualClip", grindStart: true, grindEnd: true, offsetTurns: 0.6 },
                        installation: { guided: false, guideType: "none", guideDia: 0 },
                        loadCase: { solidMargin: 3.0 }
                    };
                }

                // Forward calculation
                const result = engine.calculate({
                    geometry,
                    material,
                    cases: {
                        mode: designSpace.targets[0].inputMode,
                        values: designSpace.targets.map(t => t.inputValue)
                    },
                    modules: { basicGeometry: true, loadAnalysis: true, stressAnalysis: true, solidAnalysis: true } as any,
                    springType: designSpace.springType
                });

                // Apply Filters
                if (!this.isValid(result, ctx)) {
                    // console.log(`Candidate failed validation: d=${params.d}, D=${params.D}, n=${params.n}, H0=${result.H0?.toFixed(2)}, TargetHeight=${ctx.designSpace.targets[0].inputValue}`);
                    continue;
                }

                // Calculate Metrics
                const metrics = this.calculateMetrics(params, result, material);
                if (result.totalEnergy !== undefined) {
                    metrics.totalEnergy = result.totalEnergy;
                }

                solutions.push({
                    id: `sol_${Math.random().toString(36).substr(2, 9)}`,
                    params,
                    platformResult: result,
                    metrics,
                    paretoRank: 0,
                    isVisible: true
                });

            } catch (e) {
                continue; // Skip failed calculations
            }

            // Performance cap for UI responsiveness
            if (solutions.length > 300) break;
        }

        console.log(`CandidateGenerator: Found ${solutions.length} valid solutions.`);
        return solutions;
    }

    private deduplicate(paramsArray: any[]): any[] {
        const seen = new Set<string>();
        return paramsArray.filter(p => {
            const key = p.t !== undefined
                ? `${p.t}-${p.h0}-${p.series}-${p.parallel}`
                : `${p.d}-${p.D}-${p.n}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Basic validation: Envelope and primary error checks.
     */
    private isValid(result: PlatformResult, ctx: CandidateContext): boolean {
        // 1. Engineering check
        if (!result.isValid) {
            // console.log(`Candidate invalid: ${result.springType} engine returned isValid=false. DesignRules failing?`);
            return false;
        }

        // 2. Envelope check
        if (result.springType !== "torsion") {
            const OD = result.springIndex * 0 + 0; // Draft: need real D+d in result
            // For now, use the input params for envelope
        }

        // Check points meet targets (loose tolerance)
        for (let i = 0; i < ctx.designSpace.targets.length; i++) {
            const target = ctx.designSpace.targets[i];
            const actual = result.cases[i].load || 0;
            const error = Math.abs(actual - target.targetValue) / target.targetValue;
            if (error > (target.tolerance || 0.15)) {
                console.log(`Target mismatch: target=${target.targetValue}, actual=${actual.toFixed(2)}, error=${error.toFixed(4)}`);
                return false;
            }
        }

        return true;
    }

    private calculateMetrics(params: any, result: PlatformResult, material: any): any {
        const maxStress = Math.max(...result.cases.map(c => c.stress || 0));

        if (result.springType === "disc") {
            return {
                massProxy: MetricUtils.calculateDiscMassProxy(params.Do, params.Di, params.t, params.series, params.parallel),
                maxStressRatio: MetricUtils.calculateStressRatio(maxStress, material.tauAllow),
                solidMarginMin: result.cases[result.cases.length - 1].status !== "danger" ? 0.8 : 0.2, // Simplified for disc
                totalEnergy: result.totalEnergy
            };
        }

        return {
            massProxy: result.mass || MetricUtils.calculateMassProxy(params.d, params.D, params.n),
            maxStressRatio: MetricUtils.calculateStressRatio(maxStress, material.tauAllow),
            solidMarginMin: result.H0 && result.Hb ? (result.H0 - result.Hb) / result.H0 : 0.5
        };
    }
}
