import type { Metadata } from "next";
import { ProductionDashboard } from "@/components/production/ProductionDashboard";
import { LanguageText } from "@/components/language-context";

export const metadata: Metadata = {
  title: "Spring Manufacturing Dashboard | Production Monitoring & Quality Insights",
  description:
    "Visualize spring production with real-time dashboards, work orders linked to design data, and manufacturing status monitoring. Built for engineering-driven factories.",
  keywords: [
    "spring manufacturing dashboard",
    "production monitoring",
    "OEE dashboard",
    "spring coil production",
    "quality control software",
    "manufacturing execution system",
  ],
};

export default function ProductionPage() {
  return <ProductionDashboard />;
}
