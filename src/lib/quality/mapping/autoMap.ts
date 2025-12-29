import type { ColumnMapping } from '../sheetTypes';

// Common synonyms for simplified fuzzy matching
const DICTIONARY: Record<string, string[]> = {
    "load": ["load", "force", "f", "p1", "p2", "l1", "l2", "val", "value", "reading", "result"],
    "freelength": ["l0", "free", "length", "freelength", "h0"],
    "rate": ["k", "rate", "stiffness", "r"],
    "solidheight": ["ls", "solid", "height"],
    "partid": ["part", "partno", "item", "product", "spec"],
    "lot": ["batch", "lot", "serial", "sn", "id"],
    "date": ["time", "date", "timestamp", "created"],
    "value": ["value", "val", "measurement", "reading", "data", "result", "actual"],
    "lsl": ["lsl", "lower", "lowerlimit", "lowerspec", "min", "minimum"],
    "usl": ["usl", "upper", "upperlimit", "upperspec", "max", "maximum"],
    "target": ["target", "nominal", "nom", "aim", "goal"],
    "characteristic": ["characteristic", "char", "parameter", "param", "feature", "dimension", "dim"],
};

// Internal Schema we want to map TO
const SYSTEM_FIELDS = [
    { key: "partId", label: "Part No.", type: "string" },
    { key: "lot", label: "Lot No.", type: "string" },
    { key: "timestamp", label: "Date", type: "date" },
    { key: "value", label: "Value (Measurement)", type: "number" },
    { key: "lsl", label: "LSL (Lower Spec)", type: "number" },
    { key: "usl", label: "USL (Upper Spec)", type: "number" },
    { key: "target", label: "Target/Nominal", type: "number" },
    { key: "characteristic", label: "Characteristic", type: "string" },
    { key: "load_p1", label: "Load (P1)", type: "number" },
    { key: "load_p2", label: "Load (P2)", type: "number" },
    { key: "freeLength", label: "Free Length", type: "number" },
    { key: "springRate", label: "Rate (k)", type: "number" },
    { key: "solidHeight", label: "Solid Height", type: "number" },
] as const;

export function generateAutoMapping(rawHeaders: string[]): ColumnMapping[] {
    const mapping: ColumnMapping[] = [];
    const usedTargets = new Set<string>();

    // 1. Exact Match First
    for (const header of rawHeaders) {
        const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Find best candidate
        let bestTarget: string | null = null;

        for (const sysField of SYSTEM_FIELDS) {
            if (usedTargets.has(sysField.key)) continue;

            // Check dictionary
            const synonyms = DICTIONARY[sysField.key.split('_')[0]] || [sysField.key]; // naive split for load_p1 -> load
            if (synonyms.some(s => cleanHeader.includes(s))) {
                // Very naive "includes" check - can be improved with Levenshtein
                // Priority: Exact match -> Contains -> Dictionary
                if (cleanHeader === sysField.key.toLowerCase()) {
                    bestTarget = sysField.key;
                    break; // Found perfect match
                }
                if (!bestTarget) bestTarget = sysField.key; // Keep as candidate
            }
        }

        if (bestTarget) {
            const sysDef = SYSTEM_FIELDS.find(f => f.key === bestTarget)!;
            mapping.push({
                raw: header,
                target: bestTarget,
                type: sysDef.type as any,
                required: false // Default to false
            });
            usedTargets.add(bestTarget);
        }
    }

    return mapping;
}

export { SYSTEM_FIELDS };
