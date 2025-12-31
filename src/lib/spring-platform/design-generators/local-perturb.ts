/**
 * LocalPerturbationGenerator creates variations near existing high-quality candidates.
 */
export class LocalPerturbationGenerator {
    /**
     * Generates a cluster of candidates around a seed.
     */
    generate(seed: any): any[] {
        const candidates: any[] = [];
        const perturbations = [-0.1, -0.05, 0.05, 0.1]; // Percentage variations

        // Keep the seed itself
        candidates.push({ ...seed });

        // Perturb d
        for (const p of perturbations) {
            candidates.push({ ...seed, d: Number((seed.d * (1 + p)).toFixed(2)) });
        }

        // Perturb D
        for (const p of perturbations) {
            candidates.push({ ...seed, D: Number((seed.D * (1 + p)).toFixed(2)) });
        }

        // Perturb n
        for (const p of perturbations) {
            candidates.push({ ...seed, n: Number((seed.n * (1 + p)).toFixed(1)) });
        }

        return candidates;
    }
}
