import { v4 as uuidv4 } from "uuid";
import type { RawRow } from "./types";

export function generateSampleData(count: number, language: "en" | "zh"): { rows: RawRow[], rawColumns: string[] } {
    const isZh = language === "zh";
    const headers = isZh
        ? ["零件号", "负载", "自由长度", "日期", "结果"]
        : ["PartNo", "Load", "FreeLength", "Date", "Result"];

    const rows: RawRow[] = new Array(count).fill(null).map((_, i) => {
        const id = uuidv4();
        // Simple procedural generation
        const partNo = isZh ? `零件-${String(i + 1).padStart(5, '0')}` : `Part-${String(i + 1).padStart(5, '0')}`;

        // Randomize some data
        const load = (100 + Math.random() * 50).toFixed(2);
        const freeLen = (25 + Math.random() * 2).toFixed(2);

        // Random Status
        const rand = Math.random();
        let result = isZh ? "合格" : "PASS";
        if (rand > 0.95) result = isZh ? "失败" : "FAIL";
        else if (rand > 0.9) result = isZh ? "警告" : "WARN";

        // Random invalid data for testing validation
        let finalLoad = load;
        if (rand > 0.99) finalLoad = "abc"; // Invalid number

        let finalDate = "2023-01-01";
        if (rand > 0.995) finalDate = "Invalid"; // Invalid date

        const cells: Record<string, string> = {};
        cells[headers[0]] = partNo;
        cells[headers[1]] = finalLoad;
        cells[headers[2]] = freeLen;
        cells[headers[3]] = finalDate;
        cells[headers[4]] = result;

        return {
            id,
            cells,
            __meta: { rowIndex: i },
            // Legacy compat if needed, but cells is primary
        };
    });

    return {
        rawColumns: headers,
        rows
    };
}
