import type { Metadata } from "next";
import CadExportPageContent from "@/components/cad/CadExportContent";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Spring CAD Export | Generate Manufacturable Spring Geometry",
  description:
    "Export accurate spring geometry for CAD and manufacturing. Supports compression, extension, wave, and die springs with real-world constraints.",
  keywords: [
    "spring cad export",
    "spring geometry generator",
    "STEP file export",
    "spring 3d model",
    "freecad spring generator",
  ],
};

export default function CadExportPage() {
  return <CadExportPageContent />;
}
