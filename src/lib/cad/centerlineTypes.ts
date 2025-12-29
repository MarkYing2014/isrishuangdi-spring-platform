
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export interface ExtensionSpringCenterlineMm {
    body: Vec3[];
    startHook?: Vec3[];
    endHook?: Vec3[];
    meta: {
        wireDiameterMm: number;
        outerDiameterMm: number;
        meanDiameterMm: number;
        meanRadiusMm: number;
        activeCoils: number;
        bodyLengthSolidMm: number;
        currentExtensionMm: number;
        extendedLengthMm: number;
        hookType: string;
        samplePerTurn: number;
        hookSpec?: any; // Optional debug info
    };
}
