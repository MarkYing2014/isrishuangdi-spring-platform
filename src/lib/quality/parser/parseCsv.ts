import * as XLSX from 'xlsx';
import type { CellValue } from '../sheetTypes';

export interface ParseResult {
    headers: string[];
    rows: Record<string, CellValue>[];
    meta: {
        sheetName?: string;
        totalRows: number;
        error?: string;
    };
}

export async function parseCsv(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
                    defval: null, // Default value for empty cells
                    raw: true     // Keep raw values (don't force string)
                });

                if (rawRows.length === 0) {
                    resolve({ headers: [], rows: [], meta: { totalRows: 0 } });
                    return;
                }

                // Extract headers from the first row keys
                const headers = Object.keys(rawRows[0]);

                resolve({
                    headers,
                    rows: rawRows as Record<string, CellValue>[],
                    meta: {
                        sheetName: firstSheetName,
                        totalRows: rawRows.length
                    }
                });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
}
