import { NextRequest, NextResponse } from "next/server";

import {
  createQualityId,
  inferMapping,
  parseCsv,
  saveDataset,
} from "@/lib/quality";
import type { IngestPreview, QualityDataset } from "@/lib/quality";

type QualityIngestRequest = {
  csvText: string;
  delimiter?: string;
  name?: string;
  fileName?: string;
};

type QualityIngestResponse = {
  dataset: QualityDataset;
  preview: IngestPreview;
  mappingInference: ReturnType<typeof inferMapping>;
  errors: string[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QualityIngestRequest;

    if (!body?.csvText || typeof body.csvText !== "string") {
      return NextResponse.json({ error: "csvText is required" }, { status: 400 });
    }

    const parsed = parseCsv({ text: body.csvText, delimiter: body.delimiter });

    const errors = parsed.errors.slice();
    if (parsed.headers.length === 0) errors.push("Missing headers");
    if (parsed.rows.length === 0) errors.push("No data rows");

    if (errors.length) {
      return NextResponse.json({ error: "Invalid CSV", errors }, { status: 400 });
    }

    const inference = inferMapping(parsed.headers);

    const datasetId = createQualityId("qds");
    const dataset: QualityDataset = {
      id: datasetId,
      name: body.name?.trim() || body.fileName?.trim() || "Quality Dataset",
      createdAtISO: new Date().toISOString(),
      source: { type: "upload", fileName: body.fileName },
      headers: parsed.headers,
      rows: parsed.rows,
      inferredMapping: inference.mapping,
    };

    // Try to save to filesystem (may fail on serverless, that's ok for demo)
    try {
      await saveDataset(dataset);
    } catch {
      // Ignore save errors on serverless - frontend will hold the data
    }

    const preview: IngestPreview = {
      headers: parsed.headers,
      sampleRows: parsed.rows.slice(0, 20),
    };

    // Return full dataset so frontend can hold it for stateless analysis
    const response: QualityIngestResponse = {
      dataset,
      preview,
      mappingInference: inference,
      errors: [],
    };

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
