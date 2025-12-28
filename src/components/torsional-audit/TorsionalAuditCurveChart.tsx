import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// Simplified interface to avoid dependency on full SystemCurve which has audit fields
interface ChartSystemCurve {
    points: { thetaDeg: number; torqueNmm: number }[];
    thetaSafeSystemDeg: number;
}

interface TorsionalAuditCurveChartProps {
  systemCurve: ChartSystemCurve;
  operatingTheta?: number;
  playheadTheta: number;
  thetaSafeLife?: number;
  thetaPhysicalStop?: number;
}

export function TorsionalAuditCurveChart({ 
    systemCurve, 
    operatingTheta, 
    playheadTheta, 
    thetaSafeLife, 
    thetaPhysicalStop 
}: TorsionalAuditCurveChartProps) {
  const { points, thetaSafeSystemDeg } = systemCurve;

  // Prepare data for Recharts
  const data = points.map(p => ({
    theta: p.thetaDeg,
    torque: p.torqueNmm,
  }));

  const formatTorqueNmm = (val: number) => val.toFixed(1);

  // Determine X-Axis Max
  const maxTheta = Math.max(
    thetaSafeSystemDeg,
    operatingTheta || 0,
    thetaSafeLife || 0,
    thetaPhysicalStop || 0
  ) * 1.05;

  return (
    <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-tight">System Performance Curve</CardTitle>
          <div className="flex flex-wrap gap-3 text-[10px]">
             <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span className="text-slate-500 uppercase font-medium">Torque</span>
             </div>
             {thetaSafeLife && (
                 <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-emerald-500" />
                    <span className="text-emerald-600 uppercase font-medium">Safe</span>
                 </div>
             )}
            {thetaPhysicalStop && (
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-rose-600 rounded-sm" />
                    <span className="text-rose-600 uppercase font-medium">Hard</span>
                 </div>
             )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-6">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="theta" 
                type="number" 
                domain={[0, maxTheta]} 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value: number) => value.toFixed(1)}
                tickCount={6}
                label={{ value: 'Angle θ (°)', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b' }}
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

              {/* 1. Safe Life Limit (θ_safe) - Green Dashed */}
              {thetaSafeLife !== undefined && (
                <ReferenceLine 
                    x={thetaSafeLife} 
                    stroke="#10b981" 
                    strokeDasharray="5 5" 
                    strokeWidth={1.5}
                    label={{ 
                        value: 'θ safe', 
                        position: 'insideTopLeft', 
                        fill: '#059669', 
                        fontSize: 8, 
                        fontWeight: 'bold',
                        dy: 15
                    }} 
                />
              )}

              {/* 2. Physical Hard Stop (θ_hard) - Red Solid */}
              {thetaPhysicalStop !== undefined && (
                <ReferenceLine 
                    x={thetaPhysicalStop} 
                    stroke="#be123c" 
                    strokeWidth={2}
                    label={{ 
                        value: 'θ hard', 
                        position: 'insideTopRight', 
                        fill: '#be123c', 
                        fontSize: 8, 
                        fontWeight: 'bold',
                        dy: 30
                    }} 
                />
              )}

              {/* 3. Customer Operating Requirement (θ_customer) - Blue Dotted */}
              {operatingTheta !== undefined && operatingTheta > 0 ? (
                <ReferenceLine 
                    x={operatingTheta} 
                    stroke="#3b82f6" 
                    strokeDasharray="2 4" 
                    strokeWidth={1.5}
                    label={{ 
                        value: 'θ_customer', 
                        position: 'insideBottomRight', 
                        fill: '#2563eb', 
                        fontSize: 9, 
                        fontWeight: 'bold',
                        dy: -10
                    }} 
                />
              ) : null}

              {/* Playhead Marker */}
              <ReferenceLine 
                x={playheadTheta} 
                stroke="#64748b" 
                strokeWidth={1}
                label={{ 
                    position: 'insideTopLeft', 
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
                <span className="text-xs font-mono font-bold text-slate-700">{playheadTheta.toFixed(2)}°</span>
             </div>
             <div className="text-[9px] text-slate-400 italic max-w-[200px] text-right">
                * Layered Limits: Life (Safe) vs Physical (Hard) vs Customer (Req)
             </div>
        </div>
      </CardContent>
    </Card>
  );
}
