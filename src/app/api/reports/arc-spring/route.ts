import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Svg, Path, Line } from "@react-pdf/renderer";
import { createElement } from "react";

import type { ArcSpringInput, ArcSpringResult } from "@/lib/arcSpring";

type ArcSpringReportPayload = {
  input: ArcSpringInput;
  result: ArcSpringResult;
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
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 9,
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  message: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
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
  chartWrap: {
    marginTop: 6,
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  chartTitle: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 4,
    fontWeight: "bold",
  },
});

function fmt(value: unknown, decimals = 2): string {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

function t(lang: NonNullable<ArcSpringReportPayload["meta"]>["language"], en: string, zh: string): string {
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

function SimpleChart({
  title,
  load,
  unload,
}: {
  title: string;
  load: XY[];
  unload: XY[];
}) {
  const width = 520;
  const height = 220;
  const padding = { left: 30, right: 10, top: 12, bottom: 22 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allPts = [...load, ...unload];
  const xs = allPts.map((p) => p.x);
  const ys = allPts.map((p) => p.y);
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
        d: linePath(load, xScale, yScale),
        fill: "none",
        stroke: "#2563eb",
        strokeWidth: 2,
      }),
      createElement(Path, {
        d: linePath(unload, xScale, yScale),
        fill: "none",
        stroke: "#ea580c",
        strokeWidth: 2,
      })
    )
  );
}

function ArcSpringReportPDF({ data }: { data: ArcSpringReportPayload }) {
  const input = data.input;
  const result = data.result;
  const lang = data.meta?.language ?? "bilingual";

  const title = data.meta?.title ?? t(lang, "Arc Spring Report", "弧形弹簧报告");
  const generatedAt = new Date().toLocaleString();
  const project = data.meta?.projectName ?? "—";
  const engineer = data.meta?.engineer ?? "—";

  const badgeColor = (ryg: "green" | "yellow" | "red") => {
    if (ryg === "green") return "#16a34a";
    if (ryg === "yellow") return "#f59e0b";
    return "#dc2626";
  };

  const tauMax = result.tauMax;
  const status: "green" | "yellow" | "red" =
    isFinite(tauMax) && tauMax > 0 && tauMax <= 800 ? "green" : isFinite(tauMax) && tauMax > 0 && tauMax <= 1000 ? "yellow" : "red";

  const ptsLoad: XY[] = (result.curve ?? []).map((p) => ({ x: p.deltaDeg, y: p.M_load }));
  const ptsUnload: XY[] = (result.curve ?? []).map((p) => ({ x: p.deltaDeg, y: p.M_unload }));

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
            createElement(Text, { style: [styles.badge, { backgroundColor: badgeColor(status) }] }, `${t(lang, "Status", "判定")}: ${status.toUpperCase()}`),
            kv("d (mm)", fmt(input.d, 2)),
            kv("D (mm)", fmt(input.D, 2)),
            kv("n", fmt(input.n, 2)),
            kv("r (mm)", fmt(input.r, 2)),
            kv("alpha0 (deg)", fmt(input.alpha0, 1)),
            kv("alphaC (deg)", fmt(input.alphaC, 1))
          ),
          createElement(
            View,
            { style: [styles.card, { marginLeft: 10 }] },
            kv("k (N/mm)", fmt(result.k, 2)),
            kv("R (N·mm/deg)", fmt(result.R_deg, 2)),
            kv("MMax_load (N·mm)", fmt(result.MMax_load, 0)),
            kv("MMax_unload (N·mm)", fmt(result.MMax_unload, 0)),
            kv("tauMax (MPa)", fmt(result.tauMax, 0)),
            kv("springIndex C", fmt(result.springIndex, 2))
          )
        )
      ),

      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, "Torque-Angle", "扭矩-角度")),
        createElement(SimpleChart, {
          title: t(lang, "Torque vs. Delta Angle", "扭矩-转角曲线"),
          load: ptsLoad,
          unload: ptsUnload,
        })
      ),

      (result.warnings?.length ?? 0) > 0
        ? createElement(
            View,
            { style: styles.section },
            createElement(Text, { style: styles.sectionTitle }, t(lang, "Warnings", "警告")),
            ...(result.warnings ?? []).slice(0, 8).map((w, i) => createElement(Text, { key: i, style: styles.message }, `- ${w}`))
          )
        : null,

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
    const data = (await req.json()) as ArcSpringReportPayload;
    if (!data?.input || !data?.result) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const pdfElement = createElement(ArcSpringReportPDF, { data });
    // @ts-expect-error - renderToBuffer types are not fully compatible with createElement
    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="arc-spring-report-${Date.now()}.pdf"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
