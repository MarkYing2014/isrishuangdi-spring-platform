
"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RFQHeader } from "@/components/rfq/header";
import { DesignSummaryCard } from "@/components/rfq/design-summary";
import { EngineeringConfirmationCard } from "@/components/rfq/confirmation";
import { ManufacturingInputForm } from "@/components/rfq/manufacturing-input";
import { SupportingFilesPanel } from "@/components/rfq/files";
import { ContactPanel } from "@/components/rfq/contact";
import { FooterCTA } from "@/components/rfq/cta";
import { EngineeringSummary, RFQManufacturingInputs, RFQState, RFQContactInfo, ReviewVerdict } from "@/lib/rfq/types";
import { LanguageText } from "@/components/language-context";

// Helper to parse params
const num = (val: string | null) => val ? Number(val) : NaN;

export default function RfqPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading Engineering RFQ Center...</div>}>
            <RfqContent />
        </Suspense>
    );
}

function RfqContent() {
    const searchParams = useSearchParams();
    
    // 1. Engineering Definition (Derived from URL for now)
    const summary = useMemo<EngineeringSummary>(() => {
        const type = searchParams.get("type") || searchParams.get("springType") || "arc";
        const d = num(searchParams.get("d"));
        const D = num(searchParams.get("D"));
        // Mock Pack Data if Arc
        const packGroups = type.toLowerCase().includes("arc") ? [
            {
                name: "Outer Pack",
                count: num(searchParams.get("n")) || 3,
                kStages: [num(searchParams.get("k")) || 120, 220, 380],
                phiBreaksDeg: [15, 28]
            }
        ] : undefined;

        // Mock Verdict Logic (In real app, re-run review engine or fetch from store)
        const utilization = 87.5; 
        const verdict: ReviewVerdict = utilization > 95 ? "FAIL" : utilization > 85 ? "CONDITIONAL" : "PASS";
        const issues = verdict === "CONDITIONAL" ? ["Stage 3 stress utilization > 85%", "Coil index near manufacturing limit"] : [];

        return {
            springType: type as any,
            material: searchParams.get("material") || "50CrV4",
            designVersion: "ARC-2024-09-15-REV-C",
            designHash: "9f31a2c8",
            parameters: { d, D, Na: num(searchParams.get("Na")) },
            performance: {
                maxLoad: num(searchParams.get("M")) || 62.4,
                maxStressMPa: num(searchParams.get("tau")) || 950,
                allowableStressMPa: 1100,
                utilization, // 87.5%
                fatigueStatus: "high_cycle",
            },
            packGroups,
            reviewVerdict: verdict,
            reviewIssues: issues,
        };
    }, [searchParams]);

    // 2. Page State
    const [rfqState, setRfqState] = useState<RFQState>({
        status: "DRAFT",
        isConfirmed: false
    });

    const [mfgInputs, setMfgInputs] = useState<RFQManufacturingInputs>({
        annualVolume: "",
        sopDate: "",
        productionRegion: "Asia",
    });

    const [contact, setContact] = useState<RFQContactInfo>({
        company: "ISRI-SHUANGDI OEM",
        contactPerson: "Engineering Coordinator",
        email: "engineering@example.com",
        phone: "+86 21 1234 5678",
        country: "China",
        projectContext: "new_program"
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // 3. Actions
    const handleGeneratePackage = async () => {
        setIsSubmitting(true);
        // Simulate API / Generation
        await new Promise(r => setTimeout(r, 1500));
        
        const packageData = {
            metadata: {
                rfqId: "RFQ-" + Date.now(),
                generatedAt: new Date().toISOString(),
                designVersion: summary.designVersion,
                designHash: summary.designHash
            },
            engineering: summary,
            manufacturing: mfgInputs,
            contact
        };
        
        console.log("Generated RFQ Package:", packageData);
        alert("Engineering RFQ Package Generated! \n(Check Console for JSON output)");
        
        setRfqState(prev => ({ ...prev, status: "SUBMITTED" }));
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-32">
            <RFQHeader summary={summary} rfqState={rfqState} />

            <main className="max-w-4xl mx-auto px-4 space-y-8">
                {/* 1. Design Summary (Read Only) */}
                <section>
                    <DesignSummaryCard summary={summary} />
                </section>

                {/* 2. Engineering Confirmation */}
                <section>
                    <h2 className="text-lg font-bold mb-3 text-slate-800">
                        2. <LanguageText en="Engineering Validation" zh="工程验证" />
                    </h2>
                    <EngineeringConfirmationCard 
                        isConfirmed={rfqState.isConfirmed} 
                        onToggle={(c) => setRfqState(prev => ({ ...prev, isConfirmed: c }))}
                        designHash={summary.designHash}
                    />
                </section>

                {/* 3. Manufacturing Inputs (Gated) */}
                <div className={`space-y-8 transition-opacity ${rfqState.isConfirmed ? "opacity-100" : "opacity-50 pointer-events-none grayscale"}`}>
                    <section>
                        <h2 className="text-lg font-bold mb-3 text-slate-800">
                            3. <LanguageText en="Manufacturing & Supply Chain" zh="制造与供应链" />
                        </h2>
                        <ManufacturingInputForm 
                            value={mfgInputs} 
                            onChange={setMfgInputs} 
                            riskNotes={summary.reviewIssues} // Suggest mfg risks from engineering issues
                        />
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-slate-800">
                            4. <LanguageText en="Supporting Evidence" zh="支持性证据" />
                        </h2>
                        <SupportingFilesPanel />
                    </section>
                    
                    <section>
                        <h2 className="text-lg font-bold mb-3 text-slate-800">
                            5. <LanguageText en="Contact & Context" zh="联系人与背景" />
                        </h2>
                        <ContactPanel value={contact} onChange={setContact} />
                    </section>
                </div>
            </main>

            <FooterCTA 
                onGenerate={handleGeneratePackage} 
                isDisabled={!rfqState.isConfirmed} 
                isSubmitting={isSubmitting} 
            />
        </div>
    );
}
