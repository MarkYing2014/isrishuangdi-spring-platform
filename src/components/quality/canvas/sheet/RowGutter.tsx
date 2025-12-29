"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RowGutterProps {
  index: number;
  status: "PASS" | "WARN" | "FAIL";
  isRaw: boolean;
}

export function RowGutter({ index, status, isRaw }: RowGutterProps) {
    let statusColor = "bg-gray-100";
    if (!isRaw) {
        if (status === "FAIL") statusColor = "bg-red-200";
        else if (status === "WARN") statusColor = "bg-amber-200";
        else statusColor = "bg-green-100";
    }

    return (
        <div className={cn("w-[50px] flex-shrink-0 flex items-center justify-center border-r border-b text-xs text-gray-400 select-none relative", statusColor)}>
            {index + 1}
            {/* Active Stripe */}
            {!isRaw && status === "FAIL" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
        </div>
    );
}
