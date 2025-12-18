import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

import type { QualityAnalysisResult, QualityDataset } from "../types";

function dataDir() {
  return path.join(process.cwd(), ".tmp", "quality");
}

function datasetPath(id: string) {
  return path.join(dataDir(), `${id}.dataset.json`);
}

function analysisPath(datasetId: string) {
  return path.join(dataDir(), `${datasetId}.analysis.json`);
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

export function createQualityId(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export async function saveDataset(dataset: QualityDataset): Promise<void> {
  await ensureDir();
  await writeFile(datasetPath(dataset.id), JSON.stringify(dataset, null, 2), "utf8");
}

export async function loadDataset(id: string): Promise<QualityDataset | null> {
  try {
    const buf = await readFile(datasetPath(id), "utf8");
    return JSON.parse(buf) as QualityDataset;
  } catch {
    return null;
  }
}

export async function saveAnalysis(result: QualityAnalysisResult): Promise<void> {
  await ensureDir();
  await writeFile(analysisPath(result.datasetId), JSON.stringify(result, null, 2), "utf8");
}

export async function loadAnalysis(datasetId: string): Promise<QualityAnalysisResult | null> {
  try {
    const buf = await readFile(analysisPath(datasetId), "utf8");
    return JSON.parse(buf) as QualityAnalysisResult;
  } catch {
    return null;
  }
}
