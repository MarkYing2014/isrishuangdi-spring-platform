
import { describe, it, expect, beforeEach } from "vitest";
import { useQualityStore } from "../qualityStore";

describe("Store Navigation (setActiveStep)", () => {
    beforeEach(() => {
        useQualityStore.getState().reset();
    });

    it("should prevent jumping to LOCKED step", () => {
        const res = useQualityStore.getState().setActiveStep("ANALYSIS");
        expect(res.ok).toBe(false);
        expect(res.reason).toBe("LOCKED");
        expect(useQualityStore.getState().activeStep).toBe("IMPORT");
    });

    it("should prevent jumping to BLOCKED step (FAIL)", () => {
        // Setup FAIL state
        useQualityStore.getState().importData({ rawRows: [{ id: "1", cells: { A: "x" } } as any], columns: ["A"] });
        useQualityStore.getState().updateMapping([{ rawKey: "A", targetKey: "N", type: "number" }]); // "x" -> NaN -> FAIL

        const state = useQualityStore.getState();
        expect(state.validationSummary.fail).toBe(1);

        const res = state.setActiveStep("ANALYSIS");
        expect(res.ok).toBe(false);
        expect(res.reason).toBe("BLOCKED");
    });

    it("should require confirmation for WARNINGs", () => {
        // Setup WARN state
        // Need a row that produces WARN. 
        // Currently my validators primarily check Type (Fail) and Required (Fail).
        // I need to mock a WARN scenario or use a validator that warns.
        // Assuming I manually set status for test? Or use editCell to force it?
        // Or assume validators can produce Warn.
        // Let's force it by hacking state for test, as validators logic is separate.

        useQualityStore.setState(s => {
            s.rawRows = [{ id: "1", cells: {} } as any];
            s.normalizedRows = [{ id: "1", values: {}, status: "WARN", issues: [] } as any];
            s.validationSummary = { total: 1, pass: 0, warn: 1, fail: 0, excluded: 0, status: "WARN" };
            s.columnMapping = [{ rawKey: "A", targetKey: "B", type: "string" }]; // hasMapping=true
        });

        const res = useQualityStore.getState().setActiveStep("ANALYSIS");
        expect(res.ok).toBe(false);
        expect(res.reason).toBe("REQUIRES_WARNING_CONFIRM");
    });

    it("should allow entering Analysis after confirmation", () => {
        useQualityStore.setState(s => {
            s.rawRows = [{ id: "1", cells: {} } as any];
            s.normalizedRows = [{ id: "1", values: {}, status: "WARN", issues: [] } as any];
            s.validationSummary = { total: 1, pass: 0, warn: 1, fail: 0, excluded: 0, status: "WARN" };
            s.columnMapping = [{ rawKey: "A", targetKey: "B", type: "string" }];
        });

        useQualityStore.getState().confirmWarningsAndEnterAnalysis();

        const state = useQualityStore.getState();
        expect(state.activeStep).toBe("ANALYSIS");
        expect(state.gateDecision.acceptedWarnings).toBe(true);
        expect(state.auditTrail.find(a => a.type === "GATE_DECISION")).toBeDefined();
    });
});
