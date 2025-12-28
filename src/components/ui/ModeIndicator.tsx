"use client";

import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Eye, ClipboardCheck, User } from "lucide-react";

export type AccessMode = "preview" | "audit" | "customer";

interface ModeIndicatorProps {
  className?: string;
}

/**
 * ModeIndicator - Displays the current access mode
 * 
 * Usage:
 *   ?mode=preview  → Engineering Preview Mode (blue)
 *   ?mode=audit    → Audit/PPAP Mode (amber)
 *   (no param)     → Customer Mode (default, gray)
 * 
 * This helps distinguish:
 *   - Engineering access (internal development/testing)
 *   - Customer access (production/external)
 */
export function ModeIndicator({ className }: ModeIndicatorProps) {
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") as AccessMode) || "customer";

  const config = {
    preview: {
      label: "PREVIEW",
      labelZh: "预览模式",
      icon: Eye,
      className: "bg-blue-500/10 text-blue-600 border-blue-200",
      description: "Engineering Preview",
    },
    audit: {
      label: "AUDIT",
      labelZh: "审计模式",
      icon: ClipboardCheck,
      className: "bg-amber-500/10 text-amber-600 border-amber-200",
      description: "PPAP/OEM Audit",
    },
    customer: {
      label: "LIVE",
      labelZh: "客户模式",
      icon: User,
      className: "bg-slate-500/10 text-slate-500 border-slate-200",
      description: "Customer View",
    },
  };

  const current = config[mode] || config.customer;
  const Icon = current.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${current.className} font-mono text-[9px] tracking-wider px-2 py-0.5 ${className}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {current.label}
    </Badge>
  );
}

/**
 * Hook to get the current access mode
 */
export function useAccessMode(): AccessMode {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as AccessMode;
  
  if (mode === "preview" || mode === "audit") {
    return mode;
  }
  return "customer";
}

/**
 * Helper to check if current mode is engineering (preview or audit)
 */
export function useIsEngineeringMode(): boolean {
  const mode = useAccessMode();
  return mode === "preview" || mode === "audit";
}
