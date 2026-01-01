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
        const dStep = 0.1;
        const DStep = 1.0;
        const nStep = 1.0;

        for (let d = dRange[0]; d <= dRange[1]; d += dStep) {
            for (let D = DRange[0]; D <= DRange[1]; D += DStep) {
                for (let n = nRange[0]; n <= nRange[1]; n += nStep) {
                    const params: any = {
                        d: Number(d.toFixed(2)),
                        D: Number(D.toFixed(2)),
                        n: Number(n.toFixed(2))
                    };

                    // Carry over fixed parameters like H0 if they are ranges with min==max
                    if (space.ranges.H0 && space.ranges.H0[0] === space.ranges.H0[1]) {
                        params.H0 = space.ranges.H0[0];
                    }
                    if (space.ranges.L0 && space.ranges.L0[0] === space.ranges.L0[1]) {
                        params.L0 = space.ranges.L0[0];
                    }

                    // Pitch Loop (Shock specific)
                    const pRange = space.ranges.p;
                    if (pRange) {
                        const pStep = 0.5;
                        // Avoid infinite loop if range is [0,0] provided
                        const effectiveMax = Math.max(pRange[0], pRange[1]);
                        for (let p = pRange[0]; p <= effectiveMax; p += pStep) {
                            candidates.push({ ...params, p: Number(p.toFixed(2)) });
                            if (candidates.length > 500) break;
                            if (p >= effectiveMax && pStep > 0) break; // Ensure execution once if min==max
                        }
                    } else {
                        candidates.push(params);
                    }

                    // Safety cap for a single generator
                    if (candidates.length > 500) break;
                }
                if (candidates.length > 500) break;
            }
            if (candidates.length > 500) break;
        }

        return candidates;
    }
}
