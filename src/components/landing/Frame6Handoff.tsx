"use client";

import { ClipboardCheck } from "lucide-react";

export function Frame6Handoff() {
  return (
    <section className="w-full bg-slate-900 text-white py-24">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            
            <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                    RFQ as an engineering responsibility handoff
                </h2>
                <ul className="space-y-4 text-slate-300">
                    <li className="flex items-center gap-3">
                        <ClipboardCheck className="text-emerald-400" />
                        Engineering summary auto-generated
                    </li>
                    <li className="flex items-center gap-3">
                        <ClipboardCheck className="text-emerald-400" />
                        Assumptions explicitly listed
                    </li>
                    <li className="flex items-center gap-3">
                        <ClipboardCheck className="text-emerald-400" />
                        Version hash & confirmation
                    </li>
                </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-10 rounded-2xl backdrop-blur-sm relative">
                <div className="absolute -top-4 -left-4 text-6xl opacity-20">"</div>
                <p className="text-xl md:text-2xl font-light leading-relaxed italic text-center">
                    This RFQ represents an engineering-reviewed configuration, 
                    not a preliminary estimate.
                </p>
                <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 rotate-180">"</div>
            </div>

        </div>
    </section>
  );
}
