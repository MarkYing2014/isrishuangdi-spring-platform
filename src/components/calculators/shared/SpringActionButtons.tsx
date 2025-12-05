"use client";

import { Button } from "@/components/ui/button";
import { 
  Play, 
  Box, 
  FileText, 
  FileDown, 
  Send,
  Loader2,
} from "lucide-react";
import type { SpringType } from "@/lib/springTypes";
import { getPipeline, buildPipelineUrl } from "@/lib/pipeline/springPipelines";

interface SpringActionButtonsProps {
  springType: SpringType;
  designParams: Record<string, string | number | boolean | undefined>;
  disabled?: boolean;
  isExporting?: boolean;
  onExportPdf?: () => void;
  showTester?: boolean;
  showSimulator?: boolean;
  showReport?: boolean;
  showCadExport?: boolean;
  showRfq?: boolean;
}

/**
 * Unified action buttons for all spring calculators
 * 所有弹簧计算器的统一操作按钮
 */
export function SpringActionButtons({
  springType,
  designParams,
  disabled = false,
  isExporting = false,
  onExportPdf,
  showTester = true,
  showSimulator = true,
  showReport = false,
  showCadExport = true,
  showRfq = true,
}: SpringActionButtonsProps) {
  const pipeline = getPipeline(springType);
  
  // Build URLs with design parameters
  const testerUrl = buildPipelineUrl(pipeline.testerPath, designParams);
  const simulatorUrl = buildPipelineUrl(pipeline.simulatorPath, designParams);
  const reportUrl = buildPipelineUrl(pipeline.reportPath, designParams);
  const cadExportUrl = buildPipelineUrl(pipeline.cadExportPath, designParams);
  const rfqUrl = buildPipelineUrl(pipeline.rfqPath, designParams);

  return (
    <div className="space-y-2">
      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-2">
        {showTester && (
          <Button 
            asChild 
            variant="default" 
            className="w-full"
            disabled={disabled}
          >
            <a href={disabled ? "#" : testerUrl}>
              <Play className="mr-2 h-4 w-4" />
              Force Tester
            </a>
          </Button>
        )}
        
        {showSimulator && (
          <Button 
            asChild 
            variant="secondary" 
            className="w-full"
            disabled={disabled}
          >
            <a href={disabled ? "#" : simulatorUrl}>
              <Box className="mr-2 h-4 w-4" />
              3D Model
            </a>
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        {showReport && (
          <Button 
            asChild 
            variant="outline" 
            className="w-full"
            disabled={disabled}
          >
            <a href={disabled ? "#" : reportUrl}>
              <FileText className="mr-2 h-4 w-4" />
              Report
            </a>
          </Button>
        )}

        {showCadExport && onExportPdf && (
          <Button 
            variant="outline" 
            className="w-full"
            disabled={disabled || isExporting}
            onClick={onExportPdf}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
        )}

        {showCadExport && !onExportPdf && (
          <Button 
            asChild 
            variant="outline" 
            className="w-full"
            disabled={disabled}
          >
            <a href={disabled ? "#" : cadExportUrl}>
              <FileDown className="mr-2 h-4 w-4" />
              CAD Export
            </a>
          </Button>
        )}

        {showRfq && (
          <Button 
            asChild 
            variant="outline" 
            className="w-full border-green-600 text-green-400 hover:bg-green-950"
            disabled={disabled}
          >
            <a href={disabled ? "#" : rfqUrl}>
              <Send className="mr-2 h-4 w-4" />
              Send to RFQ
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

interface BackToCalculatorButtonProps {
  springType: SpringType;
}

/**
 * Back to calculator button for tester/simulator pages
 */
export function BackToCalculatorButton({ springType }: BackToCalculatorButtonProps) {
  const pipeline = getPipeline(springType);
  
  return (
    <Button asChild variant="outline" className="w-full">
      <a href={pipeline.calculatorPath}>
        ← Back to Calculator / 返回计算器
      </a>
    </Button>
  );
}
