import type { Metadata } from "next";
import AnalysisPageContent from "@/components/analysis/AnalysisPageContent";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Spring Engineering Analysis | Stress, Fatigue & FEA Simulation",
  description:
    "Advanced engineering analysis for springs. Calculate stress, fatigue life, Goodman diagrams, and run FEA simulations for compression, extension, and torsion springs.",
  keywords: [
    "spring stress analysis",
    "spring fatigue calculation",
    "spring FEA simulation",
    "Goodman diagram spring",
    "spring design validation",
    "engineering spring analysis",
  ],
};

export default function EngineeringAnalysisPage() {
  return <AnalysisPageContent />;
}
