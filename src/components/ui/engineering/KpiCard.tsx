import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const kpiCardVariants = cva(
  "relative overflow-hidden transition-all",
  {
    variants: {
      status: {
        normal: "border-slate-200 bg-white hover:border-slate-300",
        warning: "border-amber-200 bg-amber-50/30 hover:border-amber-300",
        critical: "border-red-200 bg-red-50/30 hover:border-red-300",
        neutral: "border-slate-100 bg-slate-50/50",
      },
    },
    defaultVariants: {
      status: "normal",
    },
  }
);

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof kpiCardVariants> {
  title: string;
  value: string | number;
  unit?: string;
  label?: string; // Sub-label or delta
  icon?: React.ReactNode;
}

export function KpiCard({ className, status, title, value, unit, label, icon, ...props }: KpiCardProps) {
  return (
    <Card className={cn(kpiCardVariants({ status }), className)} {...props}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          {icon && <div className="text-muted-foreground/50">{icon}</div>}
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className={cn(
            "text-2xl font-bold tracking-tight font-mono",
            status === "critical" ? "text-red-700" : 
            status === "warning" ? "text-amber-700" : 
            "text-slate-900"
          )}>
            {value}
          </span>
          {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>

        {label && (
          <div className="mt-1 text-xs text-muted-foreground/80 font-medium">
            {label}
          </div>
        )}

        {/* Status Indicator Bar */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          status === "critical" ? "bg-red-500" :
          status === "warning" ? "bg-amber-500" :
          "bg-transparent"
        )} />
      </CardContent>
    </Card>
  );
}
