import type { SpringType } from "@/lib/springTypes";
import type { SpringGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import type {
    ManufacturingPlan,
    ManufacturingProcess,
    ProcessType
} from "./workOrderTypes";

/**
 * Manufacturing Planner Engine
 * Auto-generates manufacturing process routes based on engineering data
 */
export class ManufacturingPlanner {
    /**
     * Generate a complete manufacturing plan from engineering data
     */
    static generatePlan(
        springType: SpringType,
        geometry: SpringGeometry,
        material: MaterialInfo,
        analysis: AnalysisResult
    ): ManufacturingPlan {
        const wireSpec = this.generateWireSpec(geometry, material);
        const processRoute = this.generateProcessRoute(springType, geometry, material, analysis);

        const totalEstimatedTime = processRoute.reduce((sum, p) => sum + (p.estimatedDuration || 0), 0);

        return {
            wireSpec,
            processRoute,
            totalEstimatedTime,
            machineRequirements: this.determineMachineRequirements(springType, geometry),
        };
    }

    /**
     * Generate wire specification
     */
    private static generateWireSpec(geometry: SpringGeometry, material: MaterialInfo) {
        let diameter = 0;

        // Extract wire diameter based on spring type
        if ('wireDiameter' in geometry) {
            diameter = geometry.wireDiameter;
        } else if (geometry.type === 'wave' && 'thickness_t' in geometry) {
            diameter = geometry.thickness_t;
        } else if (geometry.type === 'disk' && 'thickness' in geometry) {
            diameter = geometry.thickness;
        }

        // Determine standard based on material
        let standard = "ASTM A228";  // Default for music wire
        if (material.id.includes("SUS") || material.id.includes("304")) {
            standard = "ASTM A313";
        } else if (material.id.includes("CrSi") || material.id.includes("CrV")) {
            standard = "DIN 17223";
        }

        return {
            material: material.name,
            diameter,
            standard,
            grade: material.id,
        };
    }

    /**
     * Generate process route based on engineering requirements
     */
    private static generateProcessRoute(
        springType: SpringType,
        geometry: SpringGeometry,
        material: MaterialInfo,
        analysis: AnalysisResult
    ): ManufacturingProcess[] {
        const processes: ManufacturingProcess[] = [];
        let sequence = 1;

        // 1. Primary Forming Process
        if (springType === 'disk') {
            // Disk springs are typically stamped/blanked from sheet or strip
            processes.push({
                processId: `P${sequence++}`,
                type: "stamping", // Custom type for now, fallback to generic if strict typed
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 1, // Fast per piece
                notes: "Fine blanking from strip",
            });
            processes.push({
                processId: `P${sequence++}`,
                type: "deburring",
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 5,
            });
        } else {
            // Coiled springs (Compression, Extension, Torsion, Wave)

            // Wire Prep
            processes.push({
                processId: `P${sequence++}`,
                type: "wire-straightening",
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 5,
            });

            // Coiling
            const coilingType = springType === 'wave' ? "flat-wire-coiling" : "cnc-coiling";
            processes.push({
                processId: `P${sequence++}`,
                type: coilingType,
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: this.estimateCoilingTime(springType, geometry),
                notes: springType === 'wave' ? "Edge-winding process" : undefined,
            });
        }

        // 2. Secondary Forming (Hooks, Legs, Ends)
        if (springType === 'extension') {
            processes.push({
                processId: `P${sequence++}`,
                type: "hook-forming",
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 10,
                notes: "Form loops/hooks per spec",
            });
        }

        if (springType === 'torsion') {
            // Often done in CNC coiler, but separate check ensures leg configuration
            // If complex legs, might need secondary bending
            // For V1 assume CNC coiler handles it, but maybe add 'leg-bending' if manual
        }

        // 3. End Closing (Compression/Conical)
        if (this.requiresEndClosing(springType, geometry)) {
            processes.push({
                processId: `P${sequence++}`,
                type: "end-closing",
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 3,
            });
        }

        // 4. End Grinding (Compression/Conical)
        if (this.requiresEndGrinding(springType, geometry)) {
            processes.push({
                processId: `P${sequence++}`,
                type: "end-grinding",
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 8,
                notes: "Grind both ends flat and parallel",
            });
        }

        // 5. Heat Treatment
        if (this.requiresHeatTreatment(material) || springType === 'disk') {
            // Disk springs almost always need heat treat (austempering etc)
            processes.push({
                processId: `P${sequence++}`,
                type: "heat-treatment",
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: springType === 'disk' ? 60 : 120,
                notes: `Stress relief / Tempering`,
            });
        }

        // 6. Shot Peening
        if (this.requiresShotPeening(analysis, material) || (springType === 'disk' && analysis.staticSafetyFactor && analysis.staticSafetyFactor < 1.1)) {
            // Disk springs benefit greatly from shot peening for fatigue
            processes.push({
                processId: `P${sequence++}`,
                type: "shot-peening",
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 15,
                notes: "Almen intensity: 0.008-0.012A",
            });
        }

        // 7. Setting / Pre-stressing (Important for compression/disk)
        if ((springType === 'compression' || springType === 'disk') && analysis.maxStress && material.tensileStrength && (analysis.maxStress > 0.4 * material.tensileStrength)) {
            processes.push({
                processId: `P${sequence++}`,
                type: "scragging", // or "setting"
                sequence: processes.length + 1,
                required: true,
                estimatedDuration: 2,
                notes: "Remove permanent set (scragging)",
            });
        }

        // 8. Surface Coating
        if (this.requiresCoating(material, springType) || springType === 'disk') {
            // Disk springs are often phosphated
            processes.push({
                processId: `P${sequence++}`,
                type: "surface-coating",
                sequence: processes.length + 1,
                required: false,
                estimatedDuration: 30,
                notes: springType === 'disk' ? "Phosphate & Oil" : "Zinc plating or powder coating",
            });
        }

        // 9. Load Testing
        processes.push({
            processId: `P${sequence++}`,
            type: "load-testing",
            sequence: processes.length + 1,
            required: true,
            estimatedDuration: 10,
        });

        // 10. Final Inspection
        processes.push({
            processId: `P${sequence++}`,
            type: "final-inspection",
            sequence: processes.length + 1,
            required: true,
            estimatedDuration: 5,
        });

        return processes;
    }

    // ========== Helper Methods ==========

    private static requiresEndClosing(springType: SpringType, geometry: SpringGeometry): boolean {
        if (springType !== "compression" && springType !== "conical") return false;

        if ('topGround' in geometry || 'bottomGround' in geometry) {
            return geometry.topGround || geometry.bottomGround || false;
        }

        return false;
    }

    private static requiresEndGrinding(springType: SpringType, geometry: SpringGeometry): boolean {
        if (springType !== "compression" && springType !== "conical") return false;

        if ('topGround' in geometry && 'bottomGround' in geometry) {
            return (geometry.topGround && geometry.bottomGround) || false;
        }

        return false;
    }

    private static requiresHeatTreatment(material: MaterialInfo): boolean {
        const materialId = material.id.toUpperCase();
        return materialId.includes("CRSI") ||
            materialId.includes("CRV") ||
            materialId.includes("MUSIC") ||
            materialId.includes("PIANO");
    }

    private static requiresShotPeening(analysis: AnalysisResult, material: MaterialInfo): boolean {
        // Shot peening required if stress ratio > 50% or for fatigue-critical applications
        const stressRatio = (analysis.maxStress || analysis.shearStress || 0) /
            (material.tensileStrength || 2000) * 100;

        return stressRatio > 50;
    }

    private static requiresCoating(material: MaterialInfo, springType: SpringType): boolean {
        // Stainless steel doesn't need coating
        if (material.id.includes("SUS") || material.id.includes("304")) return false;

        // Die springs and suspension springs typically need coating
        return springType === "dieSpring" || springType === "suspensionSpring";
    }

    private static getHeatTreatmentTemp(material: MaterialInfo): number {
        const materialId = material.id.toUpperCase();

        if (materialId.includes("CRSI")) return 420;
        if (materialId.includes("CRV")) return 450;
        if (materialId.includes("MUSIC") || materialId.includes("PIANO")) return 380;

        return 400;  // Default
    }

    private static estimateCoilingTime(springType: SpringType, geometry: SpringGeometry): number {
        let baseTime = 10;  // minutes

        // More complex springs take longer
        if (springType === "conical" || springType === "variablePitchCompression") {
            baseTime = 20;
        } else if (springType === "suspensionSpring") {
            baseTime = 25;
        }

        // Adjust for coil count
        if ('activeCoils' in geometry) {
            const coils = geometry.activeCoils;
            if (coils > 10) baseTime += 5;
            if (coils > 20) baseTime += 10;
        }

        return baseTime;
    }

    private static determineMachineRequirements(springType: SpringType, geometry: SpringGeometry): string[] {
        const machines: string[] = ["CNC Spring Coiler"];

        if (springType === "compression" || springType === "conical") {
            if ('topGround' in geometry && geometry.topGround) {
                machines.push("End Grinding Machine");
            }
        }

        if (springType === "dieSpring" || springType === "suspensionSpring") {
            machines.push("Heavy-Duty Coiler");
        }

        machines.push("Load Testing Machine");

        return machines;
    }
}
