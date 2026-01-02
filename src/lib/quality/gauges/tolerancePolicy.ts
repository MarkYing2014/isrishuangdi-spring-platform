import { ToleranceMapping } from "./types";

/**
 * Tolerance Policy (Grade to Value Mapping)
 * manage tolerance values centrally.
 */

export const TOLERANCE_GRADES: Record<string, ToleranceMapping> = {
    "GRADE_1": {
        grade: "Grade 1 (Precision)",
        values: {
            diameter: 0.05, // ± 0.05mm
            length: 0.1,    // ± 0.1mm
            load: 5,        // ± 5%
            arcAngle: 2,    // ± 2°
            arcRadius: 2,   // ± 2%
        }
    },
    "GRADE_2": {
        grade: "Grade 2 (Standard)",
        values: {
            diameter: 0.1,  // ± 0.1mm
            length: 0.2,    // ± 0.2mm
            load: 10,       // ± 10%
            arcAngle: 3,    // ± 3°
            arcRadius: 3,   // ± 3%
        }
    },
    "GRADE_3": {
        grade: "Grade 3 (Coarse)",
        values: {
            diameter: 0.2,  // ± 0.2mm
            length: 0.5,    // ± 0.5mm
            load: 15,       // ± 15%
            arcAngle: 5,    // ± 5°
            arcRadius: 5,   // ± 5%
        }
    },
    "ULTRA_PRECISION": {
        grade: "Ultra Precision",
        values: {
            diameter: 0.02,
            length: 0.05,
            load: 1.5,
            arcAngle: 1,    // ± 1°
            arcRadius: 1,   // ± 1%
        }
    }
};


/**
 * Helper to get tolerance for a given grade
 */
export function getToleranceByGrade(grade: string = "GRADE_2"): ToleranceMapping {
    return TOLERANCE_GRADES[grade] || TOLERANCE_GRADES["GRADE_2"];
}
