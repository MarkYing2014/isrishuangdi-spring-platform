/**
 * Deterministic sampling utility for QC Debug.
 * Uses a seed to ensure consistent samples across renders/sessions for the same inputs.
 */

export function sampleDeterministic<T>(arr: T[], n: number, seed: number = 1): T[] {
    if (!arr || arr.length === 0) return [];
    if (n >= arr.length) return [...arr]; // If request >= actual, return all (clamped) in order? Or shuffled? prompt implied just "sampling". Usually subset. Order should be preserved for "Raw Rows" typically? 
    // If we just want a random subset, we can shuffle indices.
    // Ideally we keep original order for readability unless purely random.

    // Implementation: Fisher-Yates shuffle logic on indices using seeded Random, then pick first n, then sort indices back to original order?
    // User Prompt: "deterministicSample(rawRows, debug.rawSampleSize, debug.rawSampleSeed)"

    const indices = Array.from({ length: arr.length }, (_, i) => i);

    // Seeded Random Generator (Mulberry32)
    let t = seed + 0x6D2B79F5;
    const nextRandom = () => {
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Take first n
    const selectedIndices = indices.slice(0, n);

    // Sort indices to preserve original order
    selectedIndices.sort((a, b) => a - b);

    // Map back to items
    // Note: if T is object, we just return reference. 
    // If we need to inject row index, we assume caller handles or we do it here. 
    // Prompt mentioned "RawRowView... __rowIndex". 
    // Let's just return T[] here, caller maps.
    return selectedIndices.map(idx => arr[idx]);
}
