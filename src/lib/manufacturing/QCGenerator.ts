import type { SpringType } from "@/lib/springTypes";
import type { SpringGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import type { QCChecklist, QCItem } from "./workOrderTypes";

/**
 * QC Generator Engine
 * Auto-generates quality control checklists from engineering data
 */
export class QCGenerator {
    /**
     * Generate complete QC checklist from engineering data
     */
    static generateChecklist(
        springType: SpringType,
        geometry: SpringGeometry,
        material: MaterialInfo,
        analysis: AnalysisResult
    ): QCChecklist {
        return {
            dimensions: this.generateDimensionalChecks(springType, geometry),
            loadTests: this.generateLoadTests(springType, analysis),
            appearance: this.generateAppearanceChecks(springType, geometry),
            processVerification: this.generateProcessChecks(springType, geometry, material),
        };
    }

    /**
     * Generate dimensional QC items
     */
    private static generateDimensionalChecks(springType: SpringType, geometry: SpringGeometry): QCItem[] {
        const items: QCItem[] = [];
        let itemId = 1;

        // Wire Diameter (universal)
        if ('wireDiameter' in geometry) {
            const d = geometry.wireDiameter;
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Wire Diameter",
                target: d,
                tolerance: this.getWireDiameterTolerance(d),
                min: d * 0.98,
                max: d * 1.02,
                unit: "mm",
                required: true,
            });
        }

        // Outer Diameter
        if ('outerDiameter' in geometry && geometry.outerDiameter != null) {
            const od = geometry.outerDiameter;
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Outer Diameter",
                target: od,
                tolerance: "±2%",
                min: od * 0.98,
                max: od * 1.02,
                unit: "mm",
                required: true,
            });
        } else if ('meanDiameter' in geometry && 'wireDiameter' in geometry && geometry.meanDiameter != null && geometry.wireDiameter != null) {
            const od = geometry.meanDiameter + geometry.wireDiameter;
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Outer Diameter (calculated)",
                target: od,
                tolerance: "±2%",
                min: od * 0.98,
                max: od * 1.02,
                unit: "mm",
                required: true,
            });
        }

        // Free Length / Height
        if ('freeLength' in geometry && geometry.freeLength != null) {
            const l0 = geometry.freeLength;
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Free Length",
                target: l0,
                tolerance: "±1.5%",
                min: l0 * 0.985,
                max: l0 * 1.015,
                unit: "mm",
                required: true,
            });
        } else if ('freeHeight_Hf' in geometry && geometry.freeHeight_Hf != null) {
            const hf = geometry.freeHeight_Hf;
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Free Height",
                target: hf,
                tolerance: "±1.5%",
                min: hf * 0.985,
                max: hf * 1.015,
                unit: "mm",
                required: true,
            });
        } else if ('freeConeHeight' in geometry && 'thickness' in geometry && geometry.freeConeHeight != null && geometry.thickness != null) {
            // Disk Spring Free Height (l0 approx t + h0)
            const h0 = geometry.freeConeHeight;
            const t = geometry.thickness;
            const l0 = t + h0;
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Free Height (t+h0)",
                target: l0,
                tolerance: "±1.5%",
                min: l0 * 0.985,
                max: l0 * 1.015,
                unit: "mm",
                required: true,
            });
        }

        // Solid Height (for compression springs)
        if (springType === "compression" || springType === "conical") {
            if ('totalCoils' in geometry && 'wireDiameter' in geometry && geometry.totalCoils != null && geometry.wireDiameter != null) {
                const solidHeight = geometry.totalCoils * geometry.wireDiameter;
                items.push({
                    itemId: `DIM-${itemId++}`,
                    category: "dimension",
                    description: "Solid Height",
                    target: solidHeight,
                    tolerance: "±3%",
                    min: solidHeight * 0.97,
                    max: solidHeight * 1.03,
                    unit: "mm",
                    required: true,
                });
            }
        }

        // Coil Count (Compression, Extension, Torsion)
        if (springType !== 'disk' && springType !== 'wave' && 'activeCoils' in geometry) {
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Active Coils",
                target: geometry.activeCoils,
                tolerance: "±0.25 coils",
                min: geometry.activeCoils - 0.25,
                max: geometry.activeCoils + 0.25,
                unit: "coils",
                required: true,
            });
        }

        // Wave Spring Specific - Turns/Waves
        if (springType === 'wave' && 'turns_Nt' in geometry && 'wavesPerTurn_Nw' in geometry) {
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Turns (Nt)",
                target: geometry.turns_Nt,
                tolerance: "Exact",
                unit: "turns",
                required: true,
            });
            items.push({
                itemId: `DIM-${itemId++}`,
                category: "dimension",
                description: "Waves per Turn (Nw)",
                target: geometry.wavesPerTurn_Nw,
                tolerance: "Exact",
                unit: "waves",
                required: true,
            });
        }

        return items;
    }

    /**
     * Generate load test QC items
     */
    private static generateLoadTests(springType: SpringType, analysis: AnalysisResult): QCItem[] {
        const items: QCItem[] = [];
        let itemId = 1;

        // Spring Rate Test
        const isTorsion = springType === 'torsion';

        items.push({
            itemId: `LOAD-${itemId++}`,
            category: "load",
            description: isTorsion ? "Torque Rate Verification" : "Spring Rate Verification",
            target: analysis.springRate,
            tolerance: "±7%",
            min: analysis.springRate * 0.93,
            max: analysis.springRate * 1.07,
            unit: analysis.springRateUnit || (isTorsion ? "Nmm/deg" : "N/mm"),
            required: true,
        });

        // Working Load/Torque Test
        if (analysis.workingLoad && analysis.workingDeflection) {
            items.push({
                itemId: `LOAD-${itemId++}`,
                category: "load",
                description: isTorsion
                    ? `Torque at ${analysis.workingDeflection.toFixed(1)}° angle`
                    : `Load at ${analysis.workingDeflection.toFixed(1)}mm deflection`,
                target: analysis.workingLoad,
                tolerance: "±10%",
                min: analysis.workingLoad * 0.9,
                max: analysis.workingLoad * 1.1,
                unit: isTorsion ? "Nmm" : "N",
                required: true,
            });
        }

        // Max Load Test (if applicable)
        if (analysis.maxLoad && analysis.maxDeflection) {
            items.push({
                itemId: `LOAD-${itemId++}`,
                category: "load",
                description: `Load at ${analysis.maxDeflection.toFixed(1)}mm deflection`,
                target: analysis.maxLoad,
                tolerance: "±10%",
                min: analysis.maxLoad * 0.9,
                max: analysis.maxLoad * 1.1,
                unit: "N",
                required: false,
            });
        }

        // Solid Load Test (for compression springs)
        if (springType === "compression" && analysis.solidHeight) {
            items.push({
                itemId: `LOAD-${itemId++}`,
                category: "load",
                description: "Solid Load (should not bind)",
                passCriteria: "Spring compresses to solid height without binding or permanent set",
                required: true,
            });
        }

        return items;
    }

    /**
     * Generate appearance QC items
     */
    private static generateAppearanceChecks(springType: SpringType, geometry: SpringGeometry): QCItem[] {
        const items: QCItem[] = [];
        let itemId = 1;

        // Universal appearance checks
        items.push({
            itemId: `APP-${itemId++}`,
            category: "appearance",
            description: "Surface Defects",
            passCriteria: "No cracks, seams, or deep scratches visible",
            required: true,
        });

        items.push({
            itemId: `APP-${itemId++}`,
            category: "appearance",
            description: "Burrs and Sharp Edges",
            passCriteria: "No burrs or sharp edges that could cause injury or damage",
            required: true,
        });

        // End grinding check (for ground springs)
        if ('topGround' in geometry && 'bottomGround' in geometry) {
            if (geometry.topGround && geometry.bottomGround) {
                items.push({
                    itemId: `APP-${itemId++}`,
                    category: "appearance",
                    description: "End Grinding Quality",
                    passCriteria: "Both ends ground flat and parallel, >270° contact",
                    required: true,
                });
            }
        }

        // Coating uniformity (if applicable)
        items.push({
            itemId: `APP-${itemId++}`,
            category: "appearance",
            description: "Coating Uniformity",
            passCriteria: "Coating evenly distributed, no bare spots or excessive buildup",
            required: false,
        });

        return items;
    }

    /**
     * Generate process verification QC items
     */
    private static generateProcessChecks(
        springType: SpringType,
        geometry: SpringGeometry,
        material: MaterialInfo
    ): QCItem[] {
        const items: QCItem[] = [];
        let itemId = 1;

        // Heat treatment verification
        if (this.requiresHeatTreatment(material)) {
            items.push({
                itemId: `PROC-${itemId++}`,
                category: "process",
                description: "Heat Treatment Record",
                passCriteria: "Temperature and time records within specification",
                required: true,
            });

            items.push({
                itemId: `PROC-${itemId++}`,
                category: "process",
                description: "Hardness Test",
                passCriteria: "Hardness within specified range for material",
                required: true,
            });
        }

        // Shot peening verification
        items.push({
            itemId: `PROC-${itemId++}`,
            category: "process",
            description: "Shot Peening Coverage",
            passCriteria: "100% coverage verified, Almen strip within specification",
            required: false,
        });

        // Coiling direction verification
        items.push({
            itemId: `PROC-${itemId++}`,
            category: "process",
            description: "Coiling Direction",
            passCriteria: "Coiling direction matches specification (RH/LH)",
            required: true,
        });

        return items;
    }

    // ========== Helper Methods ==========

    private static getWireDiameterTolerance(diameter: number): string {
        if (diameter < 1.0) return "±0.02mm";
        if (diameter < 3.0) return "±0.03mm";
        if (diameter < 6.0) return "±0.05mm";
        return "±2%";
    }

    private static requiresHeatTreatment(material: MaterialInfo): boolean {
        const materialId = material.id.toUpperCase();
        return materialId.includes("CRSI") ||
            materialId.includes("CRV") ||
            materialId.includes("MUSIC") ||
            materialId.includes("PIANO");
    }
}
