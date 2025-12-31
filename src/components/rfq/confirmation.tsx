import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LanguageText } from "@/components/language-context";

interface EngineeringConfirmationCardProps {
    isConfirmed: boolean;
    onToggle: (checked: boolean) => void;
    designHash: string;
}

export function EngineeringConfirmationCard({ isConfirmed, onToggle, designHash }: EngineeringConfirmationCardProps) {
    return (
        <Card className={`border-l-4 transition-colors ${isConfirmed ? "border-l-green-600 bg-green-50/30" : "border-l-slate-300"}`}>
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <Checkbox 
                        id="confirm-engineering" 
                        checked={isConfirmed}
                        onCheckedChange={(c) => onToggle(!!c)}
                        className="mt-1"
                    />
                    <div className="space-y-1">
                        <Label htmlFor="confirm-engineering" className="text-base font-medium cursor-pointer">
                            <LanguageText 
                                en="Engineering Responsibility Confirmation" 
                                zh="工程责任确认" 
                            />
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            <LanguageText 
                                en={`I confirm that this RFQ is based on the above engineering definition (Hash: ${designHash.substring(0,8)}). I understand that any changes to the design parameters after this point will invalidate this quotation request.`} 
                                zh={`我确认此次询价是基于上述工程定义（Hash: ${designHash.substring(0,8)}）。我知晓在此之后对设计参数的任何更改都将使本报价请求失效。`} 
                            />
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
