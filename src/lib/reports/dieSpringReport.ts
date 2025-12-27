/**
 * Die Spring OEM Report Generator
 * 模具弹簧OEM工程报告生成器
 * 
 * Generates ISO 10243 / Raymond compliant engineering reports
 * for OEM customers with full traceability.
 * 
 * @module reports/dieSpringReport
 */

import {
    DieSpringSpec,
    DieSpringInstallation,
    DieSpringAuditResult,
    DieSpringLoadResult,
    DieSpringLifeClass,
    SERIES_INFO,
    DUTY_CLASS_INFO,
    LIFE_CLASS_INFO,
    COLOR_HEX,
} from "@/lib/dieSpring/types";
import {
    computeDieSpringLoad,
    auditDieSpring,
    getStrokeLimitForLifeClass,
    getMaxPhysicalStroke,
    getSlendernessRatio,
    getMeanDiameter,
} from "@/lib/dieSpring";

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface DieSpringReportHeader {
    reportId: string;
    generatedAt: string;
    standard: string;
    revision: string;
    customer?: string;
    project?: string;
}

export interface DieSpringReportSpec {
    catalogId: string;
    series: string;
    duty: string;
    colorCode: string;
    colorHex: string;
    outerDiameter: number;
    innerDiameter: number;
    freeLength: number;
    solidHeight: number;
    wireWidth: number;
    wireThickness: number;
    activeCoils: number;
    springRate: number;
    material: string;
    source: string;
}

export interface DieSpringReportLimits {
    lifeClass: string;
    lifeClassDescription: string;
    strokeLimitLong: number;
    strokeLimitNormal: number;
    strokeLimitMax: number;
    selectedStrokeLimit: number;
    maxPhysicalStroke: number;
    effectiveMaxStroke: number;
}

export interface DieSpringReportOperating {
    appliedStroke: number;
    workingHeight: number;
    calculatedLoad: number;
    preloadStroke?: number;
    preloadForce?: number;
    strokeUtilization: number;
    remainingTravel: number;
    pocketDiameter?: number;
    guideRodDiameter?: number;
    pocketClearance?: number;
    rodClearance?: number;
}

export interface DieSpringReportAudit {
    overallStatus: "PASS" | "WARN" | "FAIL";
    findings: {
        rule: string;
        status: "PASS" | "WARN" | "FAIL";
        message: string;
        value?: string;
        limit?: string;
    }[];
}

export interface DieSpringReportGeometry {
    meanDiameter: number;
    slendernessRatio: number;
    aspectRatio: number;
    btRatio: number;
}

export interface DieSpringOEMReport {
    header: DieSpringReportHeader;
    spec: DieSpringReportSpec;
    limits: DieSpringReportLimits;
    operating: DieSpringReportOperating;
    geometry: DieSpringReportGeometry;
    audit: DieSpringReportAudit;
    certification: {
        catalogLocked: boolean;
        standardCompliant: boolean;
        auditPassed: boolean;
        signatureBlock: string;
    };
    torsionalAudit?: {
        systemResult: "PASS" | "WARN" | "FAIL" | "INFO";
        thetaSafeSystemDeg: number;
        thetaOperatingDeg?: number;
        governingStageId: string;
        governingLimitCode: string;
        conformsToCustomerRange: boolean;
        conformanceStatus: "YES" | "NO" | "NOT_EVALUATED";
        deviationRequired: boolean;
        deviationReasonCode?: string;
        drawingNumber?: string;
        drawingRevision?: string;
        assumptions?: string[];
    };
}

// ============================================================================
// REPORT GENERATOR
// ============================================================================

export interface GenerateDieSpringReportParams {
    /** Die spring specification from catalog */
    spec: DieSpringSpec;
    /** Installation parameters */
    installation: DieSpringInstallation;
    /** Language preference */
    isZh?: boolean;
    /** Optional customer name */
    customer?: string;
    /** Optional project name */
    project?: string;
    /** Optional Torsional System Analysis (Phase 8) */
    torsionalAnalysis?: import("@/lib/dieSpring/torsionalIntegration").DieSpringSystemAnalysis;
}

/**
 * Generate an OEM-grade die spring engineering report
 */
export function generateDieSpringOEMReport(
    params: GenerateDieSpringReportParams
): DieSpringOEMReport {
    const { spec, installation, isZh = false, customer, project, torsionalAnalysis } = params;

    // Compute load and audit
    const loadResult = computeDieSpringLoad(spec, installation);
    const auditResult = auditDieSpring(spec, installation);

    // Get series and duty info
    const seriesInfo = SERIES_INFO[spec.series];
    const dutyInfo = DUTY_CLASS_INFO[spec.duty];
    const lifeInfo = LIFE_CLASS_INFO[installation.lifeClass];

    // Calculate geometry values
    const meanDiameter = getMeanDiameter(spec);
    const slendernessRatio = getSlendernessRatio(spec);
    const maxPhysicalStroke = getMaxPhysicalStroke(spec);
    const selectedStrokeLimit = getStrokeLimitForLifeClass(spec.strokeLimits, installation.lifeClass);

    // Build header
    const header: DieSpringReportHeader = {
        reportId: `DS-${spec.id}-${Date.now().toString(36).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        standard: isZh ? seriesInfo.name.zh : seriesInfo.name.en,
        revision: "1.0",
        customer,
        project,
    };

    // Build spec section
    const reportSpec: DieSpringReportSpec = {
        catalogId: spec.id,
        series: isZh ? seriesInfo.name.zh : seriesInfo.name.en,
        duty: isZh ? dutyInfo.name.zh : dutyInfo.name.en,
        colorCode: spec.colorCode,
        colorHex: COLOR_HEX[spec.colorCode],
        outerDiameter: spec.outerDiameter,
        innerDiameter: spec.innerDiameter,
        freeLength: spec.freeLength,
        solidHeight: spec.solidHeight,
        wireWidth: spec.wireWidth,
        wireThickness: spec.wireThickness,
        activeCoils: spec.activeCoils,
        springRate: spec.springRate,
        material: spec.material,
        source: `${spec.source.vendor} ${spec.source.document}`,
    };

    // Build limits section
    const limits: DieSpringReportLimits = {
        lifeClass: isZh ? lifeInfo.name.zh : lifeInfo.name.en,
        lifeClassDescription: isZh ? lifeInfo.description.zh : lifeInfo.description.en,
        strokeLimitLong: spec.strokeLimits.long,
        strokeLimitNormal: spec.strokeLimits.normal,
        strokeLimitMax: spec.strokeLimits.max,
        selectedStrokeLimit,
        maxPhysicalStroke,
        effectiveMaxStroke: Math.min(spec.strokeLimits.max, maxPhysicalStroke),
    };

    // Build operating section
    const operating: DieSpringReportOperating = {
        appliedStroke: installation.appliedStroke,
        workingHeight: loadResult.workingHeight,
        calculatedLoad: loadResult.force,
        preloadStroke: installation.preloadStroke,
        preloadForce: loadResult.preloadForce,
        strokeUtilization: loadResult.utilizationLife,
        remainingTravel: loadResult.remainingTravel,
        pocketDiameter: installation.pocketDiameter,
        guideRodDiameter: installation.guideRodDiameter,
        pocketClearance: installation.pocketDiameter
            ? installation.pocketDiameter - spec.outerDiameter
            : undefined,
        rodClearance: installation.guideRodDiameter
            ? spec.innerDiameter - installation.guideRodDiameter
            : undefined,
    };

    // Build geometry section
    const geometry: DieSpringReportGeometry = {
        meanDiameter,
        slendernessRatio,
        aspectRatio: spec.freeLength / spec.outerDiameter,
        btRatio: spec.wireWidth / spec.wireThickness,
    };

    // Build audit section
    const audit: DieSpringReportAudit = {
        overallStatus: auditResult.status,
        findings: auditResult.findings.map((f) => ({
            rule: f.ruleId,
            status: f.status,
            message: isZh ? f.message.zh : f.message.en,
            value: f.value !== undefined ? f.value.toFixed(2) : undefined,
            limit: f.limit !== undefined ? f.limit.toFixed(2) : undefined,
        })),
    };

    // Build certification
    const certification = {
        catalogLocked: true,
        standardCompliant: spec.series === "ISO_10243",
        auditPassed: auditResult.status === "PASS",
        signatureBlock: isZh
            ? "本报告基于目录数据生成，几何参数不可修改。审核人: _______________"
            : "This report is generated from catalog data. Geometry is locked. Reviewed by: _______________",
    };

    // Build torsional audit section (Phase 8)
    let torsionalAudit: DieSpringOEMReport["torsionalAudit"] = undefined;
    if (torsionalAnalysis) {
        const { systemCurve, customerDrawing, operatingRequirement } = torsionalAnalysis;
        torsionalAudit = {
            systemResult: systemCurve.systemResult,
            thetaSafeSystemDeg: systemCurve.thetaSafeSystemDeg,
            thetaOperatingDeg: operatingRequirement?.angleDeg,
            governingStageId: systemCurve.governingStageId,
            governingLimitCode: systemCurve.governing.code,
            conformsToCustomerRange: systemCurve.conformsToCustomerRange,
            conformanceStatus: systemCurve.systemResult === "INFO" ? "NOT_EVALUATED" : (systemCurve.conformsToCustomerRange ? "YES" : "NO"),
            deviationRequired: systemCurve.deviationRequired,
            deviationReasonCode: systemCurve.deviationRequired ? systemCurve.governing.code : undefined,
            drawingNumber: customerDrawing?.number,
            drawingRevision: customerDrawing?.revision,
            assumptions: torsionalAnalysis.assumptions
        };
    }

    return {
        header,
        spec: reportSpec,
        limits,
        operating,
        geometry,
        audit,
        certification,
        torsionalAudit
    };
}

// ============================================================================
// HTML REPORT GENERATOR
// ============================================================================

/**
 * Generate HTML report for printing/PDF
 */
export function generateDieSpringReportHtml(report: DieSpringOEMReport, isZh = false): string {
    const statusColor = report.audit.overallStatus === "PASS"
        ? "#22c55e"
        : report.audit.overallStatus === "WARN"
            ? "#eab308"
            : "#ef4444";

    const t = {
        title: isZh ? "模具弹簧工程报告" : "Die Spring Engineering Report",
        reportId: isZh ? "报告编号" : "Report ID",
        date: isZh ? "生成日期" : "Generated",
        standard: isZh ? "标准" : "Standard",
        customer: isZh ? "客户" : "Customer",
        project: isZh ? "项目" : "Project",
        specification: isZh ? "弹簧规格" : "Spring Specification",
        operating: isZh ? "工作参数" : "Operating Parameters",
        limits: isZh ? "行程限制" : "Stroke Limits",
        audit: isZh ? "工厂审核" : "Factory Audit",
        certification: isZh ? "认证" : "Certification",
        catalogId: isZh ? "目录编号" : "Catalog ID",
        series: isZh ? "系列" : "Series",
        duty: isZh ? "负载等级" : "Duty",
        od: isZh ? "外径" : "Outer Dia.",
        id: isZh ? "内径" : "Inner Dia.",
        freeLength: isZh ? "自由长度" : "Free Length",
        solidHeight: isZh ? "固高" : "Solid Height",
        springRate: isZh ? "刚度" : "Spring Rate",
        material: isZh ? "材料" : "Material",
        appliedStroke: isZh ? "应用行程" : "Applied Stroke",
        workingHeight: isZh ? "工作高度" : "Working Height",
        load: isZh ? "计算载荷" : "Calculated Load",
        utilization: isZh ? "使用率" : "Utilization",
        remaining: isZh ? "剩余行程" : "Remaining",
        status: isZh ? "状态" : "Status",
        pass: isZh ? "通过" : "PASS",
        warn: isZh ? "警告" : "WARN",
        fail: isZh ? "失败" : "FAIL",
    };

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t.title} - ${report.header.reportId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1a1a1a; }
    .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .header .meta { font-size: 12px; color: #666; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .field { }
    .field-label { font-size: 10px; color: #666; text-transform: uppercase; }
    .field-value { font-size: 14px; font-weight: 600; font-family: monospace; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; color: white; }
    .finding { padding: 8px; margin-bottom: 4px; border-radius: 4px; font-size: 12px; }
    .finding-pass { background: #dcfce7; }
    .finding-warn { background: #fef9c3; }
    .finding-fail { background: #fee2e2; }
    .color-swatch { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 1px solid #ccc; vertical-align: middle; margin-right: 4px; }
    .certification { background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 24px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t.title}</h1>
    <div class="meta">
      <strong>${t.reportId}:</strong> ${report.header.reportId} &nbsp;|&nbsp;
      <strong>${t.date}:</strong> ${new Date(report.header.generatedAt).toLocaleDateString()} &nbsp;|&nbsp;
      <strong>${t.standard}:</strong> ${report.header.standard}
      ${report.header.customer ? `&nbsp;|&nbsp; <strong>${t.customer}:</strong> ${report.header.customer}` : ""}
      ${report.header.project ? `&nbsp;|&nbsp; <strong>${t.project}:</strong> ${report.header.project}` : ""}
    </div>
  </div>

  <div class="section">
    <h2>${t.specification}</h2>
    <div class="grid">
      <div class="field"><div class="field-label">${t.catalogId}</div><div class="field-value">${report.spec.catalogId}</div></div>
      <div class="field"><div class="field-label">${t.series}</div><div class="field-value">${report.spec.series}</div></div>
      <div class="field"><div class="field-label">${t.duty}</div><div class="field-value"><span class="color-swatch" style="background:${report.spec.colorHex}"></span>${report.spec.duty}</div></div>
      <div class="field"><div class="field-label">${t.material}</div><div class="field-value">${report.spec.material}</div></div>
      <div class="field"><div class="field-label">${t.od}</div><div class="field-value">${report.spec.outerDiameter} mm</div></div>
      <div class="field"><div class="field-label">${t.id}</div><div class="field-value">${report.spec.innerDiameter} mm</div></div>
      <div class="field"><div class="field-label">${t.freeLength}</div><div class="field-value">${report.spec.freeLength} mm</div></div>
      <div class="field"><div class="field-label">${t.solidHeight}</div><div class="field-value">${report.spec.solidHeight} mm</div></div>
      <div class="field"><div class="field-label">${t.springRate}</div><div class="field-value">${report.spec.springRate} N/mm</div></div>
    </div>
  </div>

  <div class="section">
    <h2>${t.operating}</h2>
    <div class="grid">
      <div class="field"><div class="field-label">${t.appliedStroke}</div><div class="field-value">${report.operating.appliedStroke.toFixed(1)} mm</div></div>
      <div class="field"><div class="field-label">${t.workingHeight}</div><div class="field-value">${report.operating.workingHeight.toFixed(1)} mm</div></div>
      <div class="field"><div class="field-label">${t.load}</div><div class="field-value">${report.operating.calculatedLoad.toFixed(1)} N</div></div>
      <div class="field"><div class="field-label">${t.utilization}</div><div class="field-value">${report.operating.strokeUtilization.toFixed(1)}%</div></div>
      <div class="field"><div class="field-label">${t.remaining}</div><div class="field-value">${report.operating.remainingTravel.toFixed(1)} mm</div></div>
    </div>
  </div>

  <div class="section">
    <h2>${t.audit} <span class="status-badge" style="background:${statusColor}">${t[report.audit.overallStatus.toLowerCase() as "pass" | "warn" | "fail"]}</span></h2>
    ${report.audit.findings.map(f => `
      <div class="finding finding-${f.status.toLowerCase()}">
        <strong>[${f.rule}]</strong> ${f.message}
        ${f.value ? `(${f.value}${f.limit ? ` / limit: ${f.limit}` : ""})` : ""}
      </div>
    `).join("")}
  </div>

  ${report.torsionalAudit ? `
  <div class="section" style="border: 1px solid ${report.torsionalAudit.systemResult === "PASS" ? "#22c55e" : report.torsionalAudit.systemResult === "WARN" ? "#eab308" : report.torsionalAudit.systemResult === "FAIL" ? "#ef4444" : "#64748b"}; padding: 16px; border-radius: 8px; background: #f8fafc;">
    <h2 style="border:none; margin-top:0;">Torsional System Audit Summary (系统扭矩审计) 
        <span class="status-badge" style="background:${report.torsionalAudit.systemResult === "PASS" ? "#22c55e" : report.torsionalAudit.systemResult === "WARN" ? "#eab308" : report.torsionalAudit.systemResult === "FAIL" ? "#ef4444" : "#64748b"}">${report.torsionalAudit.systemResult}</span>
    </h2>
    <div class="grid">
      <div class="field"><div class="field-label">Drawing No.</div><div class="field-value">${report.torsionalAudit.drawingNumber || "N/A"}</div></div>
      <div class="field"><div class="field-label">Revision</div><div class="field-value">${report.torsionalAudit.drawingRevision || "N/A"}</div></div>
      <div class="field"><div class="field-label">Safe Angle (θ_safe)</div><div class="field-value">${report.torsionalAudit.thetaSafeSystemDeg.toFixed(2)}°</div></div>
      <div class="field"><div class="field-label">Governing Bottleneck</div><div class="field-value">Stage ${report.torsionalAudit.governingStageId} / ${report.torsionalAudit.governingLimitCode}</div></div>
      <div class="field"><div class="field-label">Conforms to Range</div><div class="field-value">${report.torsionalAudit.conformanceStatus}</div></div>
      <div class="field"><div class="field-label">Deviation Required</div><div class="field-value">${report.torsionalAudit.deviationRequired ? "YES" : "NO"}</div></div>
    </div>
    ${report.torsionalAudit.assumptions && report.torsionalAudit.assumptions.length > 0 ? `
    <div style="margin-top:12px; font-size: 11px;">
        <strong>Assumptions (审计假设)</strong>:
        <ul style="margin: 4px 0 0 16px; padding: 0;">
            ${report.torsionalAudit.assumptions.map(a => `<li>${a}</li>`).join("")}
        </ul>
    </div>
    ` : ""}
    <div style="margin-top:12px; padding: 10px; background: white; border: 1px border-slate-200; border-radius: 6px; font-size: 11px;">
        <strong style="display:block; margin-bottom:4px; color:#334155; text-transform:uppercase; letter-spacing:0.025em;">Technical Calculations (工程计算基础)</strong>
        <div style="font-family: monospace; color: #0f172a; margin-bottom: 6px; padding: 6px; background: #f1f5f9; border-radius: 4px;">
            K_θ (System) = Σ [ k_i × R_i² ]
        </div>
        <p style="margin:0; color:#64748b; line-height:1.4;">
            The torsional stiffness is dominated by the square of the projection radius (R² dominance). Individual stage stroke (s_i) at any system angle (θ) is derived as s_i = θ(rad) × R_i.
        </p>
    </div>
    <div style="margin-top:12px; padding-top:12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #475569;">
        <strong>Audit Basis</strong>: stroke = θ(rad) × R. Compliance determined by 80% safety threshold. No design authority performed by manufacturer. This conclusion is deterministic based on provided customer inputs.
    </div>
  </div>
  ` : ""}

  <div class="certification">
    <h2>${t.certification}</h2>
    <p>${report.certification.signatureBlock}</p>
  </div>
</body>
</html>`;
}

export default generateDieSpringOEMReport;
