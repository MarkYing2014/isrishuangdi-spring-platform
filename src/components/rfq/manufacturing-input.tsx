
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RFQManufacturingInputs } from "@/lib/rfq/types";
import { AlertTriangle } from "lucide-react";
import { LanguageText } from "@/components/language-context";

interface ManufacturingInputFormProps {
    value: RFQManufacturingInputs;
    onChange: (val: RFQManufacturingInputs) => void;
    riskNotes: string[];
}

export function ManufacturingInputForm({ value, onChange, riskNotes }: ManufacturingInputFormProps) {
    const update = (field: keyof RFQManufacturingInputs, val: string) => {
        onChange({ ...value, [field]: val });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <LanguageText en="Manufacturing & Supply Chain Inputs" zh="制造与供应链输入" />
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Volume & Timing */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label><LanguageText en="Annual Volume (EAU)" zh="年产量 (EAU)" /></Label>
                        <Input 
                            value={value.annualVolume} 
                            onChange={(e) => update("annualVolume", e.target.value)} 
                            placeholder="e.g. 120,000" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label><LanguageText en="SOP Date" zh="量产日期 (SOP)" /></Label>
                        <Input 
                            value={value.sopDate} 
                            onChange={(e) => update("sopDate", e.target.value)}
                            placeholder="e.g. Q2 2026"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label><LanguageText en="Prototype Qty" zh="样件数量" /></Label>
                        <Input 
                            value={value.prototypeQty} 
                            onChange={(e) => update("prototypeQty", e.target.value)}
                            placeholder="e.g. 50 pcs"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label><LanguageText en="Production Region" zh="生产区域" /></Label>
                        <Select value={value.productionRegion} onValueChange={(v) => update("productionRegion", v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Asia"><LanguageText en="Asia" zh="亚洲" /></SelectItem>
                                <SelectItem value="Europe"><LanguageText en="Europe" zh="欧洲" /></SelectItem>
                                <SelectItem value="North America"><LanguageText en="North America" zh="北美" /></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Process & Quality */}
                <div className="grid md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label><LanguageText en="Surface Treatment" zh="表面处理" /></Label>
                        <Select value={value.surfaceTreatment ?? "none"} onValueChange={(v) => update("surfaceTreatment", v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select process" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none"><LanguageText en="None / Oil Only" zh="无 / 仅涂油" /></SelectItem>
                                <SelectItem value="shot_peen"><LanguageText en="Shot Peening (Fatigue)" zh="喷丸处理 (强化疲劳)" /></SelectItem>
                                <SelectItem value="phosphate"><LanguageText en="Phosphate Coating" zh="磷化处理" /></SelectItem>
                                <SelectItem value="custom"><LanguageText en="Custom Spec" zh="自定义规格" /></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label><LanguageText en="Quality Standard" zh="质量标准" /></Label>
                         <Select value={value.qualityStandard ?? "iatf16949"} onValueChange={(v) => update("qualityStandard", v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select standard" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="iatf16949">IATF 16949 (Auto)</SelectItem>
                                <SelectItem value="iso9001">ISO 9001</SelectItem>
                                <SelectItem value="other"><LanguageText en="Other" zh="其他" /></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Risk Notes (Auto) */}
                {riskNotes.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                        <div className="flex items-center gap-2 text-amber-600 font-medium text-sm mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Manufacturing Feasibility Notes (Auto-detected)
                        </div>
                        <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
                            {riskNotes.map((note, idx) => (
                                <li key={idx}>{note}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
