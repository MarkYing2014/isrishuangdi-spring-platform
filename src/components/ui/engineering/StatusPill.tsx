import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, FileText } from "lucide-react";

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      status: {
        pass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        risk: "bg-amber-100 text-amber-700 border border-amber-200",
        fail: "bg-red-100 text-red-700 border border-red-200",
        approved: "bg-blue-100 text-blue-700 border border-blue-200",
        draft: "bg-slate-100 text-slate-600 border border-slate-200",
      },
      size: {
        sm: "text-[10px] h-5 px-2",
        md: "text-xs h-6 px-2.5",
        lg: "text-sm h-7 px-3",
      }
    },
    defaultVariants: {
      status: "draft",
      size: "md",
    },
  }
);

export interface StatusPillProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusPillVariants> {
  label?: string;
  showIcon?: boolean;
}

const icons = {
  pass: CheckCircle2,
  risk: AlertTriangle,
  fail: XCircle,
  approved: ShieldCheck,
  draft: FileText,
};

export function StatusPill({ className, status, size, label, showIcon = true, ...props }: StatusPillProps) {
  const Icon = icons[status || "draft"];

  return (
    <div className={cn(statusPillVariants({ status, size }), className)} {...props}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {label || status}
    </div>
  );
}
