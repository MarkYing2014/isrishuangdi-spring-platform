import type { CellValue } from '../sheetTypes';

export function isRequired(value: CellValue): boolean {
    if (value === null || value === undefined || value === "") return false;
    return true;
}

export function isNumber(value: CellValue): boolean {
    if (typeof value === "number" && !isNaN(value) && isFinite(value)) return true;
    if (typeof value === "string") {
        const parsed = parseFloat(value);
        return !isNaN(parsed) && isFinite(parsed);
    }
    return false;
}

export function inRange(value: CellValue, min: number, max: number): boolean {
    if (!isNumber(value)) return false;
    const num = typeof value === "string" ? parseFloat(value) : (value as number);
    return num >= min && num <= max;
}

export function isDate(value: CellValue): boolean {
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === "string") {
        const d = new Date(value);
        return !isNaN(d.getTime());
    }
    return false;
}
