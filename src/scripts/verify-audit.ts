
import { AuditEngine } from "@/lib/audit/AuditEngine";

console.log("Starting Audit Verification...");

function test(name: string, input: any, expectedStatus: "PASS" | "WARN" | "FAIL", checkDegraded: boolean = false) {
    const audit = AuditEngine.evaluate(input);
    const passStatus = audit.status === expectedStatus;
    const passDegraded = checkDegraded ? (audit.degraded === true) : true;

    const pass = passStatus && passDegraded;

    console.log(`[${pass ? "PASS" : "FAIL"}] ${name}: Expected ${expectedStatus}${checkDegraded ? " (Degraded)" : ""}, Got ${audit.status}${audit.degraded ? " (Degraded)" : ""}`);

    if (!pass) console.log("   Audit Result:", JSON.stringify(audit, null, 2));
}

// Shared settings
const warnRatio = 0.80;
const failRatio = 1.10;

// 1. Compression High Stress (WARN)
test("Compression High Stress", {
    springType: "compression",
    geometry: { type: "compression" },
    results: {
        maxStress: 850,
        workingDeflection: 10,
        limits: {
            stressLimit: 1000,
            stressLimitType: "shear",
            maxDeflection: 50,
            warnRatio,
            failRatio
        }
    }
}, "WARN");

// 2. Compression Over Stress (FAIL)
test("Compression Over Stress", {
    springType: "compression",
    geometry: { type: "compression" },
    results: {
        maxStress: 1150,
        workingDeflection: 10,
        limits: {
            stressLimit: 1000,
            stressLimitType: "shear",
            warnRatio,
            failRatio
        }
    }
}, "FAIL");

// 3. Torsion Over Angle (FAIL)
test("Torsion Over Angle", {
    springType: "torsion",
    geometry: { type: "torsion" },
    results: {
        workingAngle: 120,
        maxStress: 600,
        limits: {
            stressLimit: 1000, // Implied sigmaAllow
            maxAngle: 100,
            stressLimitType: "bending",
            warnRatio: 0.80,
            failRatio: 1.00
        }
    }
}, "FAIL");

// 4A. Disk Approaching Flat (WARN) - 80% utilization
test("Disk Approaching Flat", {
    springType: "disk",
    geometry: { type: "disk" },
    results: {
        workingDeflection: 8,
        maxStress: 900,
        limits: {
            maxDeflection: 10,
            stressLimit: 2000,
            stressLimitType: "shear", // Disk usually compares von Mises to Yield
            warnRatio: 0.75,
            failRatio: 1.00 // Flat position
        }
    }
}, "WARN");

// 4B. Disk Over Travel (FAIL) - beyond flat
test("Disk Over Travel", {
    springType: "disk",
    geometry: { type: "disk" },
    results: {
        workingDeflection: 10.5,
        maxStress: 900,
        limits: {
            maxDeflection: 10,
            stressLimit: 2000,
            stressLimitType: "shear",
            warnRatio: 0.75,
            failRatio: 1.00
        }
    }
}, "FAIL");

// 5. Missing Limits (WARN + Degraded)
test("Missing Limits Legacy Fallback", {
    springType: "compression",
    geometry: { type: "compression" },
    results: {
        maxStress: 500,
        workingDeflection: 5,
        // limits missing on purpose
    }
}, "WARN", true);

// 6. Compression Solid Bind (FAIL)
test("Compression Solid Bind", {
    springType: "compression",
    geometry: { type: "compression" },
    results: {
        workingDeflection: 55,
        maxStress: 500,
        limits: {
            stressLimit: 1000,
            maxDeflection: 50, // Usually solid height limit or stress limit
            solidHeight: 50, // Explicit solid bind check if implemented in finding
            warnRatio: 0.85,
            failRatio: 1.05
        }
    }
}, "FAIL");

// 7. Missing Limits + Solid Stop (FAIL)
test("Missing Limits + Solid Stop", {
    springType: "compression",
    geometry: { type: "compression" },
    results: {
        workingDeflection: 55,
        maxStress: 500,
        limits: {
            stressLimit: 0, // Unknown/Missing
            maxDeflection: 50, // Defined by solid height
            solidHeight: 50,
            warnRatio: 0.85,
            failRatio: 1.0
        }
    }
}, "FAIL");
