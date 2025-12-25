/**
 * Comparison Engine
 * Provides semantic comparison data for the UI.
 */

import { SavedDesign } from "@/lib/stores/springDesignStore";
import { ComparisonKey, COMPARISON_ROWS, ComparisonRowDefinition } from "./types";
import { extractSemanticValue } from "./mapping";

export interface ComparisonCell {
    value: any;
    formattedValue: string;
    id: string;
    isBest?: boolean;
}

export interface ComparisonRowResult {
    definition: ComparisonRowDefinition;
    cells: ComparisonCell[];
}

export class ComparisonEngine {
    /**
     * Generates the matrix data for the comparison table.
     */
    static getComparisonMatrix(designs: SavedDesign[]): ComparisonRowResult[] {
        return COMPARISON_ROWS.map(rowDef => {
            const cells: ComparisonCell[] = designs.map(design => {
                const val = extractSemanticValue(design, rowDef.key);
                return {
                    id: design.id,
                    value: val,
                    formattedValue: this.formatValue(val, rowDef),
                };
            });

            // Simple "Best Value" indicator
            if (rowDef.isPositiveImprovement !== undefined && cells.length > 1) {
                const numericValues = cells
                    .map(c => typeof c.value === "number" ? c.value : null)
                    .filter((v): v is number => v !== null);

                if (numericValues.length > 0) {
                    const bestVal = rowDef.isPositiveImprovement
                        ? Math.max(...numericValues)
                        : Math.min(...numericValues);

                    cells.forEach(c => {
                        if (c.value === bestVal) c.isBest = true;
                    });
                }
            }

            return {
                definition: rowDef,
                cells,
            };
        });
    }

    private static formatValue(val: any, row: ComparisonRowDefinition): string {
        if (val === null || val === undefined || isNaN(val as any)) return "—";
        if (typeof val === "string") return val;
        if (typeof val === "number") {
            return val.toFixed(row.precision ?? 0);
        }
        return String(val);
    }
}
