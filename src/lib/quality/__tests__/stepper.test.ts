
import { describe, it, expect } from "vitest";
import {
    computeStepperSnapshot,
    ValidationSummary,
    GateDecision,
    StepperSnapshot,
    QualityStep
} from "../types";

describe("Stepper Logic (computeStepperSnapshot)", () => {

    const baseSummary: ValidationSummary = { total: 0, pass: 0, warn: 0, fail: 0, excluded: 0, status: "PENDING" };
    const baseDecision: GateDecision = { acceptedWarnings: false, excludedFailed: false };

    it("should be LOCKED initially except IMPORT", () => {
        const snap = computeStepperSnapshot({
            activeStep: "IMPORT",
            summary: baseSummary,
            gateDecision: baseDecision,
            hasData: false,
            hasMapping: false
        });

        expect(getStepStatus(snap, "IMPORT")).toBe("ACTIVE");
        expect(getStepStatus(snap, "MAPPING")).toBe("LOCKED");
        expect(getStepStatus(snap, "VALIDATION")).toBe("LOCKED");
    });

    it("should unlock MAPPING when data exists", () => {
        const snap = computeStepperSnapshot({
            activeStep: "IMPORT",
            summary: baseSummary,
            gateDecision: baseDecision,
            hasData: true,
            hasMapping: false
        });

        // IMPORT is active, MAPPING is next available
        // logic: getStatus("IMPORT") -> ACTIVE (if active). 
        // Logic for others:
        expect(getStepStatus(snap, "MAPPING")).toBe("AVAILABLE");
        expect(getStepStatus(snap, "VALIDATION")).toBe("AVAILABLE"); // Technically we can skip mapping if we want to validate raw? Current logic says AVAILABLE if hasData.
    });

    it("should mark MAPPING as DONE if mapping exists", () => {
        const snap = computeStepperSnapshot({
            activeStep: "VALIDATION",
            summary: baseSummary,
            gateDecision: baseDecision,
            hasData: true,
            hasMapping: true
        });

        expect(getStepStatus(snap, "MAPPING")).toBe("DONE");
    });

    it("should BLOCK Analysis if FAIL > 0", () => {
        const failSummary: ValidationSummary = { ...baseSummary, total: 10, fail: 1, status: "FAIL" };

        const snap = computeStepperSnapshot({
            activeStep: "VALIDATION",
            summary: failSummary,
            gateDecision: baseDecision,
            hasData: true,
            hasMapping: true
        });

        expect(getStepStatus(snap, "ANALYSIS")).toBe("BLOCKED");
        expect(snap.gateState).toBe("BLOCKED");
    });

    it("should allow Analysis if PASS", () => {
        const passSummary: ValidationSummary = { ...baseSummary, total: 10, pass: 10, status: "PASS" };

        const snap = computeStepperSnapshot({
            activeStep: "VALIDATION",
            summary: passSummary,
            gateDecision: baseDecision,
            hasData: true,
            hasMapping: true
        });

        expect(getStepStatus(snap, "ANALYSIS")).toBe("AVAILABLE");
        expect(snap.gateState).toBe("READY");
    });

    it("should allow Analysis if WARN (Conditional), mapped to AVAILABLE status", () => {
        const warnSummary: ValidationSummary = { ...baseSummary, total: 10, warn: 1, status: "WARN" };

        const snap = computeStepperSnapshot({
            activeStep: "VALIDATION",
            summary: warnSummary,
            gateDecision: baseDecision, // Not accepted yet
            hasData: true,
            hasMapping: true
        });

        expect(snap.gateState).toBe("CONDITIONAL_READY");
        expect(getStepStatus(snap, "ANALYSIS")).toBe("AVAILABLE");
        // Note: It is AVAILABLE in UI status, but Store action will require confirmation.
    });
});

function getStepStatus(snap: StepperSnapshot, key: QualityStep) {
    return snap.steps.find(s => s.key === key)?.status;
}
