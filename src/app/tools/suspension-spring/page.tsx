import { SuspensionSpringCalculator } from "@/components/calculators/SuspensionSpringCalculator";

export const metadata = {
  title: "减震器弹簧计算器 | Suspension Spring Calculator",
  description: "Engineering calculator for suspension/shock absorber springs with 3D visualization",
};

export default function SuspensionSpringPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">减震器弹簧计算器</h1>
          <p className="text-muted-foreground">
            Suspension / Shock Absorber Spring Calculator
          </p>
        </div>
        <SuspensionSpringCalculator />
      </div>
    </main>
  );
}
