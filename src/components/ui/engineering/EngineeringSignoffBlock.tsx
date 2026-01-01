import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface EngineeringSignoffBlockProps {
  engineerName: string;
  date: string;
  versionHash: string;
  status?: "approved" | "rejected" | "pending";
  className?: string;
}

export function EngineeringSignoffBlock({ 
  engineerName, 
  date, 
  versionHash, 
  status = "approved",
  className 
}: EngineeringSignoffBlockProps) {
  return (
    <div className={cn(
      "border-l-4 pl-4 py-1", 
      status === "approved" ? "border-blue-600" : "border-slate-300",
      className
    )}>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className={cn(
          "w-4 h-4", 
          status === "approved" ? "text-blue-600" : "text-slate-400"
        )} />
        <span className={cn(
          "text-xs font-bold uppercase tracking-widest",
          status === "approved" ? "text-blue-700" : "text-slate-500"
        )}>
          {status === "approved" ? "Engineering Approved" : "Signoff Pending"}
        </span>
      </div>
      
      <div className="text-sm font-medium text-slate-900">
        Signed by: <span className="font-semibold">{engineerName}</span>
      </div>
      
      <div className="flex gap-4 mt-1 text-[10px] uppercase text-muted-foreground font-mono">
        <span>Date: {date}</span>
        <span>Hash: {versionHash.substring(0, 8)}</span>
      </div>
    </div>
  );
}
