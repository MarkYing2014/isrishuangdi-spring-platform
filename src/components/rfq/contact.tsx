import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RFQContactInfo } from "@/lib/rfq/types";
import { LanguageText } from "@/components/language-context";

interface ContactPanelProps {
    value: RFQContactInfo;
    onChange: (val: RFQContactInfo) => void;
}

export function ContactPanel({ value, onChange }: ContactPanelProps) {
    const update = (field: keyof RFQContactInfo, val: string) => {
        onChange({ ...value, [field]: val });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <LanguageText en="Contact & Project Context" zh="联系人与项目背景" />
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label><LanguageText en="Company" zh="公司名称" /></Label>
                        <Input value={value.company} onChange={(e) => update("company", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label><LanguageText en="Contact Person" zh="联系人" /></Label>
                        <Input value={value.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label><LanguageText en="Email" zh="电子邮箱" /></Label>
                        <Input value={value.email} onChange={(e) => update("email", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label><LanguageText en="Phone" zh="联系电话" /></Label>
                        <Input value={value.phone} onChange={(e) => update("phone", e.target.value)} />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <Label className="mb-3 block text-base font-medium">
                        <LanguageText en="Project Context" zh="项目背景" />
                    </Label>
                    <RadioGroup 
                        value={value.projectContext} 
                        onValueChange={(v) => update("projectContext", v as any)}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <RadioGroupItem value="new_program" id="ctx-new" />
                            <Label htmlFor="ctx-new" className="cursor-pointer font-normal">
                                <LanguageText en="New Program Development" zh="新项目开发" />
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <RadioGroupItem value="cost_down" id="ctx-cost" />
                            <Label htmlFor="ctx-cost" className="cursor-pointer font-normal">
                                <LanguageText en="Cost-down / Redesign" zh="降本 / 重新设计" />
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <RadioGroupItem value="validation" id="ctx-val" />
                            <Label htmlFor="ctx-val" className="cursor-pointer font-normal">
                                <LanguageText en="Validation Support (Testing)" zh="验证支持 (测试)" />
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <RadioGroupItem value="match_make" id="ctx-match" />
                            <Label htmlFor="ctx-match" className="cursor-pointer font-normal">
                                <LanguageText en="Manufacturing Feasibility Review" zh="制造可行性评审" />
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
            </CardContent>
        </Card>
    );
}
