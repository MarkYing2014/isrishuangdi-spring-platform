import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const workflowBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
  {
    variants: {
      state: {
        concept: "bg-slate-100 text-slate-500 border border-slate-200",
        review: "bg-amber-100 text-amber-700 border border-amber-200",
        approved: "bg-blue-600 text-white border border-blue-700 shadow-sm",
        rfq: "bg-emerald-600 text-white border border-emerald-700 shadow-sm",
      },
    },
    defaultVariants: {
      state: "concept",
    },
  }
);

export interface WorkflowBadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof workflowBadgeVariants> {
  label?: string; // Optional override
}

export function WorkflowBadge({ className, state, label, ...props }: WorkflowBadgeProps) {
  return (
    <span className={cn(workflowBadgeVariants({ state }), className)} {...props}>
      {label || state}
    </span>
  );
}
