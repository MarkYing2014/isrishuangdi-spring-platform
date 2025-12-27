
export function computeStageKthetaNmmPerRad(
    kNPerMm: number,
    radiusMm: number,
    n: number
) {
    return n * kNPerMm * radiusMm * radiusMm;
}

export function computeStageKthetaNmmPerDeg(
    kNPerMm: number,
    radiusMm: number,
    n: number
) {
    return computeStageKthetaNmmPerRad(kNPerMm, radiusMm, n) / (180 / Math.PI);
}
