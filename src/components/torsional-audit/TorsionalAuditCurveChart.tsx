import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SystemCurve } from "@/lib/torsional/types";

interface TorsionalAuditCurveChartProps {
  systemCurve: SystemCurve;
  operatingTheta?: number;
  playheadTheta: number;
}

export function TorsionalAuditCurveChart({ systemCurve, operatingTheta, playheadTheta }: TorsionalAuditCurveChartProps) {
  const { points, thetaSafeSystemDeg } = systemCurve;

  // Prepare data for Recharts
  const data = points.map(p => ({
    theta: p.thetaDeg,
    torque: p.torqueNmm,
  }));

  const formatTorque = (val: number) => (val / 1000).toFixed(2); // Show in Nm if preferred, but checklist says Nmm. Let's stick to Nmm.
  const formatTorqueNmm = (val: number) => val.toFixed(1);

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-tight">System Performance Curve</CardTitle>
          <div className="flex gap-4 text-[10px]">
             <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span className="text-slate-500 uppercase font-medium">Torque (T)</span>
             </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-6">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="theta" 
                type="number" 
                domain={[0, Math.max(thetaSafeSystemDeg * 1.05, operatingTheta ? operatingTheta * 1.05 : 0)]} 
                tick={{ fontSize: 10, fill: '#64748b' }}
                label={{ value: 'Angle θ (°)', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }}
                label={{ value: 'Torque (N·mm)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <Tooltip 
                contentStyle={{ fontSize: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${formatTorqueNmm(value)} N·mm`, 'Torque']}
                labelFormatter={(label: number) => `Angle: ${label.toFixed(2)}°`}
              />
              
              {/* Main System Curve */}
              <Line 
                type="monotone" 
                dataKey="torque" 
                stroke="#2563eb" 
                strokeWidth={2.5} 
                dot={false} 
                activeDot={{ r: 4, strokeWidth: 0 }}
                animationDuration={500}
              />

              {/* Hard Safety Limit Marker */}
              <ReferenceLine 
                x={thetaSafeSystemDeg} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                    value: 'LIMIT (瓶颈)', 
                    position: 'top', 
                    fill: '#ef4444', 
                    fontSize: 10, 
                    fontWeight: 'bold'
                }} 
              />

              {/* Customer Operating Requirement */}
              {operatingTheta !== undefined && operatingTheta > 0 ? (
                <ReferenceLine 
                    x={operatingTheta} 
                    stroke="#64748b" 
                    strokeDasharray="6 6" 
                    strokeWidth={1}
                    label={{ 
                        value: 'REQ (工况)', 
                        position: 'top', 
                        fill: '#475569', 
                        fontSize: 10, 
                        fontWeight: 'bold' 
                    }} 
                />
              ) : (
                <ReferenceLine 
                    x={0} 
                    stroke="transparent"
                    label={{ 
                        value: 'Operating range Not Provided by Customer (未提供工况范围)', 
                        position: 'insideTopLeft', 
                        fill: '#94a3b8', 
                        fontSize: 9, 
                        fontWeight: 'medium',
                        dx: 10,
                        dy: 40
                    }} 
                />
              )}

              {/* Playhead Marker */}
              <ReferenceLine 
                x={playheadTheta} 
                stroke="#10b981" 
                strokeWidth={2}
                label={{ 
                    value: 'θ', 
                    position: 'insideTopLeft', 
                    fill: '#059669', 
                    fontSize: 12, 
                    fontWeight: 'bold' 
                }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
             <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-bold">Current θ</span>
                <span className="text-xs font-mono font-bold text-emerald-600">{playheadTheta.toFixed(2)}°</span>
             </div>
             <div className="text-[9px] text-slate-400 italic max-w-[200px] text-right">
                * Traceable torque projection: T = Σ(n·k·R²·θ_rad). Derived from customer geometry.
             </div>
        </div>
      </CardContent>
    </Card>
  );
}
