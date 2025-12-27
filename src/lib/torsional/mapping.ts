
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export function rotationToStrokeMm(thetaDeg: number, radiusMm: number) {
    return thetaDeg * DEG_TO_RAD * radiusMm;
}

export function strokeToThetaDeg(strokeMm: number, radiusMm: number) {
    return (strokeMm / radiusMm) * RAD_TO_DEG;
}
