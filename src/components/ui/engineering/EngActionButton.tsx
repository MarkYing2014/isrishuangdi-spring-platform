import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { type VariantProps } from "class-variance-authority";

// wrapper around shadcn button to enforce "industrial" feel
export interface EngActionButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  intent?: "primary" | "secondary" | "danger" | "ghost";
}

export const EngActionButton = forwardRef<HTMLButtonElement, EngActionButtonProps>(
  ({ className, intent = "primary", children, variant, size, ...props }, ref) => {
    
    // Preset styles for engineering actions
    const styles = {
      primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm border-transparent",
      secondary: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm",
      danger: "bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm",
      ghost: "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent",
    };

    return (
      <Button
        ref={ref}
        variant="outline" // Base consistent variant
        className={cn(
          "rounded-md font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          "h-9 px-4 py-2", // Standard compact size
          styles[intent],
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
EngActionButton.displayName = "EngActionButton";
