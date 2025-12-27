import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw } from "lucide-react";

interface TorsionalAuditPlayControllerProps {
  thetaSafe: number;
  currentTheta: number;
  onThetaChange: (theta: number | ((prev: number) => number)) => void;
}

export function TorsionalAuditPlayController({ thetaSafe, currentTheta, onThetaChange }: TorsionalAuditPlayControllerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); 

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        onThetaChange((prev: number) => {
          const step = 0.25 * speed; // Base step size
          const next = prev + step;
          if (next >= thetaSafe) {
            setIsPlaying(false);
            return thetaSafe;
          }
          return next;
        });
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, thetaSafe, onThetaChange]);

  const disabled = thetaSafe <= 0;

  return (
    <Card className="border-slate-200 shadow-sm bg-slate-50/30 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4 space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={disabled}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                title={isPlaying ? "Pause" : "Play Explanation Animation"}
               >
                 {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
               </button>
               <button 
                onClick={() => {
                   setIsPlaying(false);
                   onThetaChange(0);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                title="Reset to Zero"
               >
                 <RotateCcw className="h-4 w-4" />
               </button>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm" title="Animation Speed">
                {[0.25, 0.5, 1].map(s => (
                    <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${speed === s ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {s}x
                    </button>
                ))}
            </div>
         </div>

         <div className="space-y-3 pt-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
               <div className="flex flex-col">
                  <span>Current Input θ</span>
                  <span className="text-emerald-600 font-mono text-[11px]">{currentTheta.toFixed(2)}°</span>
               </div>
               <div className="flex flex-col text-right">
                  <span>Safety Limit θ_safe</span>
                  <span className="text-slate-600 font-mono text-[11px]">{thetaSafe.toFixed(2)}°</span>
               </div>
            </div>
            
            <div className="px-1">
              <Slider 
                  value={[currentTheta]} 
                  max={thetaSafe || 1e-9} 
                  step={0.01} 
                  onValueChange={(vals) => {
                      setIsPlaying(false);
                      onThetaChange(vals[0]);
                  }}
                  disabled={disabled}
                  className="cursor-pointer"
              />
            </div>
         </div>

         {disabled ? (
             <div className="text-[10px] text-red-500 font-semibold italic text-center py-1 bg-red-50 rounded border border-red-100">
                LOCKED: No valid operating range within customer design limits.
             </div>
         ) : (
            <div className="text-[9px] text-slate-400 italic text-center px-4">
                Strict Clamping: Animates from 0° to the governed safety limit to visualize geometric constraints.
            </div>
         )}
      </CardContent>
    </Card>
  );
}
