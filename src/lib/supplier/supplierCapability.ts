/**
 * Supplier Capability Schema (P3)
 * Defines the boundaries within which a supplier can manufacture a spring.
 */

export interface SupplierCapability {
    supplierId: string;
    supplierName: string;

    processCapabilities: {
        minWireDiameter: number;   // mm
        maxWireDiameter: number;   // mm
        maxOuterDiameter?: number; // mm
        maxFreeLength?: number;    // mm
    };

    toleranceCapabilities: {
        wireDiameter: "STANDARD" | "PRECISION" | "ULTRA_PRECISION";
        coilDiameter: "STANDARD" | "PRECISION";
        freeLength: "STANDARD" | "PRECISION";
    };

    surfaceCapabilities: {
        finishes: Array<
            "NONE" | "SHOT_PEEN" | "PHOSPHATE" | "ZINC" | "PASSIVATE" | "ELECTROPOLISH"
        >;
        maxSaltSprayClass?: "48H" | "96H" | "240H";
    };

    qualitySystem: {
        certifications: Array<
            "ISO9001" | "IATF16949" | "ISO14001"
        >;
    };

    riskProfile: {
        preferred: boolean;
        notes?: string;
    };
}

/**
 * Seed Dataset for P3
 */
export const SUPPLIER_SEED_DATA: SupplierCapability[] = [
    {
        supplierId: "SUP-001",
        supplierName: "Standard Spring Co.",
        processCapabilities: {
            minWireDiameter: 0.5,
            maxWireDiameter: 8.0,
            maxOuterDiameter: 120,
            maxFreeLength: 500
        },
        toleranceCapabilities: {
            wireDiameter: "STANDARD",
            coilDiameter: "STANDARD",
            freeLength: "STANDARD"
        },
        surfaceCapabilities: {
            finishes: ["NONE", "PHOSPHATE", "ZINC"],
            maxSaltSprayClass: "96H"
        },
        qualitySystem: {
            certifications: ["ISO9001"]
        },
        riskProfile: {
            preferred: true,
            notes: "Relatable standard supplier for volume production."
        }
    },
    {
        supplierId: "SUP-002",
        supplierName: "Precision Elastic Components",
        processCapabilities: {
            minWireDiameter: 0.1,
            maxWireDiameter: 3.0,
            maxOuterDiameter: 60,
            maxFreeLength: 200
        },
        toleranceCapabilities: {
            wireDiameter: "PRECISION",
            coilDiameter: "PRECISION",
            freeLength: "PRECISION"
        },
        surfaceCapabilities: {
            finishes: ["NONE", "PHOSPHATE", "ZINC", "PASSIVATE", "ELECTROPOLISH"],
            maxSaltSprayClass: "240H"
        },
        qualitySystem: {
            certifications: ["ISO9001", "IATF16949"]
        },
        riskProfile: {
            preferred: true,
            notes: "High precision automotive specialist."
        }
    },
    {
        supplierId: "SUP-003",
        supplierName: "Ultra-Performance Wire Lab",
        processCapabilities: {
            minWireDiameter: 0.05,
            maxWireDiameter: 1.5,
            maxOuterDiameter: 40,
            maxFreeLength: 100
        },
        toleranceCapabilities: {
            wireDiameter: "ULTRA_PRECISION",
            coilDiameter: "PRECISION",
            freeLength: "PRECISION"
        },
        surfaceCapabilities: {
            finishes: ["NONE", "SHOT_PEEN", "PASSIVATE", "ELECTROPOLISH"],
            maxSaltSprayClass: "240H"
        },
        qualitySystem: {
            certifications: ["ISO9001", "IATF16949", "ISO14001"]
        },
        riskProfile: {
            preferred: false,
            notes: "Research grade precision, extremely high cost."
        }
    }
];
