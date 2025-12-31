import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { LanguageText } from "@/components/language-context";

interface FooterCTAProps {
    onGenerate: () => void;
    isDisabled: boolean;
    isSubmitting: boolean;
}

export function FooterCTA({ onGenerate, isDisabled, isSubmitting }: FooterCTAProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
                <div className="text-sm text-muted-foreground hidden lg:block flex-1">
                    <LanguageText 
                        en="This will generate an engineering-based RFQ package including design summary, review notes, and manufacturing inputs." 
                        zh="这将生成一份包含设计摘要、评审说明和制造输入的工程询价包。" 
                    />
                </div>
                <Button 
                    size="lg" 
                    className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 text-base shadow-lg shadow-blue-200"
                    onClick={onGenerate}
                    disabled={isDisabled || isSubmitting}
                >
                    {isSubmitting ? (
                        <LanguageText en="Generating..." zh="生成中..." />
                    ) : (
                        <span className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            <LanguageText en="Generate Engineering RFQ Package" zh="生成工程询价包" />
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}
