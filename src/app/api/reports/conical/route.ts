import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createElement } from "react";
import type { ConicalDesignReportData } from "@/lib/reports/conicalReport";

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #16a34a",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e293b",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "40%",
    color: "#64748b",
  },
  value: {
    width: "60%",
    fontWeight: "bold",
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 6,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1px solid #e2e8f0",
  },
  tableRowHighlight: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#dcfce7",
  },
  tableCell: {
    flex: 1,
  },
  tableCellSmall: {
    width: "15%",
  },
  resultsBox: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 4,
    border: "1px solid #bbf7d0",
  },
  resultRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  resultLabel: {
    width: "50%",
    color: "#166534",
  },
  resultValue: {
    width: "50%",
    fontWeight: "bold",
    color: "#14532d",
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
  },
  warning: {
    backgroundColor: "#fef3c7",
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
    color: "#92400e",
    fontSize: 9,
  },
});

// PDF Document Component
function ConicalReportPDF({ data }: { data: ConicalDesignReportData }) {
  const formatNumber = (value: number, decimals = 2) => 
    Number(value.toFixed(decimals)).toLocaleString();

  return createElement(Document, {},
    createElement(Page, { size: "A4", style: styles.page },
      // Header
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.title }, "Conical Spring Design Report"),
        createElement(Text, { style: styles.subtitle }, 
          `Generated: ${new Date(data.generatedAt).toLocaleString()}`
        )
      ),

      // Design Summary
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Design Summary / 设计概要"),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Large Diameter D₁:"),
          createElement(Text, { style: styles.value }, `${formatNumber(data.largeDiameter)} mm`)
        ),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Small Diameter D₂:"),
          createElement(Text, { style: styles.value }, `${formatNumber(data.smallDiameter)} mm`)
        ),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Wire Diameter d:"),
          createElement(Text, { style: styles.value }, `${formatNumber(data.wireDiameter)} mm`)
        ),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Active Coils Na:"),
          createElement(Text, { style: styles.value }, `${data.activeCoils}`)
        ),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Free Length L₀:"),
          createElement(Text, { style: styles.value }, `${formatNumber(data.freeLength)} mm`)
        ),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Solid Height H_solid:"),
          createElement(Text, { style: styles.value }, `${formatNumber(data.solidHeight)} mm`)
        ),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Max Travel X_total:"),
          createElement(Text, { style: styles.value }, `${formatNumber(data.totalDeflectionCapacity)} mm`)
        ),
        createElement(View, { style: styles.row },
          createElement(Text, { style: styles.label }, "Shear Modulus G:"),
          createElement(Text, { style: styles.value }, `${formatNumber(data.shearModulus, 0)} MPa`)
        )
      ),

      // Final Results
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 
          `Final Results at Δx = ${formatNumber(data.maxDeflection)} mm`
        ),
        createElement(View, { style: styles.resultsBox },
          createElement(View, { style: styles.resultRow },
            createElement(Text, { style: styles.resultLabel }, "Final Load F:"),
            createElement(Text, { style: styles.resultValue }, `${formatNumber(data.finalLoad)} N`)
          ),
          createElement(View, { style: styles.resultRow },
            createElement(Text, { style: styles.resultLabel }, "Final Stiffness k:"),
            createElement(Text, { style: styles.resultValue }, `${formatNumber(data.finalStiffness)} N/mm`)
          ),
          createElement(View, { style: styles.resultRow },
            createElement(Text, { style: styles.resultLabel }, "Shear Stress τ:"),
            createElement(Text, { style: styles.resultValue }, `${formatNumber(data.finalShearStress)} MPa`)
          ),
          createElement(View, { style: styles.resultRow },
            createElement(Text, { style: styles.resultLabel }, "Active Coils:"),
            createElement(Text, { style: styles.resultValue }, `${data.finalActiveCoils}`)
          ),
          createElement(View, { style: styles.resultRow },
            createElement(Text, { style: styles.resultLabel }, "Collapsed Coils:"),
            createElement(Text, { style: styles.resultValue }, `${data.finalCollapsedCoils}`)
          ),
          data.safetyFactor && createElement(View, { style: styles.resultRow },
            createElement(Text, { style: styles.resultLabel }, "Safety Factor SF:"),
            createElement(Text, { style: styles.resultValue }, `${formatNumber(data.safetyFactor)}`)
          )
        ),
        data.exceededSolidHeight && createElement(View, { style: styles.warning },
          createElement(Text, {}, "⚠ Note: Requested deflection exceeded available travel. Results clamped to solid height.")
        )
      ),

      // Coil Collapse Stages
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Coil Collapse Stages / 圈贴底阶段"),
        createElement(View, { style: styles.table },
          createElement(View, { style: styles.tableHeader },
            createElement(Text, { style: styles.tableCellSmall }, "Stage"),
            createElement(Text, { style: styles.tableCell }, "Status"),
            createElement(Text, { style: styles.tableCell }, "Start Δx (mm)"),
            createElement(Text, { style: styles.tableCell }, "Active Coils"),
            createElement(Text, { style: styles.tableCell }, "k (N/mm)")
          ),
          ...data.stages.map((stage, idx) => 
            createElement(View, { key: idx, style: styles.tableRow },
              createElement(Text, { style: styles.tableCellSmall }, `${stage.stage}`),
              createElement(Text, { style: styles.tableCell }, 
                stage.stage === 0 ? "Initial" : `${stage.collapsedCoils} collapsed`
              ),
              createElement(Text, { style: styles.tableCell }, formatNumber(stage.startDeflection)),
              createElement(Text, { style: styles.tableCell }, `${stage.activeCoils}`),
              createElement(Text, { style: styles.tableCell }, formatNumber(stage.stiffness))
            )
          )
        )
      ),

      // Key Curve Points
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Nonlinear Curve Key Points"),
        createElement(View, { style: styles.table },
          createElement(View, { style: styles.tableHeader },
            createElement(Text, { style: styles.tableCellSmall }, "Point"),
            createElement(Text, { style: styles.tableCell }, "Δx (mm)"),
            createElement(Text, { style: styles.tableCell }, "F (N)"),
            createElement(Text, { style: styles.tableCell }, "k (N/mm)"),
            createElement(Text, { style: styles.tableCell }, "Na")
          ),
          ...data.curveKeyPoints.map((point, idx) => {
            const pctLabels = ["0%", "25%", "50%", "75%", "100%"];
            const isLast = idx === data.curveKeyPoints.length - 1;
            return createElement(View, { 
              key: idx, 
              style: isLast ? styles.tableRowHighlight : styles.tableRow 
            },
              createElement(Text, { style: styles.tableCellSmall }, pctLabels[idx]),
              createElement(Text, { style: styles.tableCell }, formatNumber(point.deflection)),
              createElement(Text, { style: styles.tableCell }, formatNumber(point.load)),
              createElement(Text, { style: styles.tableCell }, formatNumber(point.k)),
              createElement(Text, { style: styles.tableCell }, `${point.activeCoils}`)
            );
          })
        )
      ),

      // Footer
      createElement(View, { style: styles.footer },
        createElement(Text, {}, "ISRI Shuangdi Spring Platform - Conical Spring Design Report"),
        data.designId && createElement(Text, {}, `Design ID: ${data.designId}`)
      )
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const data: ConicalDesignReportData = await request.json();

    // Validate required fields
    if (!data.largeDiameter || !data.smallDiameter || !data.wireDiameter) {
      return NextResponse.json(
        { error: "Missing required design parameters" },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfElement = createElement(ConicalReportPDF, { data });
    // @ts-expect-error - renderToBuffer types are not fully compatible with createElement
    const pdfBuffer = await renderToBuffer(pdfElement);

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="conical-spring-report-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    );
  }
}
