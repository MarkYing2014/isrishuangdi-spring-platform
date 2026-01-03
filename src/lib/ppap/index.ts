/**
 * PPAP Module Exports
 * Barrel file for all PPAP-related functionality
 */

// Types
export * from "./types";

// Checklist
export { createDefaultChecklist, getChecklistTemplate } from "./checklist";

// Repository
export { PpapRepository, PswRepository, seedDemoData } from "./repository";

// State Machine
export { computePpapReadiness, canTransition, STATUS_LABELS } from "./stateMachine";

// PSW Generator
export { generatePswFields, validateAndGeneratePsw, generatePswPdfUrl } from "./pswGenerator";

// Action Map
export {
    PPAP_ITEM_ACTION_MAP,
    resolveChecklistAction,
    type ActionContext,
    type ResolvedAction,
    type LinkMode,
    type ActionKind,
} from "./actionMap";
