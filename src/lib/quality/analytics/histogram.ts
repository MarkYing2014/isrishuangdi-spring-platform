export interface HistogramBin {
    start: number;
    end: number;
    mid: number;
    count: number;
    density: number;
}

export interface HistogramResult {
    bins: HistogramBin[];
    min: number;
    max: number;
    binWidth: number;
    maxCount: number;
}

export function computeHistogram(values: number[], targetBinCount?: number): HistogramResult {
    const clean = values.filter((v) => isFinite(v));
    if (clean.length === 0) {
        return { bins: [], min: 0, max: 0, binWidth: 0, maxCount: 0 };
    }

    let min = Math.min(...clean);
    let max = Math.max(...clean);

    // Avoid zero width
    if (min === max) {
        min -= 0.5;
        max += 0.5;
    }

    // Scott's Rule for bin width? Or Sturges?
    // Sturges: k = ceil(log2(n) + 1)
    const n = clean.length;
    const k = targetBinCount ?? Math.ceil(Math.log2(n) + 1);
    const binCount = Math.max(5, Math.min(50, k)); // Clamp

    const range = max - min;
    const binWidth = range / binCount;

    const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
        const start = min + i * binWidth;
        const end = start + binWidth;
        return {
            start,
            end,
            mid: (start + end) / 2,
            count: 0,
            density: 0,
        };
    });

    for (const v of clean) {
        // Floating point precision can cause v === max to spill over, so clamp to last bin
        let idx = Math.floor((v - min) / binWidth);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        bins[idx].count++;
    }

    const maxCount = Math.max(...bins.map((b) => b.count));

    return {
        bins,
        min,
        max,
        binWidth,
        maxCount,
    };
}
