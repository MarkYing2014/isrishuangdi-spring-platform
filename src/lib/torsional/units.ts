
export function assertFinitePositive(name: string, v: number) {
    if (!Number.isFinite(v) || v <= 0)
        throw new Error(`${name} must be finite > 0, got ${v}`);
}

export function assertMetricDieSpringSpec(spec: any) {
    assertFinitePositive("outerDiameter(mm)", spec.outerDiameter);
    assertFinitePositive("freeLength(mm)", spec.freeLength);
    assertFinitePositive("solidHeight(mm)", spec.solidHeight);
    assertFinitePositive("springRate(N/mm)", spec.springRate);

    const solidStroke = spec.freeLength - spec.solidHeight;
    if (!(solidStroke > 0))
        throw new Error(`freeLength - solidHeight must be > 0`);
}
