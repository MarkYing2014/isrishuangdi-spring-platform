"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { SpringDesign } from "@/lib/springTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageText } from "@/components/language-context";

const numberFromParams = (value: string | null, fallback?: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const contactSchema = z.object({
  company: z.string().min(1, "Required"),
  contactPerson: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(3, "Required"),
  country: z.string().min(1, "Required"),
});

const projectSchema = z.object({
  applicationType: z.string().min(1, "Required"),
  annualVolume: z.string().min(1, "Required"),
  sop: z.string().min(1, "Required"),
  productionRegion: z.string().min(1, "Required"),
});

const requirementsSchema = z.object({
  notes: z.string().min(10, "Please provide more context"),
});

const rfqSchema = z.object({
  company: contactSchema.shape.company,
  contactPerson: contactSchema.shape.contactPerson,
  email: contactSchema.shape.email,
  phone: contactSchema.shape.phone,
  country: contactSchema.shape.country,
  applicationType: projectSchema.shape.applicationType,
  annualVolume: projectSchema.shape.annualVolume,
  sop: projectSchema.shape.sop,
  productionRegion: projectSchema.shape.productionRegion,
  notes: requirementsSchema.shape.notes,
});

type RfqFormValues = z.infer<typeof rfqSchema>;

// Main page component with Suspense boundary
export default function RfqPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading RFQ form...</div>}>
      <RfqPageContent />
    </Suspense>
  );
}

function RfqPageContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? undefined;
  
  // Check for conical spring type
  const springType = searchParams.get("springType") ?? "compression";
  const isConical = springType === "conical";

  // Common parameters
  const wireDiameter = numberFromParams(searchParams.get("d")) ?? 3;
  const activeCoils = numberFromParams(searchParams.get("Na")) ?? 8;
  const shearModulus = numberFromParams(searchParams.get("G")) ?? 79300;
  const freeLength = numberFromParams(searchParams.get("L0")) ?? 50;
  const springRate = numberFromParams(searchParams.get("k")) ?? numberFromParams(searchParams.get("finalK"));
  const maxDeflection = numberFromParams(searchParams.get("dx")) ?? numberFromParams(searchParams.get("dxMax"));

  // Compression spring specific
  const meanDiameter = numberFromParams(searchParams.get("Dm")) ?? 22;
  const pitch = numberFromParams(searchParams.get("pitch"));

  // Conical spring specific
  const largeDiameter = numberFromParams(searchParams.get("D1"));
  const smallDiameter = numberFromParams(searchParams.get("D2"));
  const finalLoad = numberFromParams(searchParams.get("finalLoad"));
  const finalStress = numberFromParams(searchParams.get("finalStress"));

  const designSummary = useMemo(() => {
    if (isConical) {
      return {
        code,
        type: "conical" as const,
        wireDiameter,
        largeOuterDiameter: largeDiameter ?? 30,
        smallOuterDiameter: smallDiameter ?? 15,
        activeCoils,
        shearModulus,
        freeLength,
        notes: undefined,
      };
    }
    return {
      code,
      type: "compression" as const,
      wireDiameter,
      meanDiameter,
      activeCoils,
      shearModulus,
      freeLength,
      pitch,
      notes: undefined,
    };
  }, [code, isConical, wireDiameter, meanDiameter, largeDiameter, smallDiameter, activeCoils, shearModulus, freeLength, pitch]);

  // Generate pre-fill notes based on spring type
  const generateDefaultNotes = () => {
    if (isConical && largeDiameter && smallDiameter) {
      return `Conical compression spring design:
- Large OD D₁: ${largeDiameter} mm, Small OD D₂: ${smallDiameter} mm
- Wire diameter d: ${wireDiameter} mm
- Active coils Na: ${activeCoils}, Free length L₀: ${freeLength} mm
- Max deflection: ${maxDeflection ?? "?"} mm
- Final load: ${finalLoad?.toFixed(2) ?? "?"} N at k=${springRate?.toFixed(2) ?? "?"} N/mm
- Progressive stiffness (nonlinear)
- Shear stress: ${finalStress?.toFixed(1) ?? "?"} MPa

Please quote this conical spring with telescoping design capability.`;
    }
    return `Please quote spring ${code ?? "design TBD"} with d=${wireDiameter}mm, Dm=${meanDiameter}mm, Na=${activeCoils}, L0=${freeLength}mm, k=${springRate ?? "?"} N/mm, Δx=${maxDeflection ?? "?"}mm.`;
  };

  const form = useForm<RfqFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      company: "ISRI-SHUANGDI OEM",
      contactPerson: "Engineering Coordinator",
      email: "engineering@example.com",
      phone: "+86 21 1234 5678",
      country: "China",
      applicationType: isConical ? "Industrial Equipment" : "Suspension",
      annualVolume: "120,000",
      sop: "Q2 2026",
      productionRegion: "Asia",
      notes: generateDefaultNotes(),
    },
  });

  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = (values: RfqFormValues) => {
    const payload = {
      contact: {
        company: values.company,
        contactPerson: values.contactPerson,
        email: values.email,
        phone: values.phone,
        country: values.country,
      },
      project: {
        applicationType: values.applicationType,
        annualVolume: values.annualVolume,
        sop: values.sop,
        productionRegion: values.productionRegion,
      },
      springDesign: {
        code,
        wireDiameter,
        meanDiameter,
        activeCoils,
        shearModulus,
        freeLength,
        pitch,
        springRate,
        maxDeflection,
      },
      notes: values.notes,
    };

    console.log("RFQ payload", payload);
    setStatus("RFQ submitted (mock). In production this will call an API endpoint like POST /api/rfq.");
  };

  const summaryItems = isConical ? [
    { label: "Type", value: "Conical" },
    { label: "D₁ (mm)", value: largeDiameter ?? "—" },
    { label: "D₂ (mm)", value: smallDiameter ?? "—" },
    { label: "d (mm)", value: wireDiameter },
    { label: "Na", value: activeCoils },
    { label: "L₀ (mm)", value: freeLength },
    { label: "G (MPa)", value: shearModulus },
    { label: "k (N/mm)", value: springRate?.toFixed(2) ?? "—" },
    { label: "F (N)", value: finalLoad?.toFixed(2) ?? "—" },
    { label: "τ (MPa)", value: finalStress?.toFixed(1) ?? "—" },
    { label: "Δx max (mm)", value: maxDeflection ?? "—" },
  ] : [
    { label: "Code", value: code ?? "—" },
    { label: "d (mm)", value: wireDiameter },
    { label: "Dm (mm)", value: meanDiameter },
    { label: "Na", value: activeCoils },
    { label: "G (MPa)", value: shearModulus },
    { label: "L₀ (mm)", value: freeLength },
    { label: "Pitch (mm)", value: pitch ?? "—" },
    { label: "k (N/mm)", value: springRate ?? "—" },
    { label: "Δx max (mm)", value: maxDeflection ?? "—" },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Workflow • RFQ" zh="流程 • 询价" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Request for Quotation" zh="询价中心" />
        </h1>
        <p className="text-muted-foreground">
          <LanguageText
            en="Finalize your design parameters and send a consolidated RFQ to the ISRI-SHUANGDI sourcing team. "
            zh="此处占位一键询价，将计算、仿真、测试、CAD 的结果汇总成一份采供请求。"
          />
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Design Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="text-base font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Contact & Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  { name: "company" as const, label: "Company Name" },
                  { name: "contactPerson" as const, label: "Contact Person" },
                  { name: "email" as const, label: "Email" },
                  { name: "phone" as const, label: "Phone" },
                  { name: "country" as const, label: "Country / Region" },
                ] as const
              ).map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input id={field.name} {...form.register(field.name)} />
                  {form.formState.errors[field.name] && (
                    <p className="text-sm text-red-500">{form.formState.errors[field.name]?.message}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="applicationType">Application Type</Label>
                <select
                  id="applicationType"
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                  {...form.register("applicationType")}
                >
                  {"Engine Brake Suspension Seating Industrial Other".split(" ").map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {form.formState.errors.applicationType && (
                  <p className="text-sm text-red-500">{form.formState.errors.applicationType?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualVolume">Annual Volume (Estimated)</Label>
                <Input id="annualVolume" {...form.register("annualVolume")} />
                {form.formState.errors.annualVolume && (
                  <p className="text-sm text-red-500">{form.formState.errors.annualVolume?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sop">SOP / Start of Production</Label>
                <Input id="sop" {...form.register("sop")} />
                {form.formState.errors.sop && (
                  <p className="text-sm text-red-500">{form.formState.errors.sop?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="productionRegion">Region of Production</Label>
                <select
                  id="productionRegion"
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                  {...form.register("productionRegion")}
                >
                  {["Asia", "Europe", "North America", "South America", "Other"].map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                {form.formState.errors.productionRegion && (
                  <p className="text-sm text-red-500">{form.formState.errors.productionRegion?.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spring Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Requirement Details</Label>
              <textarea
                id="notes"
                rows={5}
                className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                {...form.register("notes")}
              />
              {form.formState.errors.notes && (
                <p className="text-sm text-red-500">{form.formState.errors.notes?.message}</p>
              )}
            </div>

            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              File upload placeholder — future versions will accept CAD references, test data, or PDF drawings with backend storage integration.
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            RFQ submissions will be routed to ISRI-SHUANGDI sourcing and manufacturing teams.
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Submit RFQ
          </Button>
        </div>
      </form>

      {status && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p>}
    </section>
  );
}
