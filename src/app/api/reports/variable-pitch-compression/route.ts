import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Svg, Path, Line } from "@react-pdf/renderer";
import { createElement } from "react";

import type { VariablePitchCompressionReportPayload } from "@/lib/reports/variablePitchCompressionReport";

type VariablePitchCompressionReportRequest = {
  payload: VariablePitchCompressionReportPayload;
  meta?: {
    title?: string;
    projectName?: string;
    engineer?: string;
    language?: "en" | "zh" | "bilingual";
  };
};

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
  headerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  headerMeta: {
    fontSize: 9,
    color: "#64748b",
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
  grid2: {
    flexDirection: "row",
  },
  card: {
    flexGrow: 1,
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#f8fafc",
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
  chartWrap: {
    marginTop: 6,
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    backgroundColor: "#ffffff",
    padding: 8,
  },
  chartTitle: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 4,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
  },
});

function fmt(value: unknown, decimals = 2): string {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

function t(lang: NonNullable<VariablePitchCompressionReportRequest["meta"]>["language"], en: string, zh: string): string {
  if (lang === "zh") return zh;
  if (lang === "en") return en;
  return `${en} / ${zh}`;
}

function kv(label: string, value: string) {
  return createElement(
    View,
    { style: styles.row },
    createElement(Text, { style: styles.label }, label),
    createElement(Text, { style: styles.value }, value)
  );
}

type XY = { x: number; y: number };

function linePath(points: XY[], xScale: (x: number) => number, yScale: (y: number) => number): string {
  if (points.length < 2) return "";
  return points
    .map((p, i) => {
      const x = xScale(p.x);
      const y = yScale(p.y);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function SimpleCurveChart({ title, points }: { title: string; points: XY[] }) {
  const width = 520;
  const height = 220;
  const padding = { left: 30, right: 10, top: 12, bottom: 22 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = ys.length ? Math.min(...ys) : 0;
  const yMax = ys.length ? Math.max(...ys) : 1;

  const xSpan = Math.max(1e-9, xMax - xMin);
  const ySpan = Math.max(1e-9, yMax - yMin);

  const xScale = (x: number) => padding.left + ((x - xMin) / xSpan) * innerW;
  const yScale = (y: number) => padding.top + innerH - ((y - yMin) / ySpan) * innerH;

  return createElement(
    View,
    { style: styles.chartWrap },
    createElement(Text, { style: styles.chartTitle }, title),
    createElement(
      Svg,
      { width, height, viewBox: `0 0 ${width} ${height}` },
      createElement(Line, {
        x1: padding.left,
        y1: padding.top + innerH,
        x2: width - padding.right,
        y2: padding.top + innerH,
        stroke: "#94a3b8",
        strokeWidth: 1,
      }),
      createElement(Line, {
        x1: padding.left,
        y1: padding.top,
        x2: padding.left,
        y2: padding.top + innerH,
        stroke: "#94a3b8",
        strokeWidth: 1,
      }),
      createElement(Path, {
        d: linePath(points, xScale, yScale),
        fill: "none",
        stroke: "#2563eb",
        strokeWidth: 2,
      })
    )
  );
}

function VariablePitchCompressionReportPDF({ data }: { data: VariablePitchCompressionReportRequest }) {
  const lang = data.meta?.language ?? "bilingual";
  const title = data.meta?.title ?? t(lang, "Variable Pitch Compression Spring Report", "变节距压缩弹簧报告");
  const generatedAt = new Date().toLocaleString();
  const project = data.meta?.projectName ?? "—";
  const engineer = data.meta?.engineer ?? "—";

  const payload = data.payload;
  const spring = payload.spring;

  const pts: XY[] = payload.curves.deflection
    .map((x, i) => ({ x, y: payload.curves.load[i] ?? 0 }))
    .filter((p) => isFinite(p.x) && isFinite(p.y));

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
        createElement(Text, { style: styles.subtitle }, `${t(lang, "Generated", "生成")}: ${generatedAt}`),
        createElement(
          View,
          { style: styles.headerMetaRow },
          createElement(Text, { style: styles.headerMeta }, `${t(lang, "Project", "项目")}: ${project}`),
          createElement(Text, { style: styles.headerMeta }, `${t(lang, "Engineer", "工程师")}: ${engineer}`)
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, "Inputs", "输入")),
        createElement(
          View,
          { style: styles.grid2 },
          createElement(
            View,
            { style: styles.card },
            kv("d (mm)", fmt(spring.wireDiameter, 2)),
            kv("Dm (mm)", fmt(spring.meanDiameter, 2)),
            kv("Nt", fmt(spring.totalCoils, 2)),
            kv("Na0", fmt(spring.activeCoils0, 2)),
            kv("G (MPa)", fmt(spring.shearModulus, 0)),
            kv("L0 (mm)", fmt(spring.freeLength, 2))
          ),
          createElement(
            View,
            { style: [styles.card, { marginLeft: 10 }] },
            kv("Material", spring.materialName ?? spring.materialId ?? "—"),
            kv("C", fmt(payload.summary.springIndex, 3)),
            kv("Kw", fmt(payload.summary.wahlFactor, 3)),
            kv("deltaMax (mm)", fmt(payload.summary.deltaMax, 2)),
            kv("Issues", String(payload.summary.issues.length))
          )
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, "Force-Deflection", "力-位移")),
        createElement(SimpleCurveChart, {
          title: t(lang, "Force vs. Deflection", "载荷-位移曲线"),
          points: pts,
        })
      ),
      createElement(
        Text,
        {
          style: styles.footer,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`,
          fixed: true,
        } as any,
        ""
      )
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as VariablePitchCompressionReportRequest;
    if (!data?.payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const pdfElement = createElement(VariablePitchCompressionReportPDF, { data });
    // @ts-expect-error - renderToBuffer types are not fully compatible with createElement
    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="variable-pitch-compression-report-${Date.now()}.pdf"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
