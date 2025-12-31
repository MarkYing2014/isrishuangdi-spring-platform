import { ShockSpringCalculator } from "@/components/calculators/ShockSpringCalculator";

export const metadata = {
  title: "减震器弹簧 (高级) | Shock Absorber Spring",
  description: "Advanced parametric shock absorber spring with variable wire diameter, mean diameter, and pitch",
};

export default function ShockSpringPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">减震器弹簧 (高级参数化)</h1>
          <p className="text-muted-foreground">
            Shock Absorber Spring – Variable Wire/Diameter/Pitch
          </p>
        </div>
        <ShockSpringCalculator />
      </div>
    </main>
  );
}
