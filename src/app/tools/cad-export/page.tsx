"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { SpringDesign } from "@/lib/springTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LanguageText } from "@/components/language-context";

const EXPORT_FORMATS = [
  { value: "pdf", label: "2D PDF Drawing" },
  { value: "step", label: "3D STEP Model" },
  { value: "creo", label: "Creo Native Part" },
];

const numberOrUndefined = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function SpringCadExportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading CAD Export...</div>}>
      <CadExportContent />
    </Suspense>
  );
}

function CadExportContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? undefined;
  const wireDiameter = numberOrUndefined(searchParams.get("d")) ?? 3.2;
  const meanDiameter = numberOrUndefined(searchParams.get("Dm")) ?? 24;
  const activeCoils = numberOrUndefined(searchParams.get("Na")) ?? 8;
  const shearModulus = numberOrUndefined(searchParams.get("G")) ?? 79300;
  const freeLength = numberOrUndefined(searchParams.get("L0")) ?? 50;
  const pitch = numberOrUndefined(searchParams.get("pitch"));
  const springRate = numberOrUndefined(searchParams.get("k"));
  const maxDeflection = numberOrUndefined(searchParams.get("dx"));

  const design: SpringDesign = useMemo(
    () => ({
      code,
      type: "compression",
      wireDiameter,
      meanDiameter,
      activeCoils,
      shearModulus,
      freeLength,
      pitch,
    }),
    [code, wireDiameter, meanDiameter, activeCoils, shearModulus, freeLength, pitch],
  );

  const [selectedFormats, setSelectedFormats] = useState<string[]>(["pdf"]);
  const [notes, setNotes] = useState("Ready for Creo automation");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const toggleFormat = (value: string) => {
    setSelectedFormats((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleGenerate = () => {
    const payload = {
      code,
      design,
      exportFormats: selectedFormats,
      notes,
      source: "web-ui",
      metadata: {
        springRate,
        maxDeflection,
      },
    };

    console.log("CAD Export payload", payload);
    setStatusMessage(
      "Payload prepared. This payload will be sent to backend endpoint POST /api/cad/export to trigger Creo or other CAD service.",
    );
  };

  const summaryItems = [
    { label: "Wire Diameter d", value: `${wireDiameter} mm` },
    { label: "Mean Diameter Dm", value: `${meanDiameter} mm` },
    { label: "Active Coils Na", value: activeCoils },
    { label: "Shear Modulus G", value: `${shearModulus} MPa` },
    { label: "Free Length L₀", value: `${freeLength} mm` },
    { label: "Pitch", value: pitch ? `${pitch} mm` : "—" },
    { label: "Spring Rate k", value: springRate ? `${springRate} N/mm` : "—" },
    { label: "Max Deflection Δx", value: maxDeflection ? `${maxDeflection} mm` : "—" },
  ];

  const rfqUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (code) params.set("code", code);
    params.set("d", wireDiameter.toString());
    params.set("Dm", meanDiameter.toString());
    params.set("Na", activeCoils.toString());
    params.set("L0", freeLength.toString());
    if (springRate) params.set("k", springRate.toString());
    return `/rfq?${params.toString()}`;
  }, [code, wireDiameter, meanDiameter, activeCoils, freeLength, springRate]);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Module • CAD Export" zh="模块 • CAD 导出" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="CAD Export" zh="CAD 导出" />
        </h1>
        <p className="text-muted-foreground">
          <LanguageText
            en="Review calculated parameters, choose export assets, and send the payload to Creo automation. 后续版本将调用后端 API 触发自动建模与绘图流程。"
            zh="Review calculated parameters, choose export assets, and send the payload to Creo automation. 后续版本将调用后端 API 触发自动建模与绘图流程。"
          />
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <LanguageText en="Spring Design Summary" zh="弹簧设计概要" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {code && (
            <p className="text-sm text-primary font-medium">
              <LanguageText en="Design Code" zh="设计代码" />: {code}
            </p>
          )}
          <dl className="grid gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="text-base font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <LanguageText en="Export Options" zh="导出选项" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              <LanguageText en="Export Formats" zh="导出格式" />
            </Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {EXPORT_FORMATS.map((format) => (
                <label
                  key={format.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedFormats.includes(format.value)}
                    onChange={() => toggleFormat(format.value)}
                    className="size-4"
                  />
                  {format.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              <LanguageText en="Notes" zh="备注" />
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-primary focus:outline-none"
              rows={4}
            />
          </div>

          <div className="text-xs text-slate-500">
            {/* Backend contract placeholder */}
            <p>
              <LanguageText en="Future backend contract" zh="后端合同" />:
            </p>
            <pre className="rounded-md bg-slate-900 p-3 text-slate-100">
{`POST /api/cad/export
body: {
  code,
  design,
  exportFormats
}
response: {
  downloadUrls: {
    format: string
  }
}`}
            </pre>
          </div>

          <Button onClick={handleGenerate} className="w-full">
            <LanguageText en="Generate CAD Request" zh="生成 CAD 请求" />
          </Button>
          {statusMessage && (
            <p className="text-sm text-emerald-600">
              <LanguageText en="Payload prepared. This payload will be sent to backend endpoint POST /api/cad/export to trigger Creo or other CAD service." zh="Payload prepared. This payload will be sent to backend endpoint POST /api/cad/export to trigger Creo or other CAD service." />
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline">
          <a href={rfqUrl}>
            <LanguageText en="Add to RFQ" zh="添加到 RFQ" />
          </a>
        </Button>
      </div>
    </section>
  );
}
