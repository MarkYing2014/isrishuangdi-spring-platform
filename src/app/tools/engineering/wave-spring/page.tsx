import { Suspense } from "react";
import WaveSpringEngineeringPage from "@/components/engineering/wave-spring/WaveSpringEngineeringPage";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Wave Spring Engineering Analysis | 波形弹簧工程分析",
  description: "Advanced engineering analysis for wave springs, including load-deflection, stress analysis, and packaging verification.",
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <WaveSpringEngineeringPage />
    </Suspense>
  );
}
