import * as XLSX from 'xlsx';
import type { CellValue } from '../sheetTypes';
import type { ParseResult } from './parseCsv';

export async function parseXlsx(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' }); // XLSX needs array buffer usually

                // Default to first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
                    defval: null,
                    raw: true
                });

                if (rawRows.length === 0) {
                    resolve({ headers: [], rows: [], meta: { totalRows: 0 } });
                    return;
                }

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
        reader.readAsArrayBuffer(file);
    });
}
