import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from 'uuid'; // Use uuid or simple random if not avail. But let's assume v4 available or use Date.now
import {
    QualityMode,
    RawRow,
    NormalizedRow,
    ColumnMappingItem,
    CellIssue,
    ValidationSummary,
    GateDecision,
    GateState,
    AuditEvent,
    QualityStep,
    StepperSnapshot,
    computeStepperSnapshot,
    deriveGateState,
    deriveValidationStatus,
    canEnterAnalysis,
    QualityChartState,
    QualityChartMode,
    QualityDebugMode,
    RawRowView
} from "./types";
import { sampleDeterministic } from "./utils/sample";
import { validateAll, validateRow } from "./validators";
import { inferMapping } from "./ingestion/inferMapping";

interface QualityState {
    mode: QualityMode;

    // Navigation State
    activeStep: QualityStep;
    analysisRunAt?: number;
    exportRunAt?: number;
    stepperSnapshot: StepperSnapshot;

    // SSOT
    rawRows: RawRow[];                // Immutable source
    normalizedRows: NormalizedRow[];  // Working copy
    columnMapping: ColumnMappingItem[];

    // Fixed Spec Limits (used when no column is mapped)
    specLimits: {
        lsl?: number;
        usl?: number;
        target?: number;
    };

    // Charts & Debug
    chart: QualityChartState;

    // Validation & Gate
    validationSummary: ValidationSummary;
    gateDecision: GateDecision;
    auditTrail: AuditEvent[];

    // UI State
    ui: {
        selectedRowId?: string;
        filter: "ALL" | "ONLY_FAIL" | "ONLY_WARN" | "ONLY_ISSUES";
        search?: string;
    };

    // Actions
    importData: (payload: { rawRows: RawRow[]; fileName?: string; columns?: string[] }) => void;
    updateMapping: (mapping: ColumnMappingItem[]) => void;
    setSpecLimits: (limits: { lsl?: number; usl?: number; target?: number }) => void;

    editCell: (rowId: string, colKey: string, value: any) => void;

    excludeFailedRows: () => void;
    excludeRow: (rowId: string) => void;
    acceptWarningsForAnalysis: (accepted: boolean) => void;

    reset: () => void;

    // Navigation Actions
    setActiveStep: (step: QualityStep, opts?: { source?: "USER" | "SYSTEM" }) => { ok: boolean; reason?: string };
    confirmWarningsAndEnterAnalysis: () => void;
    markAnalysisRun: () => void;
    markExportRun: () => void;

    // UI Actions
    setFilter: (filter: "ALL" | "ONLY_FAIL" | "ONLY_WARN" | "ONLY_ISSUES") => void;

    validateAll: () => void;
    recalcSummary: () => void;

    // Chart & Debug Actions
    setChartMode: (mode: QualityChartMode) => void;
    setDebugMode: (mode: QualityDebugMode) => void;
    setRawSampleSize: (n: number) => void;
    setShowRawWhenAggregated: (v: "EMPTY" | "SAMPLED") => void;

    // Computed (for legacy components compatibility if needed)
    rawColumns: string[];
}

// Initial State helper
const initialSummary: ValidationSummary = {
    total: 0, pass: 0, warn: 0, fail: 0, excluded: 0, status: "PENDING"
};

const initialDecision: GateDecision = {
    acceptedWarnings: false,
    excludedFailed: false
};

// Helper: Sync Snapshot (must be called whenever relevant state changes)
// We can't export this easily from inside, but we'll use it in actions.
// Since we are using immer, we pass the draft state.
// We need to define this function outside or repeat it.
// To avoid repetition, we define it outside but it needs types.
// We'll define it inside the store creator's scope or just inline logic where needed?
// Better: define it outside.

function syncSnapshot(state: QualityState | any) { // Type 'any' for Draft
    state.stepperSnapshot = computeStepperSnapshot({
        activeStep: state.activeStep,
        summary: state.validationSummary,
        gateDecision: state.gateDecision,
        hasData: state.rawRows.length > 0,
        hasMapping: state.columnMapping.length > 0 && state.columnMapping.some((m: any) => !!m.targetKey),
        analysisRunAt: state.analysisRunAt,
        exportRunAt: state.exportRunAt
    });
}

export const useQualityStore = create<QualityState>()(
    immer((set, get) => ({
        mode: "RAW",
        activeStep: "IMPORT",
        stepperSnapshot: computeStepperSnapshot({
            activeStep: "IMPORT",
            summary: initialSummary,
            gateDecision: initialDecision,
            hasData: false,
            hasMapping: false
        }),
        rawRows: [],
        normalizedRows: [],
        columnMapping: [],
        specLimits: {},
        chart: {
            chartMode: "AGGREGATED",
            debug: {
                mode: "OFF",
                rawSampleSize: 200,
                showRawWhenAggregated: "EMPTY"
            }
        },
        validationSummary: initialSummary,
        gateDecision: initialDecision,
        auditTrail: [],
        ui: {
            filter: "ALL"
        },
        rawColumns: [],

        importData: (payload) => {
            const now = Date.now();

            set(state => {
                state.mode = "RAW";
                state.rawRows = payload.rawRows;
                state.rawColumns = payload.columns || [];

                // Reset Process State
                state.columnMapping = [];
                state.normalizedRows = [];
                state.validationSummary = initialSummary;
                state.gateDecision = initialDecision;

                // Reset Nav
                state.activeStep = "IMPORT";
                state.analysisRunAt = undefined;
                state.exportRunAt = undefined;

                state.auditTrail = [{
                    type: "IMPORT",
                    at: now,
                    payload: { fileName: payload.fileName, rowCount: payload.rawRows.length }
                }];

                // INFER MAPPING AUTOMATICALLY
                if (state.rawColumns.length > 0) {
                    const inference = inferMapping(state.rawColumns);
                    const mappingObj = inference.mapping;

                    // Convert Legacy FieldMapping to New ColumnMappingItem[]
                    const newMapping: ColumnMappingItem[] = [];

                    // Helper to map
                    const addMap = (target: string, raw?: string, type: "string" | "number" | "date" = "string", required = false) => {
                        // Only add if we have a raw match OR it's a critical field we want to show as unmapped
                        // Actually, we usually populate the mapping list with ALL system targets, and set rawKey if inferred.
                        // But for now, let's just map what we found.
                        if (raw) {
                            newMapping.push({ targetKey: target, rawKey: raw, type, required });
                        }
                    };

                    // Map Standard Fields
                    addMap("PartNo", mappingObj.partId, "string", true);
                    addMap("Load", mappingObj.value, "number", true); // "value" usually maps to Load
                    // Wait, standard system might vary. 
                    // Let's assume standard targets: PartNo, Load, FreeLength, Date, Result based on sample.
                    // But `inferMapping` uses generic keys (partId, value, timestamp).
                    // We need to map generic keys to the specific targets used in `generateSampleData`.
                    // The sample data usage in `QualityTopBar` generates: "PartNo", "Load", "FreeLength", "Date", "Result".
                    // `inferMapping` logic:
                    //   partId -> matches "PartNo" 
                    //   value -> matches "Load" (maybe?)
                    //   timestamp -> matches "Date"
                    //   result -> matches "Result"

                    // Let's rely on exact matches from inferMapping, which does fuzzy matching.

                    // We should build the mapping list based on EXPECTED TARGETS (System Schema).
                    // For this app, let's assume a standard schema:
                    // PartNo (string)*
                    // Load (number)*
                    // FreeLength (number)
                    // Date (date)
                    // Result (string)
                    // Machine, Shift, etc...

                    const systemSchema = [
                        { key: "PartNo", type: "string", required: true, inferredFrom: mappingObj.partId },
                        { key: "Load", type: "number", required: true, inferredFrom: mappingObj.value }, // "Load" is the primary value?
                        { key: "FreeLength", type: "number", required: false, inferredFrom: undefined }, // inferMapping doesn't catch FreeLength explicitly?
                        { key: "Date", type: "date", required: false, inferredFrom: mappingObj.timestamp },
                        { key: "Result", type: "string", required: false, inferredFrom: mappingObj.result }
                    ];

                    // Extended: Check if "Load" or "FreeLength" are in rawColumns directly if not matched

                    systemSchema.forEach(sys => {
                        let match = sys.inferredFrom;

                        // Fallback: Exact name match if inference missed it
                        if (!match) {
                            match = state.rawColumns.find(c => c.toLowerCase() === sys.key.toLowerCase());
                        }

                        if (match) {
                            newMapping.push({
                                targetKey: sys.key,
                                rawKey: match,
                                type: sys.type as any,
                                required: sys.required
                            });
                        }
                    });

                    if (newMapping.length > 0) {
                        state.columnMapping = newMapping;

                        // Apply Mapping Immediately (Regenerate Normalized Rows)
                        state.normalizedRows = state.rawRows.map(raw => {
                            const values: Record<string, any> = {};
                            newMapping.forEach(m => {
                                let val = raw.cells[m.rawKey];
                                if (m.transform === "trim" && typeof val === "string") val = val.trim();
                                if (m.type === "number") {
                                    const n = Number(val);
                                    values[m.targetKey] = (val === "" || val === null || val === undefined) ? null : (isNaN(n) ? NaN : n);
                                } else if (m.type === "date") {
                                    values[m.targetKey] = (val === "" || val === null || val === undefined) ? null : new Date(val);
                                } else {
                                    values[m.targetKey] = val;
                                }
                            });
                            return {
                                id: raw.id, __rowId: raw.id,
                                values, status: "PENDING", issues: [], excluded: false, ...values
                            } as NormalizedRow;
                        });

                        // Validate
                        // We can't call get().validateAll() inside set.
                        // We'll trust validation happens when stepping to Validation or we trigger it after.
                    }
                }

                syncSnapshot(state);
            });

            // Trigger validation after import if we have mapping
            if (get().columnMapping.length > 0) {
                get().validateAll();
            }
        },

        updateMapping: (mapping) => {
            const now = Date.now();
            set(state => {
                state.columnMapping = mapping;
                state.gateDecision = initialDecision; // Reset decision on new mapping

                // REGENERATE Normalized Rows
                state.normalizedRows = state.rawRows.map(raw => {
                    const values: Record<string, any> = {};
                    mapping.forEach(m => {
                        let val = raw.cells[m.rawKey];
                        // Transform Logic
                        if (m.transform === "trim" && typeof val === "string") val = val.trim();
                        if (m.type === "number") {
                            const n = Number(val);
                            // Basic parsing
                            values[m.targetKey] = (val === "" || val === null || val === undefined) ? null : (isNaN(n) ? NaN : n);
                        } else if (m.type === "date") {
                            const d = new Date(val);
                            values[m.targetKey] = (val === "" || val === null || val === undefined) ? null : d;
                        } else {
                            values[m.targetKey] = val;
                        }
                    });

                    return {
                        id: raw.id,
                        __rowId: raw.id, // Legacy compat
                        values,
                        status: "PENDING", // Will validate next
                        issues: [],
                        excluded: false,
                        ...values // Spread for direct access if needed by legacy
                    } as NormalizedRow;
                });

                // state.mode = "NORMALIZED"; // Don't auto-switch, let user click "Next"

                state.auditTrail.push({
                    type: "MAPPING_UPDATE",
                    at: now,
                    payload: { mapping }
                });

                syncSnapshot(state);
            });

            // Trigger Validation
            get().validateAll();
        },

        setSpecLimits: (limits) => {
            set(state => {
                state.specLimits = { ...state.specLimits, ...limits };
            });
        },

        editCell: (rowId, colKey, value) => {
            const now = Date.now();
            set(state => {
                const row = state.normalizedRows.find(r => r.id === rowId);
                if (!row) return;

                const oldVal = row.values[colKey];
                row.values[colKey] = value;
                // Update spread prop too for legacy
                (row as any)[colKey] = value;

                state.auditTrail.push({
                    type: "CELL_EDIT",
                    at: now,
                    payload: { rowId, colKey, from: oldVal, to: value }
                });

                // Validate THIS row (optimization)
                const { status, issues } = validateRow(row, state.columnMapping, -1); // index -1 irrelevant for store logic mostly
                row.status = status;
                row.issues = issues;
            });

            // Re-aggregate Summary & Snapshot
            get().recalcSummary();
        },

        excludeFailedRows: () => {
            const now = Date.now();
            set(state => {
                const failedIds: string[] = [];
                state.normalizedRows.forEach(row => {
                    if (row.status === "FAIL" && !row.excluded) {
                        row.excluded = true;
                        failedIds.push(row.id);
                    }
                });

                if (failedIds.length > 0) {
                    state.gateDecision.excludedFailed = true;
                    state.auditTrail.push({
                        type: "EXCLUDE_ROWS",
                        at: now,
                        payload: { rowIds: failedIds, reason: "FAIL_AUTO" }
                    });

                    state.auditTrail.push({
                        type: "GATE_DECISION",
                        at: now,
                        payload: { ...state.gateDecision }
                    });
                }
            });
            get().recalcSummary();
        },

        excludeRow: (rowId: string) => {
            const now = Date.now();
            set(state => {
                const row = state.normalizedRows.find(r => r.id === rowId);
                if (row && !row.excluded) {
                    row.excluded = true;
                    state.auditTrail.push({
                        type: "EXCLUDE_ROWS",
                        at: now,
                        payload: { rowIds: [rowId], reason: "USER_EXCLUDE" }
                    });
                }
            });
            get().recalcSummary();
        },

        acceptWarningsForAnalysis: (accepted) => {
            const now = Date.now();
            set(state => {
                state.gateDecision.acceptedWarnings = accepted;
                state.auditTrail.push({
                    type: "GATE_DECISION",
                    at: now,
                    payload: { ...state.gateDecision }
                });
                syncSnapshot(state);
            });
        },

        // --- Navigation Actions ---

        setActiveStep: (step, opts) => {
            let result = { ok: true, reason: "" };
            set(state => {
                // Pre-computation to check if target is valid
                const currentSnapshot = computeStepperSnapshot({
                    activeStep: state.activeStep, // Current
                    summary: state.validationSummary,
                    gateDecision: state.gateDecision,
                    hasData: state.rawRows.length > 0,
                    hasMapping: state.columnMapping.length > 0 && state.columnMapping.some((m: any) => !!m.targetKey),
                    analysisRunAt: state.analysisRunAt,
                    exportRunAt: state.exportRunAt
                });

                const targetStatus = currentSnapshot.steps.find(s => s.key === step)?.status;

                if (targetStatus === "LOCKED" || targetStatus === "BLOCKED") {
                    result = { ok: false, reason: targetStatus };
                    return;
                }

                // Specific Check for ANALYSIS Confirm
                if (step === "ANALYSIS") {
                    if (state.validationSummary.fail === 0 && state.validationSummary.warn > 0 && !state.gateDecision.acceptedWarnings) {
                        result = { ok: false, reason: "REQUIRES_WARNING_CONFIRM" };
                        return;
                    }
                }

                // Apply
                state.activeStep = step;
                // Mode switching? 
                if (step === "IMPORT") state.mode = "RAW";
                else state.mode = "NORMALIZED"; // MAPPING/VALIDATION/etc use Normalized View

                state.auditTrail.push({
                    type: "STEP_NAV",
                    at: Date.now(),
                    payload: { from: state.stepperSnapshot.activeStep, to: step, source: opts?.source || "USER" }
                });

                syncSnapshot(state);
            });
            return result;
        },

        confirmWarningsAndEnterAnalysis: () => {
            const now = Date.now();
            set(state => {
                state.gateDecision.acceptedWarnings = true;
                state.auditTrail.push({
                    type: "GATE_DECISION",
                    at: now,
                    payload: { ...state.gateDecision, note: "Confirmed via Stepper" }
                });
                // Then jump
                state.activeStep = "ANALYSIS";
                state.mode = "NORMALIZED";
                state.auditTrail.push({
                    type: "STEP_NAV",
                    at: now,
                    payload: { from: state.stepperSnapshot.activeStep, to: "ANALYSIS", source: "SYSTEM" }
                });
                syncSnapshot(state);
            });
        },

        markAnalysisRun: () => {
            set(state => {
                state.analysisRunAt = Date.now();
                syncSnapshot(state);
            });
        },

        markExportRun: () => {
            set(state => {
                state.exportRunAt = Date.now();
                syncSnapshot(state);
            });
        },

        // Helper: Validate Everything
        validateAll: () => {
            set(state => {
                // We re-run validation on all rows
                let pass = 0, warn = 0, fail = 0;
                let excluded = 0;

                state.normalizedRows.forEach((row, idx) => {
                    // If excluded, skip logic but count
                    if (row.excluded) {
                        excluded++;
                        return;
                    }

                    const { status, issues } = validateRow(row, state.columnMapping, idx);

                    // Apply State
                    row.status = status;
                    row.issues = issues;

                    if (status === "PASS") pass++;
                    else if (status === "WARN") warn++;
                    else if (status === "FAIL") fail++;
                });

                state.validationSummary = {
                    total: state.normalizedRows.length,
                    pass, warn, fail, excluded,
                    status: fail > 0 ? "FAIL" : warn > 0 ? "WARN" : "PASS"
                };

                syncSnapshot(state);
            });
        },

        // Helper: Recalculate Summary (without re-validating everyone)
        // Used after editCell or exclude
        recalcSummary: () => {
            set(state => {
                let pass = 0, warn = 0, fail = 0;
                let excluded = 0;
                state.normalizedRows.forEach(r => {
                    if (r.excluded) {
                        excluded++;
                        return;
                    }
                    if (r.status === "PASS") pass++;
                    else if (r.status === "WARN") warn++;
                    else if (r.status === "FAIL") fail++;
                });

                state.validationSummary = {
                    total: state.normalizedRows.length,
                    pass, warn, fail, excluded,
                    status: fail > 0 ? "FAIL" : warn > 0 ? "WARN" : "PASS"
                };

                syncSnapshot(state);
            });
        },

        setFilter: (filter) => set(s => { s.ui.filter = filter }),

        setChartMode: (mode) => set(s => { s.chart.chartMode = mode }),
        setDebugMode: (mode) => set(s => { s.chart.debug.mode = mode }),
        setRawSampleSize: (n) => set(s => { s.chart.debug.rawSampleSize = n }),
        setShowRawWhenAggregated: (v) => set(s => { s.chart.debug.showRawWhenAggregated = v }),

        reset: () => set(state => {
            state.mode = "RAW";
            state.activeStep = "IMPORT";
            state.rawRows = [];
            state.normalizedRows = [];
            state.columnMapping = [];
            state.validationSummary = initialSummary;
            state.gateDecision = initialDecision;
            state.auditTrail = [];
            state.analysisRunAt = undefined;
            state.exportRunAt = undefined;
            syncSnapshot(state);
        })
    }))
);

// --- SELECTORS ---

export const getRawRowsForDebug = (state: QualityState): RawRowView[] => {
    const { chart, rawRows } = state;
    const { mode, rawSampleSize, showRawWhenAggregated, rawSampleSeed } = chart.debug;

    if (mode !== "RAW") return [];

    // If Mode is RAW
    // But chart might be AGGREGATED
    if (chart.chartMode === "AGGREGATED") {
        if (showRawWhenAggregated === "EMPTY") return [];
        // else Sampled
        return sampleDeterministic(rawRows, rawSampleSize, rawSampleSeed || 1).map((r, i) => ({
            ...r.cells,
            __rowIndex: r.__meta?.rowIndex ?? i,
            id: r.id
        }));
    }

    // If chartMode is RAW, we return all (or filtered).
    // Usually rawRows matches 1:1 with render unless filtered.
    return rawRows.map((r, i) => ({
        ...r.cells,
        __rowIndex: r.__meta?.rowIndex ?? i,
        id: r.id
    }));
};


