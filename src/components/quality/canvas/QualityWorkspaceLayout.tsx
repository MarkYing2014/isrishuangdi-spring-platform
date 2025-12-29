"use client";

import React from "react";
import { LeftRail } from "./rail/LeftRail";
import { SheetViewport } from "./sheet/SheetViewport";

export function QualityWorkspaceLayout() {
  return (
    <div className="flex-1 flex overflow-hidden">
        {/* Left Rail */}
        <LeftRail />
        
        {/* Main Viewport */}
        <div className="flex-1 overflow-hidden relative border-l border-gray-200">
            <SheetViewport />
        </div>
    </div>
  );
}
