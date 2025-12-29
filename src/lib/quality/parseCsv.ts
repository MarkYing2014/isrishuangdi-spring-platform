import { v4 as uuidv4 } from "uuid";

export type QualityRawRow = Record<string, any> & { __rowId: string };

export interface QualityImportResult {
    rawColumns: string[];
    rows: QualityRawRow[];
}

export function parseCsv(text: string): QualityImportResult {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) return { rawColumns: [], rows: [] };

    // Simple Split (TODO: Handle quotes)
    const headers = lines[0].split(",").map(h => h.trim());

    // Parse Rows
    const rows: QualityRawRow[] = lines.slice(1).map(line => {
        const vals = line.split(",");
        const row: Record<string, any> = { __rowId: uuidv4() };
        headers.forEach((h, idx) => {
            // Basic value clean
            row[h] = vals[idx]?.trim();
        });
        return row as QualityRawRow;
    });

    return {
        rawColumns: headers,
        rows
    };
}
