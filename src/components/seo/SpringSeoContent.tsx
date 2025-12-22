"use client";

import { useLanguage } from "@/components/language-context";
import { SpringType } from "@/lib/springTypes";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type SeoData = {
  h1: string;
  h2s: string[];
  faqs: { q: string; a: string }[];
};

const seoContent: Record<string, SeoData> = {
  compression: {
    h1: "Compression Spring Calculator & Design Tool",
    h2s: [
      "What Is a Compression Spring?",
      "Compression Spring Rate Calculation (k)",
      "Shear Stress, Wahl Factor & Safety Factor",
      "Solid Height, Coil Bind & Clearance Check",
      "Buckling Risk & Slenderness Ratio",
      "Closed Ends vs Closed & Ground Ends",
      "3D Compression Spring Visualization",
      "Engineering Design Rules for Compression Springs"
    ],
    faqs: [
      {
        q: "How do you calculate compression spring rate?",
        a: "Compression spring rate is calculated using shear modulus, wire diameter, mean coil diameter, and number of active coils."
      },
      {
        q: "What is coil bind in compression springs?",
        a: "Coil bind occurs when all coils touch under compression, preventing further deflection and causing stress failure."
      },
      {
        q: "What is a safe spring index for compression springs?",
        a: "A spring index between 4 and 20 is generally recommended for manufacturability and fatigue life."
      }
    ]
  },
  extension: {
    h1: "Extension Spring Calculator with Hook Types & Initial Tension",
    h2s: [
      "What Is an Extension Spring?",
      "Extension Spring Rate vs Compression Spring Rate",
      "Initial Tension Explained",
      "Hook Types: Machine, Cross-Over, Full Loop",
      "Stress Concentration at Hooks",
      "Working Deflection & Total Load Calculation",
      "3D Extension Spring with Proportional Hooks",
      "Engineering Design Rules for Extension Springs"
    ],
    faqs: [
      {
        q: "What is initial tension in an extension spring?",
        a: "Initial tension is the preload force that must be overcome before the spring begins to extend."
      },
      {
        q: "Do hooks affect extension spring strength?",
        a: "Yes. Hooks are the highest stress regions and often govern fatigue life and failure."
      },
      {
        q: "How is total load calculated for extension springs?",
        a: "Total load equals initial tension plus spring rate multiplied by working deflection."
      }
    ]
  },
  torsion: {
    h1: "Torsion Spring Calculator & Angular Load Analysis",
    h2s: [
      "What Is a Torsion Spring?",
      "Torque vs Angular Deflection",
      "Leg Length, Orientation & Mounting",
      "Stress Calculation in Torsion Springs",
      "Direction of Winding (CW vs CCW)",
      "3D Torsion Spring Visualization",
      "Engineering Limits & Design Rules"
    ],
    faqs: [
      {
        q: "How is torque calculated in a torsion spring?",
        a: "Torque is calculated from angular deflection, spring rate, and material properties."
      },
      {
        q: "Are torsion springs loaded in bending or torsion?",
        a: "The wire is primarily loaded in bending, not pure torsion."
      }
    ]
  },
  dieSpring: {
    h1: "Die Spring Calculator & 3D Model (Rectangular Wire)",
    h2s: [
      "What Is a Die Spring?",
      "Rectangular Wire vs Round Wire Springs",
      "Load Rate & Color Code (ISO / Industry Standard)",
      "Closed & Ground Ends Explained",
      "Maximum Deflection & Cycle Life",
      "Stress Analysis for Die Springs",
      "Realistic Die Spring 3D Geometry",
      "Manufacturing Constraints for Die Springs"
    ],
    faqs: [
      {
        q: "Why do die springs use rectangular wire?",
        a: "Rectangular wire increases load capacity and fatigue life compared to round wire."
      },
      {
        q: "What do die spring colors mean?",
        a: "Colors indicate duty class (light, medium, heavy, extra heavy) and allowable deflection."
      },
      {
        q: "Can die springs be compressed to solid height?",
        a: "No. Exceeding recommended deflection dramatically reduces cycle life."
      }
    ]
  },
  wave: {
    h1: "Wave Spring Calculator & Compact Spring Design Tool",
    h2s: [
      "What Is a Wave Spring?",
      "Wave Spring vs Compression Spring",
      "Load-Deflection Behavior",
      "Axial Space Savings",
      "Multi-Turn vs Single-Turn Wave Springs",
      "Stress & Fatigue Considerations",
      "3D Wave Spring Visualization"
    ],
    faqs: [
      {
        q: "Why use a wave spring instead of a compression spring?",
        a: "Wave springs provide the same load in less axial space."
      },
      {
        q: "Are wave springs suitable for dynamic loads?",
        a: "Yes, but stress concentration must be carefully evaluated."
      }
    ]
  },
  conical: {
    h1: "Conical Spring Calculator & Progressive Rate Design",
    h2s: [
      "What Is a Conical Spring?",
      "Progressive Spring Rate Explained",
      "Buckling Resistance",
      "Telescoping & Solid Height Reduction",
      "Load Curve Analysis",
      "3D Conical Spring Visualization"
    ],
    faqs: [
      {
        q: "Why do conical springs resist buckling better?",
        a: "Their changing diameter provides inherent lateral stability."
      }
    ]
  },
  spiralTorsion: {
    h1: "Spiral Torsion Spring Calculator & Energy Storage Analysis",
    h2s: [
      "What Is a Spiral Spring?",
      "Torque Storage & Angular Travel",
      "Strip Material & Thickness Effects",
      "Stress Distribution in Spiral Springs",
      "Clock Spring vs Torsion Spring",
      "3D Spiral Spring Visualization"
    ],
    faqs: [
      {
        q: "Where are spiral springs commonly used?",
        a: "Clocks, seatbelt retractors, cable reels, and constant-force systems."
      }
    ]
  },
  // Fallback / Placeholder for others
  suspensionSpring: {
    h1: "Vehicle Suspension Spring Calculator",
    h2s: ["Suspension Geometry", "Ride Height & Stiffness"],
    faqs: []
  }
};

interface SpringSeoContentProps {
  type: SpringType;
  className?: string;
}

export function SpringSeoContent({ type, className }: SpringSeoContentProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  // Currently only English content is fully populated as per request
  // Ideally this would check language and pull appropriate data
  const content = seoContent[type];

  if (!content) return null;

  return (
    <article className={cn("space-y-12 py-10", className)}>
      <div className="border-t border-slate-200 pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          {content.h1}
        </h1>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {content.h2s.map((h2, i) => (
            <section key={i} className="prose prose-sm prose-slate">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">{h2}</h2>
              <p className="text-slate-500">
                {/* Placeholder content for now - to be autogenerated or filled later */}
                Technical analysis and engineering definitions for {h2.toLowerCase()}.
              </p>
            </section>
          ))}
        </div>
      </div>

      {content.faqs.length > 0 && (
        <div className="rounded-2xl bg-slate-50 p-8">
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {content.faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-medium text-slate-900">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </article>
  );
}
