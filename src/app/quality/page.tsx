"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LanguageText } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { QualityImrCharts } from "@/components/quality/QualityImrCharts";
import { QualityStratificationChart } from "@/components/quality/QualityStratificationChart";
import { QualityXbarRCharts } from "@/components/quality/QualityXbarRCharts";

import type { FieldMapping, IngestPreview, QualityAnalysisResult } from "@/lib/quality";

export default function QualityPage() {
  const [step, setStep] = useState<"upload" | "mapping" | "analysis">("upload");
  const [csvText, setCsvText] = useState<string>("");
  const [delimiter, setDelimiter] = useState<string>(",");

  const [stratifyBy, setStratifyBy] = useState<"auto" | "none" | "machine" | "lot" | "shift" | "appraiser" | "gage">("auto");

  const [dataset, setDataset] = useState<{ id: string; name: string; headers: string[] } | null>(null);
  const [preview, setPreview] = useState<IngestPreview | null>(null);
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  const [analysis, setAnalysis] = useState<QualityAnalysisResult | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const [selectedCharacteristic, setSelectedCharacteristic] = useState<string | null>(null);

  const [reportMeta, setReportMeta] = useState({
    customer: "",
    supplier: "",
    partNumber: "",
    partName: "",
    rev: "",
    preparedBy: "",
    approvedBy: "",
    approvedAtISO: "",
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = dataset?.headers ?? [];

  const sampleCsv = useMemo(() => {
    return [
      "timestamp,characteristic,value,lsl,usl,unit,lot,machine",
      "2025-01-01 08:00:00,FreeLength,50.02,49.8,50.2,mm,L1,M01",
      "2025-01-01 08:03:00,FreeLength,49.96,49.8,50.2,mm,L1,M01",
      "2025-01-01 08:06:00,FreeLength,50.11,49.8,50.2,mm,L1,M02",
    ].join("\n");
  }, []);

  const sampleCsvLarge = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const approxNormal = () => {
      let s = 0;
      for (let i = 0; i < 6; i++) s += rand();
      return s - 3;
    };

    const pad2 = (n: number) => String(n).padStart(2, "0");
    const fmtTs = (d: Date) => {
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
    };

    const cols = [
      "timestamp",
      "characteristic",
      "value",
      "lsl",
      "usl",
      "target",
      "unit",
      "lot",
      "machine",
      "shift",
      "appraiser",
      "gage",
      "partId",
      "result",
    ];

    const base = new Date(Date.UTC(2025, 0, 1, 8, 0, 0));
    const lines: string[] = [cols.join(",")];

    const characteristics = [
      { name: "FreeLength", mean: 50.0, std: 0.035, lsl: 49.8, usl: 50.2, target: 50.0, unit: "mm" },
      { name: "WireDiameter", mean: 3.2, std: 0.008, lsl: 3.15, usl: 3.25, target: 3.2, unit: "mm" },
      { name: "Load@10mm", mean: 105.0, std: 1.2, lsl: 100.0, usl: 110.0, target: 105.0, unit: "N" },
    ] as const;

    const rowsPerChar = 40;
    let globalIdx = 0;

    for (let cIdx = 0; cIdx < characteristics.length; cIdx++) {
      const c = characteristics[cIdx];
      for (let i = 0; i < rowsPerChar; i++) {
        const ts = new Date(base.getTime() + globalIdx * 3 * 60 * 1000);
        const lot = (["L1", "L2", "L3"][cIdx] ?? "L1") as string;
        const machine = `M${pad2((globalIdx % 3) + 1)}`;
        const shift = globalIdx % 60 < 30 ? "A" : "B";
        const inspector = `I${pad2((globalIdx % 4) + 1)}`;
        const gage = `G${pad2((globalIdx % 2) + 1)}`;
        const partId = `SN${String(globalIdx + 1).padStart(4, "0")}`;

        const drift = cIdx === 2 ? (globalIdx / 120) * 0.6 : cIdx === 0 ? (globalIdx / 120) * 0.05 : 0;
        let valueNum = c.mean + drift + approxNormal() * c.std;

        if (i === 9 && cIdx === 0) valueNum = c.usl + 0.25;
        if (i === 27 && cIdx === 1) valueNum = c.lsl - 0.03;
        if (i === 33 && cIdx === 2) valueNum = c.usl + 3.5;

        const valueStr = (() => {
          if (i === 5 && cIdx === 2) return "";
          if (i === 18 && cIdx === 0) return "abc";
          return valueNum.toFixed(cIdx === 1 ? 4 : 3);
        })();

        const tsStr = i === 12 && cIdx === 1 ? "not-a-time" : fmtTs(ts);

        const parsedVal = Number(valueStr);
        const pass = isFinite(parsedVal) && valueStr.trim() !== "" && parsedVal >= c.lsl && parsedVal <= c.usl;
        const result = pass ? "PASS" : valueStr.trim() === "" || !isFinite(parsedVal) ? "UNKNOWN" : "FAIL";

        lines.push(
          [
            tsStr,
            c.name,
            valueStr,
            String(c.lsl),
            String(c.usl),
            String(c.target),
            c.unit,
            lot,
            machine,
            shift,
            inspector,
            gage,
            partId,
            result,
          ].join(",")
        );

        globalIdx++;
      }
    }

    return lines.join("\n");
  }, []);

  async function ingest() {
    setError(null);
    setReportHtml(null);
    setAnalysis(null);
    setBusy("ingest");
    try {
      const res = await fetch("/api/quality/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, delimiter }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError((data?.errors && Array.isArray(data.errors) ? data.errors.join("\n") : data?.error) ?? "Ingest failed");
        return;
      }

      setDataset({ id: data.dataset.id, name: data.dataset.name, headers: data.dataset.headers });
      setPreview(data.preview as IngestPreview);
      setMapping(data.mappingInference?.mapping as FieldMapping);
      setStep("mapping");
    } finally {
      setBusy(null);
    }
  }

  async function runAnalysis() {
    setError(null);
    setReportHtml(null);
    setBusy("analyze");
    try {
      if (!dataset?.id) {
        setError("Dataset missing");
        return;
      }
      if (!mapping?.value) {
        setError("Mapping missing: value column is required");
        return;
      }

      const res = await fetch("/api/quality/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: dataset.id, mapping, options: { stratifyBy } }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Analyze failed");
        return;
      }

      setAnalysis(data.analysis as QualityAnalysisResult);
      setSelectedCharacteristic((data.analysis as QualityAnalysisResult)?.characteristics?.[0]?.name ?? null);
      setStep("analysis");
    } finally {
      setBusy(null);
    }
  }

  async function previewReportHtml() {
    setError(null);
    setBusy("report_html");
    try {
      if (!dataset?.id || !mapping?.value) {
        setError("Dataset/mapping missing");
        return;
      }

      const res = await fetch("/api/reports/quality-analysis?format=html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId: dataset.id,
          mapping,
          meta: { language: "bilingual", ...reportMeta },
          options: { stratifyBy },
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setError(text || "Failed to generate HTML report");
        return;
      }

      setReportHtml(text);
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setError(null);
    setBusy("report_pdf");
    try {
      if (!dataset?.id || !mapping?.value) {
        setError("Dataset/mapping missing");
        return;
      }

      const res = await fetch("/api/reports/quality-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId: dataset.id,
          mapping,
          meta: { language: "bilingual", ...reportMeta },
          options: { stratifyBy },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to generate PDF");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quality-analysis-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }

  const mappingFields: Array<{ key: keyof FieldMapping; label: { en: string; zh: string }; required?: boolean }> = [
    { key: "value", label: { en: "Value", zh: "测量值" }, required: true },
    { key: "characteristic", label: { en: "Characteristic", zh: "特性/项目" } },
    { key: "timestamp", label: { en: "Timestamp", zh: "时间" } },
    { key: "lsl", label: { en: "LSL", zh: "下限" } },
    { key: "usl", label: { en: "USL", zh: "上限" } },
    { key: "target", label: { en: "Target", zh: "目标/名义" } },
    { key: "unit", label: { en: "Unit", zh: "单位" } },
    { key: "lot", label: { en: "Lot", zh: "批次" } },
    { key: "machine", label: { en: "Machine", zh: "机台/设备" } },
    { key: "shift", label: { en: "Shift", zh: "班次" } },
    { key: "partId", label: { en: "Part/Serial", zh: "件号/序列" } },
    { key: "appraiser", label: { en: "Appraiser/Inspector", zh: "检验员" } },
    { key: "gage", label: { en: "Gage", zh: "量具" } },
    { key: "trial", label: { en: "Trial", zh: "试次/重复" } },
    { key: "subgroupId", label: { en: "Subgroup", zh: "子组/分组" } },
    { key: "result", label: { en: "Result", zh: "判定" } },
  ];

  function updateMappingField(key: keyof FieldMapping, column: string | undefined) {
    setMapping((prev) => {
      const next: FieldMapping = { ...(prev ?? { value: headers[0] ?? "value" }) };
      (next as any)[key] = column;
      return next;
    });
  }

  function resetAll() {
    setStep("upload");
    setDataset(null);
    setPreview(null);
    setMapping(null);
    setAnalysis(null);
    setReportHtml(null);
    setError(null);
    setBusy(null);
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Module • Quality Management" zh="模块 • 质量管理" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Quality Management" zh="质量管理" />
        </h1>
        <p className="text-muted-foreground">
          <LanguageText
            en="This is a sidecar module. It will import inspection data and generate analytics + reports without changing any spring geometry/calculation/3D."
            zh="这是一个旁路模块：用于导入质检数据并生成分析与报告，不会影响任何弹簧几何/计算/3D。"
          />
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <LanguageText en="Workflow" zh="流程" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={step === "upload" ? "default" : "outline"}
              onClick={() => setStep("upload")}
              disabled={busy !== null}
            >
              <LanguageText en="1) Upload" zh="1）导入" />
            </Button>
            <Button
              variant={step === "mapping" ? "default" : "outline"}
              onClick={() => setStep("mapping")}
              disabled={!dataset || busy !== null}
            >
              <LanguageText en="2) Mapping" zh="2）映射" />
            </Button>
            <Button
              variant={step === "analysis" ? "default" : "outline"}
              onClick={() => setStep("analysis")}
              disabled={!analysis || busy !== null}
            >
              <LanguageText en="3) Analysis" zh="3）分析" />
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={resetAll} disabled={busy !== null}>
              <LanguageText en="Reset" zh="重置" />
            </Button>
          </div>

          {error && <pre className="rounded-md border bg-muted/30 p-3 text-sm text-destructive whitespace-pre-wrap">{error}</pre>}

          {step === "upload" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <LanguageText en="CSV Input" zh="CSV 输入" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>
                      <LanguageText en="Upload CSV file" zh="上传 CSV 文件" />
                    </Label>
                    <Input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => setCsvText(String(reader.result ?? ""));
                        reader.readAsText(f);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      <LanguageText en="Delimiter" zh="分隔符" />
                    </Label>
                    <Input value={delimiter} onChange={(e) => setDelimiter(e.target.value || ",")} placeholder="," />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      <LanguageText en="Or paste CSV text" zh="或直接粘贴 CSV 文本" />
                    </Label>
                    <Textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="min-h-[240px] font-mono text-xs"
                      placeholder={sampleCsv}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={ingest} disabled={busy !== null || !csvText.trim()}>
                      <LanguageText en={busy === "ingest" ? "Importing..." : "Import"} zh={busy === "ingest" ? "导入中..." : "导入"} />
                    </Button>
                    <Button variant="outline" onClick={() => setCsvText(sampleCsv)} disabled={busy !== null}>
                      <LanguageText en="Use sample" zh="使用示例" />
                    </Button>
                    <Button variant="outline" onClick={() => setCsvText(sampleCsvLarge)} disabled={busy !== null}>
                      <LanguageText en="Use large sample" zh="使用大样本" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <LanguageText en="Notes" zh="说明" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <LanguageText
                      en="V1 supports CSV only. Data is stored under .tmp/quality and is sidecar (no impact on spring calculations)."
                      zh="V1 仅支持 CSV。数据存储在 .tmp/quality，属于旁路模块（不影响弹簧计算）。"
                    />
                  </p>
                  <p>
                    <LanguageText
                      en="Required: a numeric value column. Optional: characteristic, timestamp, LSL/USL for Cp/Cpk."
                      zh="必填：数值列。可选：特性列、时间列，以及 LSL/USL 用于 Cp/Cpk。"
                    />
                  </p>
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link href="/">
                        <LanguageText en="Back to Home" zh="返回首页" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/tools/analysis">
                        <LanguageText en="Engineering Analysis" zh="工程分析" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "mapping" && dataset && mapping && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <LanguageText en="Field Mapping" zh="字段映射" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate font-medium">{dataset.name}</div>
                      <div className="text-muted-foreground">{dataset.id}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
                    <Label className="text-sm">
                      <LanguageText en="Stratify By" zh="分层维度" />
                    </Label>
                    <Select value={stratifyBy} onValueChange={(v) => setStratifyBy(v as any)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="auto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">auto</SelectItem>
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="machine">machine</SelectItem>
                        <SelectItem value="lot">lot</SelectItem>
                        <SelectItem value="shift">shift</SelectItem>
                        <SelectItem value="appraiser">appraiser</SelectItem>
                        <SelectItem value="gage">gage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border p-3 space-y-3">
                    <div className="text-sm font-medium">
                      <LanguageText en="PPAP / Report Info" zh="PPAP / 报告信息" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Customer / 客户</Label>
                        <Input value={reportMeta.customer} onChange={(e) => setReportMeta((p) => ({ ...p, customer: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Supplier / 供应商</Label>
                        <Input value={reportMeta.supplier} onChange={(e) => setReportMeta((p) => ({ ...p, supplier: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Part No. / 零件号</Label>
                        <Input value={reportMeta.partNumber} onChange={(e) => setReportMeta((p) => ({ ...p, partNumber: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Part Name / 零件名称</Label>
                        <Input value={reportMeta.partName} onChange={(e) => setReportMeta((p) => ({ ...p, partName: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Rev / 版本</Label>
                        <Input value={reportMeta.rev} onChange={(e) => setReportMeta((p) => ({ ...p, rev: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Prepared By / 编制</Label>
                        <Input value={reportMeta.preparedBy} onChange={(e) => setReportMeta((p) => ({ ...p, preparedBy: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Approved By / 批准</Label>
                        <Input value={reportMeta.approvedBy} onChange={(e) => setReportMeta((p) => ({ ...p, approvedBy: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Approved Date / 批准日期</Label>
                        <Input value={reportMeta.approvedAtISO} onChange={(e) => setReportMeta((p) => ({ ...p, approvedAtISO: e.target.value }))} placeholder="YYYY-MM-DD" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mappingFields.map((f) => (
                      <div key={String(f.key)} className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
                        <Label className="text-sm">
                          <LanguageText en={f.label.en} zh={f.label.zh} />
                          {f.required ? <span className="text-destructive"> *</span> : null}
                        </Label>
                        <Select
                          value={(mapping[f.key] as any) ?? "__none__"}
                          onValueChange={(v) => updateMappingField(f.key, v === "__none__" ? undefined : v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {!f.required && <SelectItem value="__none__">—</SelectItem>}
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={runAnalysis} disabled={busy !== null}>
                      <LanguageText en={busy === "analyze" ? "Analyzing..." : "Analyze"} zh={busy === "analyze" ? "分析中..." : "分析"} />
                    </Button>
                    <Button variant="outline" onClick={() => setStep("upload")} disabled={busy !== null}>
                      <LanguageText en="Back" zh="返回" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <LanguageText en="Preview" zh="预览" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <LanguageText en="First 20 rows" zh="前 20 行" />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview?.headers.slice(0, 6).map((h) => (
                          <TableHead key={h}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(preview?.sampleRows ?? []).slice(0, 10).map((r, idx) => (
                        <TableRow key={idx}>
                          {preview?.headers.slice(0, 6).map((h) => (
                            <TableCell key={h} className="text-xs text-muted-foreground">
                              {(r as any)?.[h] ?? ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "analysis" && analysis && dataset && mapping && (
            <div className="space-y-4">
              {(() => {
                const selected =
                  analysis.characteristics.find((c) => c.name === selectedCharacteristic) ??
                  analysis.characteristics[0] ??
                  null;

                return selected ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        <LanguageText en="Charts" zh="图表" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
                        <Label className="text-sm">
                          <LanguageText en="Characteristic" zh="特性" />
                        </Label>
                        <Select
                          value={selectedCharacteristic ?? selected.name}
                          onValueChange={(v) => setSelectedCharacteristic(v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {analysis.characteristics.map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <QualityImrCharts imr={selected.imr} height={260} />

                      {selected.xbarr && <QualityXbarRCharts xbarr={selected.xbarr} height={260} />}

                      {analysis.stratification && (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            <LanguageText en="Stratification score comparison" zh="分层评分对比" />
                          </div>
                          <QualityStratificationChart stratification={analysis.stratification} height={260} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <LanguageText en="Overall" zh="总体" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">{analysis.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">{analysis.score}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rows</span>
                      <span className="font-medium">{analysis.dataQuality.stats.totalRows}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Valid</span>
                      <span className="font-medium">{analysis.dataQuality.stats.validMeasurements}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <LanguageText en="Key Findings" zh="关键发现" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {analysis.keyFindings.length === 0 ? (
                      <div className="text-muted-foreground">—</div>
                    ) : (
                      <div className="space-y-1">
                        {analysis.keyFindings.slice(0, 10).map((f, idx) => (
                          <div key={`${f.id}-${idx}`} className="flex gap-2">
                            <span className="w-[64px] shrink-0 font-mono text-xs">{f.severity}</span>
                            <span className="text-muted-foreground">{f.title.en} / {f.title.zh}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <LanguageText en="Capability Summary" zh="过程能力汇总" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.stratification && (
                    <div className="rounded-md border p-3 text-sm">
                      <div className="font-medium">
                        <LanguageText en="Stratification" zh="分层" />: {analysis.stratification.by}
                      </div>
                      <div className="mt-2 grid gap-1">
                        {analysis.stratification.strata.slice(0, 8).map((s) => (
                          <div key={s.key} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{s.key}</span>
                            <span className="font-mono text-xs">{s.status} / {s.score} / n={s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Characteristic</TableHead>
                        <TableHead className="text-right">n</TableHead>
                        <TableHead className="text-right">mean</TableHead>
                        <TableHead className="text-right">std</TableHead>
                        <TableHead className="text-right">Cp</TableHead>
                        <TableHead className="text-right">Cpk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.characteristics.slice(0, 20).map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{c.count}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{c.capability.mean.toFixed(4)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{c.capability.std.toFixed(4)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {c.capability.cp === null ? "—" : c.capability.cp.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {c.capability.cpk === null ? "—" : c.capability.cpk.toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="default" onClick={previewReportHtml} disabled={busy !== null}>
                      <LanguageText en={busy === "report_html" ? "Generating..." : "Preview HTML"} zh={busy === "report_html" ? "生成中..." : "预览 HTML"} />
                    </Button>
                    <Button variant="outline" onClick={exportPdf} disabled={busy !== null}>
                      <LanguageText en={busy === "report_pdf" ? "Generating..." : "Export PDF"} zh={busy === "report_pdf" ? "生成中..." : "导出 PDF"} />
                    </Button>
                    <Button variant="outline" onClick={() => setStep("mapping")} disabled={busy !== null}>
                      <LanguageText en="Back to mapping" zh="返回映射" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {reportHtml && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <LanguageText en="Report Preview" zh="报告预览" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <iframe title="quality-report" srcDoc={reportHtml} className="h-[520px] w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
