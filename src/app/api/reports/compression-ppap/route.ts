import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createElement } from "react";

import type { CompressionPpapReportModel } from "@/lib/reports/compressionPpapReport";
import { generateCompressionPpapReportHTML } from "@/lib/reports/compressionPpapReport";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    marginBottom: 16,
    borderBottom: "2px solid #2563eb",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1d4ed8",
  },
  subtitle: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 4,
    marginBottom: 8,
  },
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: {
    color: "#64748b",
    flexGrow: 1,
  },
  value: {
    fontWeight: "bold",
    textAlign: "right",
    flexShrink: 0,
    marginLeft: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 6,
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1px solid #e2e8f0",
  },
  cell: {
    flexGrow: 1,
    flexBasis: 0,
    paddingRight: 6,
  },
});

function fmt(value: unknown, decimals = 2): string {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

function kv(label: string, value: string) {
  return createElement(
    View,
    { style: styles.row },
    createElement(Text, { style: styles.label }, label),
    createElement(Text, { style: styles.value }, value)
  );
}

function CompressionPpapReportPDF({ model }: { model: CompressionPpapReportModel }) {
  const g = model.inputs.resolved.design;
  const a = model.inputs.analysisResult;

  const title = "Compression Spring PPAP (V1)";

  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.title }, title),
        createElement(Text, { style: styles.subtitle }, `Generated: ${model.meta.generatedAtISO}`)
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Design Summary"),
        createElement(
          View,
          { style: styles.card },
          kv("d (mm)", fmt(g.wireDiameter, 2)),
          kv("Dm (mm)", fmt(g.meanDiameter, 2)),
          kv("Na", fmt(g.activeCoils, 2)),
          kv("Nt", fmt(g.totalCoils, 2)),
          kv("L0 (mm)", fmt(g.freeLength, 2)),
          kv("Material", g.materialId ?? model.inputs.eds.material.materialId ?? "—")
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Key Results"),
        createElement(
          View,
          { style: styles.card },
          kv("k (N/mm)", fmt(a.springRate, 4)),
          kv("F_work (N)", fmt(a.workingLoad, 2)),
          kv("tau (MPa)", fmt(a.shearStress, 1)),
          kv("C", fmt(a.springIndex, 3)),
          kv("Kw", fmt(a.wahlFactor, 3))
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "PPAP"),
        createElement(
          View,
          { style: styles.card },
          kv("Customer", model.ppap.customer ?? "—"),
          kv("Part No.", model.ppap.partNumber ?? "—"),
          kv("Rev", model.ppap.rev ?? "—"),
          kv("Submission Level", model.ppap.submissionLevel ?? "—")
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "CTQ"),
        createElement(
          View,
          { style: styles.card },
          createElement(
            View,
            { style: styles.tableHeader },
            createElement(Text, { style: styles.cell }, "Characteristic"),
            createElement(Text, { style: styles.cell }, "Spec"),
            createElement(Text, { style: styles.cell }, "Method"),
            createElement(Text, { style: styles.cell }, "Frequency"),
            createElement(Text, { style: styles.cell }, "Reaction")
          ),
          ...(model.ppap.ctq.length
            ? model.ppap.ctq.map((c, idx) =>
                createElement(
                  View,
                  { key: idx, style: styles.tableRow },
                  createElement(Text, { style: styles.cell }, c.characteristic ?? ""),
                  createElement(Text, { style: styles.cell }, c.spec ?? ""),
                  createElement(Text, { style: styles.cell }, c.method ?? ""),
                  createElement(Text, { style: styles.cell }, c.frequency ?? ""),
                  createElement(Text, { style: styles.cell }, c.reactionPlan ?? "")
                )
              )
            : [
                createElement(
                  View,
                  { key: "empty", style: styles.tableRow },
                  createElement(Text, { style: styles.cell }, "—"),
                  createElement(Text, { style: styles.cell }, ""),
                  createElement(Text, { style: styles.cell }, ""),
                  createElement(Text, { style: styles.cell }, ""),
                  createElement(Text, { style: styles.cell }, "")
                ),
              ])
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Process Route"),
        createElement(
          View,
          { style: styles.card },
          createElement(
            View,
            { style: styles.tableHeader },
            createElement(Text, { style: styles.cell }, "Step"),
            createElement(Text, { style: styles.cell }, "Machine"),
            createElement(Text, { style: styles.cell }, "Key Params"),
            createElement(Text, { style: styles.cell }, "Operator Check"),
            createElement(Text, { style: styles.cell }, "In-process Check")
          ),
          ...(model.process.route.length
            ? model.process.route.map((s, idx) =>
                createElement(
                  View,
                  { key: idx, style: styles.tableRow },
                  createElement(Text, { style: styles.cell }, s.stepName ?? ""),
                  createElement(Text, { style: styles.cell }, s.machine ?? ""),
                  createElement(Text, { style: styles.cell }, s.keyParams ?? ""),
                  createElement(Text, { style: styles.cell }, s.operatorCheck ?? ""),
                  createElement(Text, { style: styles.cell }, s.inProcessCheck ?? "")
                )
              )
            : [
                createElement(
                  View,
                  { key: "empty", style: styles.tableRow },
                  createElement(Text, { style: styles.cell }, "—"),
                  createElement(Text, { style: styles.cell }, ""),
                  createElement(Text, { style: styles.cell }, ""),
                  createElement(Text, { style: styles.cell }, ""),
                  createElement(Text, { style: styles.cell }, "")
                ),
              ])
        )
      )
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const model = (await req.json()) as CompressionPpapReportModel;
    if (!model?.inputs?.eds || !model?.inputs?.analysisResult || !model?.inputs?.resolved) {
      return NextResponse.json({ error: "Invalid report model" }, { status: 400 });
    }

    const format = req.nextUrl.searchParams.get("format") ?? "pdf";

    if (format === "html") {
      const html = generateCompressionPpapReportHTML(model);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const pdfElement = createElement(CompressionPpapReportPDF, { model });
    // @ts-expect-error - renderToBuffer types are not fully compatible with createElement
    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compression-ppap-${Date.now()}.pdf"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
