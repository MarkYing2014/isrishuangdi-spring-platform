/**
 * PSW Generator
 * Generates Part Submission Warrant fields from PPAP package
 */

import type { PpapPackage, PswFields, PswDocument } from "./types";
import { computePpapReadiness } from "./stateMachine";

export interface PswGenerationResult {
    success: boolean;
    psw?: PswDocument;
    error?: {
        code: string;
        message: string;
        blockedReasons?: string[];
    };
}

/**
 * Generate PSW fields from PPAP package data
 */
export function generatePswFields(ppap: PpapPackage): PswFields {
    return {
        // Part Information
        partNumber: ppap.partNo,
        partName: ppap.partName,
        partRevision: ppap.partRev,
        drawingNumber: ppap.partNo, // TODO: Link to actual drawing
        drawingDate: new Date().toISOString().split("T")[0],

        // Organization
        supplierName: "Shuangdi Spring Engineering",
        supplierCode: "SDSE-001",
        supplierAddress: "中国上海市浦东新区",

        // Customer
        customerName: ppap.customer,
        programName: ppap.program,

        // Submission
        submissionLevel: ppap.submissionLevel,
        submissionReason: "Initial Submission",

        // Weight (TODO: Get from engineering calculation)
        partWeight: undefined,
        partWeightUnit: "kg",

        // Declarations
        materialsDeclaration: true,
        restrictedSubstances: true,
        customerSpecificReqs: false,

        // Results (TODO: Derive from checklist sources)
        dimensionalMeetsSpec: true,
        materialMeetsSpec: true,
        appearanceMeetsSpec: true,
        statisticalMeetsSpec: true,
    };
}

/**
 * Validate PPAP readiness and generate PSW
 * Returns error with blocked reasons if not ready
 */
export function validateAndGeneratePsw(
    ppap: PpapPackage
): PswGenerationResult {
    // Check readiness
    const readiness = computePpapReadiness(ppap);

    if (readiness.pswBlocked) {
        return {
            success: false,
            error: {
                code: "PSW_BLOCKED",
                message: `Cannot generate PSW: ${readiness.missing.length} required items not ready`,
                blockedReasons: readiness.blockedReasons,
            },
        };
    }

    // Generate PSW fields
    const fields = generatePswFields(ppap);

    // Create PSW document (without persisting - caller handles that)
    const psw: PswDocument = {
        id: "", // Will be set by repository
        ppapId: ppap.id,
        status: "DRAFT",
        fields,
        generatedAt: new Date().toISOString(),
        pdfUrl: undefined, // TODO: Generate PDF
    };

    return {
        success: true,
        psw,
    };
}

/**
 * Generate PSW PDF URL (stub for now)
 * TODO: Implement actual PDF generation
 */
export function generatePswPdfUrl(pswId: string): string {
    // Stub: Return a placeholder URL
    // In production, this would call a PDF generation service
    return `/api/ppap/psw/${pswId}/pdf`;
}
