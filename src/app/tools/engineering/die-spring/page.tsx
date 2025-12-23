import type { Metadata } from "next";
import { Suspense } from "react";
import { DieSpringEngineeringPage } from "@/components/engineering/die-spring/DieSpringEngineeringPage";

export const metadata: Metadata = {
  title: "Die Spring Engineering Analysis",
  description:
    "Selection, stress, life, guiding, temperature, and FEA validation for rectangular-wire die springs.",
};

export default function DieSpringEngineeringRoute() {
  return (
    <Suspense fallback={<div className="container mx-auto py-10">Loading...</div>}>
      <DieSpringEngineeringPage />
    </Suspense>
  );
}
