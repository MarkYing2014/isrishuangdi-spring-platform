import { GaugeSpec, GaugeStrategy } from "./types";
import { generateGaugeStrategy } from "./gaugeRules";
import { buildCylinderMesh, buildSleeveMesh, Mesh } from "./geometryBuilders";
import { exportMeshToBinaryStl, downloadStl } from "./exportStl";

export * from "./types";
export * from "./tolerancePolicy";
export * from "./gaugeRules";
export * from "./exportStl";

/**
 * Main Entry Point: Generate a complete inspection strategy
 */
export function generateSmartGaugeStrategy(
    designSummary: any,
    deliverabilityAudit: any,
    partNo: string = "SN-001"
): GaugeStrategy {
    return generateGaugeStrategy(designSummary, deliverabilityAudit, partNo);
}

/**
 * Build and Export a Gauge as STL
 */
export function exportGaugeStl(gauge: GaugeSpec) {
    let mesh: Mesh;

    // Standard sizing for gauge handle/body:
    // Radius = measured radius + 5mm for sleeve, or 0 for cylinder
    // Height = 20mm boilerplate
    const height = 20;

    if (gauge.category === "ID") {
        // ID Gauge is a cylinder (pin)
        mesh = buildCylinderMesh(gauge.targetValue / 2, height);
    } else if (gauge.category === "OD") {
        // OD Gauge is a sleeve (hole)
        const outerWall = (gauge.targetValue / 2) + 5;
        mesh = buildSleeveMesh(gauge.targetValue / 2, outerWall, height);
    } else {
        // LENGTH Gauge can be a cylinder or block, using cylinder for now
        mesh = buildCylinderMesh(10, gauge.targetValue); // Vertical height check
    }

    const buffer = exportMeshToBinaryStl(mesh);
    downloadStl(buffer, gauge.filename);
}
