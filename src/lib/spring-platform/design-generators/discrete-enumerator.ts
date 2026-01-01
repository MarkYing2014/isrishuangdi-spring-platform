import { DesignSpace } from "../design-space-types";

/**
 * DiscreteEnumerator generates design candidates by stepping through d, D, and n
 */
export class DiscreteEnumerator {
    /**
     * Generates a list of candidate parameters based on the design space.
     */
    generate(space: DesignSpace): any[] {
        const candidates: any[] = [];
        const { d: dRange, D: DRange, n: nRange, t: tRange, h0: h0Range, Ns: NsRange, Np: NpRange } = space.ranges;

        if (space.springType === "disc" && tRange && h0Range) {
            // Disc specific generation: t, h0, Ns, Np
            const tStep = 0.1;
            const h0Step = 0.5;
            const NsStep = 1;
            const NpStep = 1;

            for (let t = tRange[0]; t <= tRange[1]; t += tStep) {
                for (let h0 = h0Range[0]; h0 <= h0Range[1]; h0 += h0Step) {
                    for (let Ns = (NsRange?.[0] || 1); Ns <= (NsRange?.[1] || 1); Ns += NsStep) {
                        for (let Np = (NpRange?.[0] || 1); Np <= (NpRange?.[1] || 1); Np += NpStep) {
                            candidates.push({
                                t: Number(t.toFixed(2)),
                                h0: Number(h0.toFixed(2)),
                                series: Math.round(Ns),
                                parallel: Math.round(Np),
                                Do: 40, // Base Do/Di for now
                                Di: 20
                            });
                            if (candidates.length > 500) break;
                        }
                        if (candidates.length > 500) break;
                    }
                    if (candidates.length > 500) break;
                }
                if (candidates.length > 500) break;
            }
            return candidates;
        }

        // Default d, D, n generation
        const dStep = 0.2; // Slightly coarser d to allow more H0/D variation
        const DStep = 4.0; // Coarser D to save cycles
        const nStep = 0.5; // Keep n fine

        for (let d = dRange[0]; d <= dRange[1]; d += dStep) {
            for (let D = DRange[0]; D <= DRange[1]; D += DStep) {
                for (let n = nRange[0]; n <= nRange[1]; n += nStep) {
                    const baseParams: any = {
                        d: Number(d.toFixed(2)),
                        D: Number(D.toFixed(2)),
                        n: Number(n.toFixed(2))
                    };

                    // Sample H0 if range exists
                    const h0Steps = space.ranges.H0
                        ? (space.ranges.H0[0] === space.ranges.H0[1] ? [space.ranges.H0[0]] : [space.ranges.H0[0], (space.ranges.H0[0] + space.ranges.H0[1]) / 2, space.ranges.H0[1]])
                        : [undefined];

                    for (const H0 of h0Steps) {
                        const params = { ...baseParams };
                        if (H0 !== undefined) params.H0 = Number(H0.toFixed(2));

                        if (space.ranges.L0 && space.ranges.L0[0] === space.ranges.L0[1]) {
                            params.L0 = space.ranges.L0[0];
                        }

                        // Pitch Loop (Shock specific)
                        const pRange = space.ranges.p;
                        if (pRange) {
                            const pStep = 0.5;
                            const effectiveMax = Math.max(pRange[0], pRange[1]);
                            for (let p = pRange[0]; p <= effectiveMax; p += pStep) {
                                candidates.push({ ...params, p: Number(p.toFixed(2)) });
                                if (candidates.length > 5000) break;
                                if (p >= effectiveMax && pStep > 0) break;
                            }
                        } else {
                            candidates.push(params);
                        }
                        if (candidates.length > 5000) break;
                    }

                    // Safety cap for a single generator (increased for better coverage)
                    if (candidates.length > 5000) break;
                }
                if (candidates.length > 5000) break;
            }
            if (candidates.length > 5000) break;
        }

        return candidates;
    }
}
