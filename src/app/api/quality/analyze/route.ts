import { NextRequest, NextResponse } from "next/server";

import {
  analyzeDataset,
  inferMapping,
  loadDataset,
  saveAnalysis,
} from "@/lib/quality";
import type { FieldMapping, QualityAnalysisResult } from "@/lib/quality";

type QualityAnalyzeRequest = {
  datasetId: string;
  mapping?: FieldMapping;
  options?: {
    stratifyBy?: string;
  };
};

type QualityAnalyzeResponse = {
  analysis: QualityAnalysisResult;
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
    const body = (await req.json()) as QualityAnalyzeRequest;

    if (!body?.datasetId) {
      return NextResponse.json({ error: "datasetId is required" }, { status: 400 });
    }

    const dataset = await loadDataset(body.datasetId);
    if (!dataset) {
      return NextResponse.json(
        {
          error:
            "Dataset not found. If running on serverless, tmp filesystem is not durable across requests/instances. Please re-upload, or configure QUALITY_DATA_DIR to a persistent writable path when self-hosting.",
        },
        { status: 404 }
      );
    }

    const defaultMapping = dataset.inferredMapping ?? inferMapping(dataset.headers).mapping;
    const mapping = normalizeMapping(body.mapping ?? defaultMapping);

    if (!mapping.value) {
      return NextResponse.json({ error: "mapping.value is required" }, { status: 400 });
    }

    const analysis = analyzeDataset({
      dataset,
      mapping,
      options: {
        stratifyBy: body.options?.stratifyBy as any,
      },
    });
    await saveAnalysis(analysis);

    const response: QualityAnalyzeResponse = { analysis };
    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
