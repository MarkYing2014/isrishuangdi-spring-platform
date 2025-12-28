import React from "react";

export function PreviewWatermark({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-40 select-none">
        <div className="text-4xl font-black text-red-600 tracking-widest border-4 border-red-600 p-4 transform -rotate-12 bg-white/10 backdrop-blur-sm text-center">
          <div>FORCED VISUAL / 强制显示</div>
          <div className="text-xl mt-1 font-bold">GEOMETRY INTERFERENCE / 几何干涉</div>
        </div>
      </div>
      <div className="absolute bottom-2 right-2 text-[10px] text-red-500 font-mono bg-black/50 px-2 py-1 rounded">
        NON-MANUFACTURABLE / 不可制造
      </div>
    </div>
  );
}
