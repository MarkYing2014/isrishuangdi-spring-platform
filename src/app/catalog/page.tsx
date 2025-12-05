import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const families = [
  { key: "compression", title: "Compression Springs", description: "Cold-coiled cylinders for suspension, seating, brake and valve applications." },
  { key: "extension", title: "Extension Springs", description: "Hooked ends and controlled preload for latching, closures, and balance systems." },
  { key: "torsion", title: "Torsion Springs", description: "Clockwise/counterclockwise designs with configurable leg geometries." },
  { key: "hot-rolled", title: "Hot-rolled Springs", description: "High-diameter hot-rolled coils for heavy industrial and rail suspensions." },
  { key: "systems", title: "Spring Systems", description: "Assemblies that combine multiple springs, seats, seats, dampers, or isolators." },
];

export default function CatalogPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">Module • Spring Catalog & Finder</p>
        <h1 className="text-3xl font-semibold tracking-tight">Spring Catalog</h1>
        <p className="text-muted-foreground">
          Browse standard spring families or start directly from engineering tools. 后续将提供搜索、过滤、BOM 导出等 Industry 4.0 功能。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {families.map((family) => (
          <Card key={family.key}>
            <CardHeader>
              <CardTitle>{family.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{family.description}</p>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/catalog/${family.key}`}>View Family</Link>
              </Button>
              <Button asChild>
                <Link href={`/tools/calculator?type=${family.key}`}>Start from Calculator</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <div>
          <p className="text-lg font-semibold">Spring Finder (Coming Soon)</p>
          <p className="text-sm text-muted-foreground">
            Parametric search with tolerance bands, finishing, and load windows. Will integrate with CAD + RFQ flows.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/finder">Open Spring Finder (coming soon)</Link>
        </Button>
      </div>
    </section>
  );
}
