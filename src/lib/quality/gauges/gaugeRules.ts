import { GaugeSpec, GaugeStrategy, InspectionLevel, InspectionRequirement, GaugeCategory } from "./types";
import { getToleranceByGrade } from "./tolerancePolicy";

/**
 * Gauge Rules (MMC/LMC Logic)
 * Q1: Smart Gauge Generator
 */

export function calculateGaugeDimensions(
    category: GaugeCategory,
    nominal: number,
    grade: string,
    partNo: string = "SPRING",
    rev: string = "A"
): { go: GaugeSpec; noGo: GaugeSpec } {
    const tolerance = getToleranceByGrade(grade);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

    let goVal: number;
    let noGoVal: number;
    let tolVal: number;

    switch (category) {
        case "OD":
            tolVal = tolerance.values.diameter;
            goVal = nominal + tolVal; // MMC for OD is Max OD
            noGoVal = nominal - tolVal; // LMC for OD is Min OD
            break;
        case "ID":
            tolVal = tolerance.values.diameter;
            goVal = nominal - tolVal; // MMC for ID is Min ID
            noGoVal = nominal + tolVal; // LMC for ID is Max ID
            break;
        case "LENGTH":
            tolVal = tolerance.values.length;
            goVal = nominal + tolVal; // Max Length
            noGoVal = nominal - tolVal; // Min Length
            break;
        case "ARC_ANGLE":
            tolVal = tolerance.values.arcAngle ?? 3; // Default ±3°
            goVal = nominal + tolVal; // Max Angle
            noGoVal = nominal - tolVal; // Min Angle
            break;
        case "ARC_RADIUS":
            // Arc radius tolerance is percentage-based
            const radiusTolPercent = tolerance.values.arcRadius ?? 3; // Default ±3%
            tolVal = nominal * (radiusTolPercent / 100);
            goVal = nominal + tolVal; // Max Radius
            noGoVal = nominal - tolVal; // Min Radius
            break;
        default:
            throw new Error(`Unsupported gauge category: ${category}`);
    }

    const goSpec: GaugeSpec = {
        id: `G-${category}-GO-${partNo}`,
        type: "GO",
        category,
        targetValue: Number(goVal.toFixed(3)),
        boundaryValue: category === "OD" || category === "LENGTH" ? nominal + tolVal : nominal - tolVal,
        label: `${partNo} REV${rev} ${category} GO ${goVal.toFixed(2)}`,
        filename: `${partNo}_${category}_GO_${goVal.toFixed(2)}mm_rev${rev}_${dateStr}.stl`,
        notesEn: `GO gauge checks Maximum Material Condition (MMC) for ${category}. Part must pass through or fit over.`,
        notesZh: `GO 检具检查 ${category} 的最大实体状况 (MMC)。零件必须能顺利通过或套入。`,
    };

    const noGoSpec: GaugeSpec = {
        id: `G-${category}-NOGO-${partNo}`,
        type: "NO-GO",
        category,
        targetValue: Number(noGoVal.toFixed(3)),
        boundaryValue: category === "OD" || category === "LENGTH" ? nominal - tolVal : nominal + tolVal,
        label: `${partNo} REV${rev} ${category} NOGO ${noGoVal.toFixed(2)}`,
        filename: `${partNo}_${category}_NOGO_${noGoVal.toFixed(2)}mm_rev${rev}_${dateStr}.stl`,
        notesEn: `NO-GO gauge checks Least Material Condition (LMC) for ${category}. Part must NOT pass through or fit over.`,
        notesZh: `NO-GO 检具检查 ${category} 的最小实体状况 (LMC)。零件绝对不能通过或套入。`,
    };

    return { go: goSpec, noGo: noGoSpec };
}

/**
 * Resolve Inspection Strategy based on deliverables
 */
export function generateGaugeStrategy(
    designSummary: any,
    deliverabilityAudit: any,
    partNo: string = "SN-001"
): GaugeStrategy {
    const requirements: InspectionRequirement[] = [];
    const gauges: GaugeSpec[] = [];
    let overallLevel: InspectionLevel = "OPTIONAL";

    // 1. Analyze Deliverability Constraints
    if (deliverabilityAudit.level === "ULTRA_PRECISION") {
        requirements.push({
            category: "Dimensional Control",
            level: "MANDATORY",
            reasonEn: "Ultra-precision tolerance requires physical GO/NO-GO verification.",
            reasonZh: "超高精度公差要求必须使用物理 GO/NO-GO 检具验证。",
        });
        overallLevel = "MANDATORY";
    } else if (deliverabilityAudit.level === "CHALLENGING") {
        requirements.push({
            category: "Precision Control",
            level: "RECOMMENDED",
            reasonEn: "Tight tolerances suggest gauge verification to ensure assembly fit.",
            reasonZh: "紧公差建议使用检具验证以确保装配配合性。",
        });
        overallLevel = "RECOMMENDED";
    }

    // 2. Generate Gauge Specs if needed
    const grade = designSummary.toleranceGrade || "GRADE_2";

    // OD Gauges
    if (designSummary.OD) {
        const odGauges = calculateGaugeDimensions("OD", designSummary.OD, grade, partNo);
        gauges.push(odGauges.go, odGauges.noGo);
    }

    // ID Gauges
    if (designSummary.ID) {
        const idGauges = calculateGaugeDimensions("ID", designSummary.ID, grade, partNo);
        gauges.push(idGauges.go, idGauges.noGo);
    }

    // Length Gauges
    if (designSummary.L0) {
        const lGauges = calculateGaugeDimensions("LENGTH", designSummary.L0, grade, partNo);
        gauges.push(lGauges.go, lGauges.noGo);
    }

    // Arc Spring Specific Gauges
    if (designSummary.arcAngle_deg) {
        requirements.push({
            category: "Arc Geometry",
            level: "MANDATORY",
            reasonEn: "Arc angle is critical for proper spring function and assembly fit.",
            reasonZh: "弧形角度对弹簧功能和装配配合至关重要。",
        });
        const angleGauges = calculateGaugeDimensions("ARC_ANGLE", designSummary.arcAngle_deg, grade, partNo);
        gauges.push(angleGauges.go, angleGauges.noGo);
    }

    if (designSummary.arcRadius_mm) {
        requirements.push({
            category: "Arc Radius",
            level: "MANDATORY",
            reasonEn: "Arc radius determines curvature and must match mating geometry.",
            reasonZh: "弧形半径决定曲率，必须与配合几何体匹配。",
        });
        const radiusGauges = calculateGaugeDimensions("ARC_RADIUS", designSummary.arcRadius_mm, grade, partNo);
        gauges.push(radiusGauges.go, radiusGauges.noGo);
    }

    return {
        requirements,
        gauges,
        overallLevel
    };
}
