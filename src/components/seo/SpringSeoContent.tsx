"use client";

import { useLanguage } from "@/components/language-context";
import { SpringType } from "@/lib/springTypes";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type SeoContentBlock = {
  h1: string;
  h2s: string[];
  faqs: { q: string; a: string }[];
};

type SeoData = {
  en: SeoContentBlock;
  zh: SeoContentBlock;
};

const seoContent: Record<string, SeoData> = {
  compression: {
    en: {
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
    zh: {
      h1: "压缩弹簧计算器与工程设计工具",
      h2s: [
        "什么是压缩弹簧？",
        "压缩弹簧刚度 (k) 的计算公式",
        "剪切应力、Wahl 修正系数与安全系数",
        "压并高度 (Solid Height) 与间隙检查",
        "稳定性风险：屈曲与细长比",
        "并紧端 vs 并紧磨平端",
        "3D 压缩弹簧可视化",
        "压缩弹簧工程设计准则"
      ],
      faqs: [
        {
          q: "如何计算压缩弹簧的刚度？",
          a: "压缩弹簧刚度由剪切模量、线径、中径和有效圈数决定。G * d^4 / (8 * D^3 * Na)。"
        },
        {
          q: "什么是弹簧压并 (Coil Bind)？",
          a: "压并是指弹簧被压缩至所有线圈接触的状态。此时弹簧失去形变能力，可能导致极高的应力失效，设计时必须避免工作载荷达到压并高度。"
        },
        {
          q: "压缩弹簧的安全旋绕比 (Spring Index) 是多少？",
          a: "通常建议旋绕比 (C = D/d) 在 4 到 20 之间。过小会导致制造困难和应力集中，过大则容易导致弹簧失稳。"
        }
      ]
    }
  },
  extension: {
    en: {
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
    zh: {
      h1: "拉伸弹簧计算器：钩环类型与初张力分析",
      h2s: [
        "什么是拉伸弹簧？",
        "拉伸弹簧与压缩弹簧的刚度对比",
        "初张力 (Initial Tension) 详解",
        "钩环类型：机械钩、侧钩、满环",
        "钩环处的应力集中",
        "工作变形量与总载荷计算",
        "3D 拉伸弹簧与标准钩环",
        "拉伸弹簧工程设计准则"
      ],
      faqs: [
        {
          q: "什么是拉伸弹簧的初张力？",
          a: "初张力是在弹簧开始拉伸之前必须克服的预紧力，由卷绕工艺中线圈紧密接触产生。"
        },
        {
          q: "钩环会影响拉伸弹簧的强度吗？",
          a: "是的。钩环根部通常是应力最集中的区域，也是疲劳断裂最常见的位置。设计时需特别关注弯曲应力和扭转应力的叠加。"
        },
        {
          q: "如何计算拉伸弹簧的总载荷？",
          a: "总载荷 P = 初张力 (Pi) + (刚度 k × 变形量 F)。"
        }
      ]
    }
  },
  torsion: {
    en: {
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
    zh: {
      h1: "扭转弹簧计算器与力矩分析",
      h2s: [
        "什么是扭转弹簧？",
        "扭矩 (Torque) 与角度变形",
        "力臂长度、角度定位与安装",
        "扭转弹簧的弯曲应力计算",
        "旋向：左旋 (CCW) vs 右旋 (CW)",
        "3D 扭转弹簧可视化",
        "工程极限与设计准则"
      ],
      faqs: [
        {
          q: "如何计算扭转弹簧的扭矩？",
          a: "扭矩 T = 刚度 k × 扭转角度 θ。刚度计算依赖于弹性模量 E（而非剪切模量 G）。"
        },
        {
          q: "扭转弹簧的受力模式是弯曲还是扭转？",
          a: "尽管名为“扭转弹簧”，但其线材截面实际上主要承受弯曲应力 (Bending Stress)。"
        }
      ]
    }
  },
  dieSpring: {
    en: {
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
    zh: {
      h1: "模具弹簧计算器与 3D 建模（矩形截面）",
      h2s: [
        "什么是模具弹簧？",
        "矩形丝 vs 圆丝弹簧",
        "载荷等级与色标标准 (ISO/JIS)",
        "并紧磨平端结构",
        "最大压缩量与疲劳寿命关系",
        "模具弹簧应力分析",
        "真实的 3D 模具弹簧几何",
        "模具弹簧的制造约束"
      ],
      faqs: [
        {
          q: "为什么模具弹簧使用矩形截面线材？",
          a: "矩形线材在相同空间内提供更大的截面积，从而获得更高的载荷能力和刚度，同时减小压并高度。"
        },
        {
          q: "模具弹簧的颜色代表什么？",
          a: "颜色代表载荷等级（如轻载、中载、重载、超重载）。不同品牌标准（如 ISO 10243、JIS B 5012）的颜色定义可能不同，通常包括绿、蓝、红、黄等。"
        },
        {
          q: "模具弹簧可以压缩到压并高度吗？",
          a: "严禁。模具弹簧一旦超过推荐的最大压缩量（通常为自由长的 30%-50%），寿命会急剧下降，甚至立即断裂。"
        }
      ]
    }
  },
  wave: {
    en: {
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
    zh: {
      h1: "波形弹簧计算器及紧凑型设计工具",
      h2s: [
        "什么是波形弹簧？",
        "波形弹簧 vs 螺旋压缩弹簧",
        "载荷-变形特性",
        "轴向空间的节省优势",
        "多层对顶 (Multi-Turn) vs 单层 (Single-Turn)",
        "应力与疲劳寿命考量",
        "3D 波形弹簧可视化"
      ],
      faqs: [
        {
          q: "为什么要用波簧替代普通压簧？",
          a: "波形弹簧可以在提供相同载荷的情况下，节省高达 50% 的轴向安装空间，非常适合空间受限的场合。"
        },
        {
          q: "波形弹簧适合动态载荷吗？",
          a: "适合，但需仔细评估波峰波谷处的应力集中。对于高频疲劳应用，材料和热处理的选择至关重要。"
        }
      ]
    }
  },
  conical: {
    en: {
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
    zh: {
      h1: "锥形弹簧计算器与变刚度设计",
      h2s: [
        "什么是锥形弹簧？",
        "非线性（渐进式）刚度详解",
        "抗屈曲 (Buckling Resistance) 特性",
        "嵌套效应与压并高度降低",
        "载荷-位移曲线分析",
        "3D 锥形弹簧可视化"
      ],
      faqs: [
        {
          q: "为什么锥形弹簧不易侧弯（屈曲）？",
          a: "由于直径沿轴向变化，其自身结构具有更好的侧向稳定性，通常不需要导杆即可在较大压缩量下保持稳定。"
        }
      ]
    }
  },
  spiralTorsion: {
    en: {
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
    zh: {
      h1: "螺旋扭转弹簧计算器（平面涡卷弹簧）",
      h2s: [
        "什么是螺旋扭转弹簧？",
        "储能与角位移分析",
        "带材厚度与宽度的影响",
        "应力分布特征",
        "发条弹簧 vs 扭转弹簧",
        "3D 螺旋弹簧可视化"
      ],
      faqs: [
        {
          q: "螺旋弹簧常用于哪些领域？",
          a: "常见于机械钟表（发条）、汽车安全带卷收器、电缆卷筒以及恒力调节机构中。"
        }
      ]
    }
  },
  // Fallback / Placeholder for others
  suspensionSpring: {
    en: {
      h1: "Vehicle Suspension Spring Calculator",
      h2s: ["Suspension Geometry", "Ride Height & Stiffness"],
      faqs: []
    },
    zh: {
      h1: "汽车悬挂弹簧计算器",
      h2s: ["悬挂几何", "行驶高度与刚度"],
      faqs: []
    }
  }
};

interface SpringSeoContentProps {
  type: SpringType;
  className?: string;
}

export function SpringSeoContent({ type, className }: SpringSeoContentProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  const contentMap = seoContent[type];
  if (!contentMap) return null;

  const content = isZh ? contentMap.zh : contentMap.en;

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
                {/* Fallback description based on language */}
                {isZh
                  ? `关于${h2.replace("什么是", "").replace("？", "")}的工程定义与技术分析。`
                  : `Technical analysis and engineering definitions for ${h2.toLowerCase()}.`
                }
              </p>
            </section>
          ))}
        </div>
      </div>

      {content.faqs.length > 0 && (
        <div className="rounded-2xl bg-slate-50 p-8">
          <h2 className="text-2xl font-semibold mb-6">
            {isZh ? "常见工程问题 (FAQ)" : "Frequently Asked Questions"}
          </h2>
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
