"use client";

interface DimensionHintProps {
  label: string;
  code: string;
  description: string;
}

export function DimensionHint({ label, code, description }: DimensionHintProps) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-slate-50 p-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-medium text-slate-600">
        {code}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
