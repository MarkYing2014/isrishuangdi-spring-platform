import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

import {
  analyzeDataset,
  inferMapping,
  loadAnalysis,
  loadDataset,
  saveAnalysis,
} from "@/lib/quality";
import type { FieldMapping, QualityDataset } from "@/lib/quality";
import {
  generateQualityAnalysisReportHTML,
  QualityAnalysisReportPDF,
  type QualityAnalysisReportModel,
} from "@/lib/quality";

type QualityReportRequest = {
  datasetId?: string;
  dataset?: QualityDataset;
  mapping?: FieldMapping;
  meta?: QualityAnalysisReportModel["meta"];
  options?: {
    stratifyBy?: string;
  };
};

function normalizeMapping(mapping: FieldMapping): FieldMapping {
  const clean = (x: string | undefined) => {
    const v = x?.trim();
    return v ? v : undefined;
  };

  return {
    value: mapping.value,
    timestamp: clean(mapping.timestamp),
    characteristic: clean(mapping.characteristic),
    partId: clean(mapping.partId),
    lot: clean(mapping.lot),
    machine: clean(mapping.machine),
    shift: clean(mapping.shift),
    appraiser: clean(mapping.appraiser),
    gage: clean(mapping.gage),
    trial: clean(mapping.trial),
    subgroupId: clean(mapping.subgroupId),
    unit: clean(mapping.unit),
    lsl: clean(mapping.lsl),
    usl: clean(mapping.usl),
    target: clean(mapping.target),
    result: clean(mapping.result),
    tagColumns: mapping.tagColumns?.map((c) => c.trim()).filter(Boolean),
  };
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as QualityReportRequest;

    // Support both inline dataset (serverless) and datasetId (persistent storage)
    let dataset: QualityDataset | null = null;

    if (data.dataset && data.dataset.headers && data.dataset.rows) {
      dataset = data.dataset;
    } else if (data.datasetId) {
      dataset = await loadDataset(data.datasetId);
    }

    if (!dataset) {
      return NextResponse.json(
        {
          error:
            "Dataset not found. Please provide dataset inline or re-upload if running on serverless.",
        },
        { status: 404 }
      );
    }

    const defaultMapping = dataset.inferredMapping ?? inferMapping(dataset.headers ?? []).mapping;
    const mapping = normalizeMapping(data.mapping ?? defaultMapping);

    if (!mapping.value) {
      return NextResponse.json({ error: "mapping.value is required" }, { status: 400 });
    }

    const format = req.nextUrl.searchParams.get("format") ?? "pdf";

    const existing = data.datasetId ? await loadAnalysis(data.datasetId) : null;
    const requestedStratifyBy = (data.options?.stratifyBy ?? "auto") as any;
    const existingStratifyBy = (existing as any)?.options?.stratifyBy ?? "auto";

    const shouldReuse = !!existing && requestedStratifyBy === existingStratifyBy;
    const analysis = shouldReuse
      ? existing
      : analyzeDataset({ dataset, mapping, options: { stratifyBy: requestedStratifyBy } });

    if (!shouldReuse) {
      try {
        await saveAnalysis(analysis);
      } catch {
        // Ignore save errors on serverless
      }
    }

    const model: QualityAnalysisReportModel = {
      dataset: {
        id: dataset.id,
        name: dataset.name,
        createdAtISO: dataset.createdAtISO,
        source: dataset.source,
        headers: dataset.headers,
      },
      mapping,
      analysis,
      meta: data.meta,
    };

    if (format === "html") {
      const html = generateQualityAnalysisReportHTML(model);
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const pdfElement = createElement(QualityAnalysisReportPDF, { model });
    // @ts-expect-error - renderToBuffer types are not fully compatible with createElement
    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quality-analysis-${Date.now()}.pdf"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
