"use client";

import React, { useEffect, useState } from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { generateAutoMapping, SYSTEM_FIELDS } from "@/lib/quality/mapping/autoMap";
import { cn } from "@/lib/utils";

export function QualityMappingPanel() {
  const rawRows = useQualityStore(state => state.rawRows);
  const columnMapping = useQualityStore(state => state.columnMapping);
  const updateMapping = useQualityStore(state => state.updateMapping);
  const specLimits = useQualityStore(state => state.specLimits);
  const setSpecLimits = useQualityStore(state => state.setSpecLimits);

  // Local input state for controlled inputs
  const [lslInput, setLslInput] = useState(specLimits.lsl?.toString() ?? "");
  const [uslInput, setUslInput] = useState(specLimits.usl?.toString() ?? "");
  const [targetInput, setTargetInput] = useState(specLimits.target?.toString() ?? "");

  const rawHeaders = React.useMemo(() => {
    if (!rawRows.length) return [];
     return Object.keys(rawRows[0].cells ?? {});
  }, [rawRows]);

  // Auto-run mapping once on load if empty
  useEffect(() => {
    if (rawHeaders.length > 0 && columnMapping.length === 0) {
      const auto = generateAutoMapping(rawHeaders) as any;
      updateMapping(auto);
    }
  }, [rawHeaders, columnMapping.length, updateMapping]);

  const handleMapChange = (rawHeader: string, targetKey: string) => {
    const newMapping = [...columnMapping];
    const existingIdx = newMapping.findIndex(m => m.raw === rawHeader);
    
    if (targetKey === "__IGNORE__") {
        // Remove mapping
        if (existingIdx >= 0) newMapping.splice(existingIdx, 1);
    } else {
        const sysField = SYSTEM_FIELDS.find(f => f.key === targetKey);
        if (!sysField) return;

        const newEntry = {
            raw: rawHeader,
            target: targetKey,
            type: sysField.type as any, // unsafe cast for demo
        };

        if (existingIdx >= 0) {
            newMapping[existingIdx] = newEntry as any;
        } else {
            newMapping.push(newEntry as any);
        }
    }
    updateMapping(newMapping);
  };

  const handleSpecLimitBlur = (field: 'lsl' | 'usl' | 'target', value: string) => {
    const parsed = value.trim() === "" ? undefined : parseFloat(value);
    if (parsed !== undefined && isNaN(parsed)) return; // Invalid, don't update
    setSpecLimits({ [field]: parsed });
  };

  if (rawHeaders.length === 0) return <div className="p-4 text-gray-500">No data loaded.</div>;

  return (
    <div className="p-4 border rounded bg-white shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Field Mapping</h3>
        <button 
           onClick={() => updateMapping(generateAutoMapping(rawHeaders) as any)}
           className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
        >
            Auto-Guess
        </button>
      </div>
      
      <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-500 border-b pb-2">
          <div className="col-span-5">File Header</div>
          <div className="col-span-2 text-center">→</div>
          <div className="col-span-5">System Field</div>
      </div>

      <div className="max-h-[200px] overflow-y-auto space-y-2">
      {rawHeaders.map(header => {
          const currentMap = columnMapping.find(m => m.raw === header);
          const isMapped = !!currentMap;

          return (
              <div key={header} className="grid grid-cols-12 gap-2 items-center hover:bg-gray-50 p-1 rounded">
                  <div className="col-span-5 truncate" title={header}>{header}</div>
                  <div className="col-span-2 text-center text-gray-400">→</div>
                  <div className="col-span-5">
                      <select 
                        className={cn("w-full border rounded p-1 text-xs", isMapped ? "bg-white text-slate-900" : "bg-gray-50 text-gray-400")}
                        value={currentMap?.target || "__IGNORE__"}
                        onChange={(e) => handleMapChange(header, e.target.value)}
                      >
                          <option value="__IGNORE__">(Ignore)</option>
                          {SYSTEM_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>
                                  {f.label} ({f.type})
                              </option>
                          ))}
                      </select>
                  </div>
              </div>
          );
      })}
      </div>
      
      <div className="text-xs text-right text-gray-400">
         Mapped {columnMapping.length} / {rawHeaders.length} columns
      </div>

      {/* Fixed Spec Limits Section */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-semibold text-sm text-slate-700 mb-3">
          Fixed Spec Limits / 固定规格限
          <span className="text-xs font-normal text-gray-400 ml-2">
            (Used when no column is mapped / 当无列映射时使用)
          </span>
        </h4>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">LSL / 下规格限</label>
            <input
              type="number"
              step="any"
              value={lslInput}
              onChange={(e) => setLslInput(e.target.value)}
              onBlur={(e) => handleSpecLimitBlur('lsl', e.target.value)}
              placeholder="e.g. 120"
              className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">USL / 上规格限</label>
            <input
              type="number"
              step="any"
              value={uslInput}
              onChange={(e) => setUslInput(e.target.value)}
              onBlur={(e) => handleSpecLimitBlur('usl', e.target.value)}
              placeholder="e.g. 130"
              className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target / 目标值</label>
            <input
              type="number"
              step="any"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              onBlur={(e) => handleSpecLimitBlur('target', e.target.value)}
              placeholder="e.g. 125"
              className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {(specLimits.lsl !== undefined || specLimits.usl !== undefined) && (
          <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
            ✓ Spec limits configured / 规格限已配置
          </div>
        )}
      </div>
    </div>
  );
}
