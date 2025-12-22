"use client";

import { useLanguage } from "@/components/language-context";
import { SpringType } from "@/lib/springTypes";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type SeoContentBlock = {
  h1: string;
  sections: { title: string; content: string }[];
  faqs: { q: string; a: string }[];
};

type SeoData = {
  en: SeoContentBlock;
  zh: SeoContentBlock;
};

// Helper: fallback sections for unpopulated types
const createFallback = (h2s: string[]): { title: string; content: string }[] => {
  return h2s.map(h2 => ({
    title: h2,
    content: `Technical analysis and engineering definitions for ${h2.toLowerCase()}.`
  }));
};

const seoContent: Record<string, SeoData> = {
  compression: {
    en: {
      h1: "Compression Spring Calculator & Design Tool",
      sections: createFallback([
        "What Is a Compression Spring?",
        "Compression Spring Rate Calculation (k)",
        "Shear Stress, Wahl Factor & Safety Factor",
        "Solid Height, Coil Bind & Clearance Check",
        "Buckling Risk & Slenderness Ratio",
        "Closed Ends vs Closed & Ground Ends",
        "3D Compression Spring Visualization",
        "Engineering Design Rules for Compression Springs"
      ]),
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
      sections: createFallback([
        "什么是压缩弹簧？",
        "压缩弹簧刚度 (k) 的计算公式",
        "剪切应力、Wahl 修正系数与安全系数",
        "压并高度 (Solid Height) 与间隙检查",
        "稳定性风险：屈曲与细长比",
        "并紧端 vs 并紧磨平端",
        "3D 压缩弹簧可视化",
        "压缩弹簧工程设计准则"
      ]),
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
      sections: [
        {
          title: "What Is an Extension Spring?",
          content: "An extension spring is a helical spring designed to store energy and resist a pulling force. Unlike compression springs, which have zero load at zero deflection, extension springs are wound with 'Initial Tension'—an internal force that keeps the coils tightly closed together. This initial tension must be overcome before the spring begins to extend."
        },
        {
          title: "Extension Spring Rate vs Compression Spring Rate",
          content: "Physically, the spring rate factor (k) formula is identical: k = Gd⁴ / 8D³Nₐ. However, the Force behavior differs significantly. For a compression spring, Force F = kx. For an extension spring, Total Force = Initial Tension (Pᵢ) + kx. This means an extension spring requires a specific threshold force just to start opening."
        },
        {
          title: "Initial Tension Explained",
          content: "Initial Tension (Pᵢ) is the preload force resulting from the coiling process (twisting the wire against the bending direction). It is strictly limited by the Spring Index (C). Higher indices (C > 12) enable less initial tension. Engineering formula: Pᵢ ≈ (π d³ / 8 D) * Initial Stress. Verification: Measure loads at two lengths (L₁ and L₂) where coils are open, then extrapolate back to zero deflection: Pᵢ = 2L₁ - L₂."
        },
        {
          title: "Hook Types: Machine, Cross-Over, Full Loop",
          content: "• Machine Hook: Formed by bending ~75% of a coil directly outwards. Strongest standard hook due to larger bend radii.\n• Cross-Over Center (Side Loop): Last coil twisted to the center. Most common, cheap, but higher stress concentration.\n• Full Loop: A complete 360° closed circle. Prevents slip-off, widely used in safety-critical assemblies."
        },
        {
          title: "Stress Concentration at Hooks",
          content: "Hooks are the Achilles' heel of extension springs. While the body only sees torsional stress, the hook bend sees both Bending Stress and Torsional Stress. Local stress at the hook transition can be 2-3x higher than body stress. We apply separate stress correction factors (K₁ for bending, K₂ for torsion) based on the bend radius ratio (r/d)."
        },
        {
          title: "Working Deflection & Total Load Calculation",
          content: "Total Load P = Pᵢ + k(L - L₀), where Pᵢ is Initial Tension, k is Rate, L is extended length, L₀ is free length inside hooks. Do not simply use k * deflection. Ensure the max working load stays below the 'Proportional Limit' of the hook bending stress, not just the body torsional stress."
        },
        {
          title: "3D Extension Spring with Proportional Hooks",
          content: "Our 3D visualizer generates physically accurate hooks relative to the body diameter. It checks for 'Body Length' vs 'Free Length' constraints to ensure hooks fit within the specified L₀ envelope."
        },
        {
          title: "Engineering Design Rules for Extension Springs",
          content: "1. Always account for Initial Tension (±15% variance manufacturing tolerance).\n2. Hooks often fail before the body; reduce hook stress by increasing bend radius.\n3. Avoid 'Hard Drawing' plated wire if possible; plating inside coils is difficult.\n4. Design for a Spring Index (C) between 5 and 15 for optimal specific tension control."
        }
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
      sections: [
        {
          title: "什么是拉伸弹簧？",
          content: "拉伸弹簧（Extension Spring）是一种旨在承受轴向拉力的螺旋弹簧。与压缩弹簧不同，拉伸弹簧在卷绕时具有“初张力”（Initial Tension），这是一种使线圈在无外力状态下紧密闭合的内部预紧力。施加的拉力必须先克服这一初张力，弹簧才会开始发生弹性变形。"
        },
        {
          title: "拉伸弹簧与压缩弹簧的刚度对比",
          content: "虽然刚度系数 (k) 的理论公式是相同的：k = Gd⁴ / 8D³Nₐ，但力学行为截然不同。压缩弹簧的力与位移关系为 F = kx；而拉伸弹簧的总拉力公式为 F_total = 初张力 (Pᵢ) + kx。这意味着拉伸弹簧并不是从零力开始变形的，它有一个“启动门槛”。"
        },
        {
          title: "初张力 (Initial Tension) 详解",
          content: "初张力 (Pᵢ) 是在冷卷过程中，通过反向扭转线材产生的内应力。其大小受限于旋绕比 (Index C)。旋绕比越大 (C > 12)，难以产生较大的初张力。工程验证方法：测量弹簧拉开后的两个不同长度 L₁ 和 L₂ 对应的载荷，利用线性回归外推至零位移点计算 Pᵢ。标准公差通常为 ±10%~15%。"
        },
        {
          title: "钩环类型：机械钩、侧钩、满环",
          content: "• 机械钩 (Machine Hook)：直接将约 3/4 圈线圈向外折弯而成，过渡半径大，强度最高。\n• 侧钩/过中钩 (Cross-Over Center)：末圈扭转至中心。最常见且成本低，但根部应力集中最严重。\n• 满环 (Full Loop)：完全闭合的 360° 圆环，安全性高，防止挂钩脱落。"
        },
        {
          title: "钩环处的应力集中",
          content: "钩环是拉伸弹簧的“阿喀琉斯之踵”。弹簧体主要承受剪切应力 (Torsional Stress)，而钩环根部同时承受极高的弯曲应力 (Bending Stress)。局部的应力集中系数可能是簧身的 2-3 倍。工程计算必须对钩环进行单独的应力校核（基于弯曲半径比 r/d 的 K₁ 修正系数）。"
        },
        {
          title: "工作变形量与总载荷计算",
          content: "计算总载荷 P = Pᵢ + k(L - L₀)。其中 Pᵢ 为初张力，k 为刚度，L 为拉伸后长度，L₀ 为含钩自由长。切勿简单地用 刚度 × 变形量。安全系数校核应基于钩环的断裂强度，而非仅仅是弹簧身的屈服极限。"
        },
        {
          title: "3D 拉伸弹簧与标准钩环",
          content: "此工具生成的 3D 模型具备精确的工程比例。它会根据线径和中径自动生成符合制造标准的钩环几何（如过中钩的扭转半径），并校验“体长” (Body Length) 是否在自由长范围内。"
        },
        {
          title: "拉伸弹簧工程设计准则",
          content: "1. 务必在设计中预留初张力的制造公差。\n2. 优先通过增大钩环根部过渡半径 (Bend Radius) 来降低应力，而非仅仅增加线径。\n3. 高频疲劳应用应慎用拉伸弹簧，或采用“活塞式压簧”替代方案，因为钩环几乎总是疲劳失效点。\n4. 推荐旋绕比 (Index) 控制在 5-15 之间以获得最佳的初张力控制能力。"
        }
      ],
      faqs: [
        {
          q: "什么是拉伸弹簧的初张力？",
          a: "初张力是在弹簧开始拉伸之前必须克服的预紧力，由卷绕工艺中线圈紧密接触产生。"
        },
        {
          q: "钩环会影响拉伸弹簧的强度吗？（重点）",
          a: "是影响最大的因素。钩环根部的弯曲应力远高于簧身的剪切应力，90% 的拉伸弹簧失效都发生在钩环根部。必须进行独立的应力验算。"
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
      sections: createFallback([
        "What Is a Torsion Spring?",
        "Torque vs Angular Deflection",
        "Leg Length, Orientation & Mounting",
        "Stress Calculation in Torsion Springs",
        "Direction of Winding (CW vs CCW)",
        "3D Torsion Spring Visualization",
        "Engineering Limits & Design Rules"
      ]),
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
      sections: createFallback([
        "什么是扭转弹簧？",
        "扭矩 (Torque) 与角度变形",
        "力臂长度、角度定位与安装",
        "扭转弹簧的弯曲应力计算",
        "旋向：左旋 (CCW) vs 右旋 (CW)",
        "3D 扭转弹簧可视化",
        "工程极限与设计准则"
      ]),
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
      sections: createFallback([
        "What Is a Die Spring?",
        "Rectangular Wire vs Round Wire Springs",
        "Load Rate & Color Code (ISO / Industry Standard)",
        "Closed & Ground Ends Explained",
        "Maximum Deflection & Cycle Life",
        "Stress Analysis for Die Springs",
        "Realistic Die Spring 3D Geometry",
        "Manufacturing Constraints for Die Springs"
      ]),
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
      sections: createFallback([
        "什么是模具弹簧？",
        "矩形丝 vs 圆丝弹簧",
        "载荷等级与色标标准 (ISO/JIS)",
        "并紧磨平端结构",
        "最大压缩量与疲劳寿命关系",
        "模具弹簧应力分析",
        "真实的 3D 模具弹簧几何",
        "模具弹簧的制造约束"
      ]),
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
      sections: createFallback([
        "What Is a Wave Spring?",
        "Wave Spring vs Compression Spring",
        "Load-Deflection Behavior",
        "Axial Space Savings",
        "Multi-Turn vs Single-Turn Wave Springs",
        "Stress & Fatigue Considerations",
        "3D Wave Spring Visualization"
      ]),
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
      sections: createFallback([
        "什么是波形弹簧？",
        "波形弹簧 vs 螺旋压缩弹簧",
        "载荷-变形特性",
        "轴向空间的节省优势",
        "多层对顶 (Multi-Turn) vs 单层 (Single-Turn)",
        "应力与疲劳寿命考量",
        "3D 波形弹簧可视化"
      ]),
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
      sections: createFallback([
        "What Is a Conical Spring?",
        "Progressive Spring Rate Explained",
        "Buckling Resistance",
        "Telescoping & Solid Height Reduction",
        "Load Curve Analysis",
        "3D Conical Spring Visualization"
      ]),
      faqs: [
        {
          q: "Why do conical springs resist buckling better?",
          a: "Their changing diameter provides inherent lateral stability."
        }
      ]
    },
    zh: {
      h1: "锥形弹簧计算器与变刚度设计",
      sections: createFallback([
        "什么是锥形弹簧？",
        "非线性（渐进式）刚度详解",
        "抗屈曲 (Buckling Resistance) 特性",
        "嵌套效应与压并高度降低",
        "载荷-位移曲线分析",
        "3D 锥形弹簧可视化"
      ]),
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
      sections: createFallback([
        "What Is a Spiral Spring?",
        "Torque Storage & Angular Travel",
        "Strip Material & Thickness Effects",
        "Stress Distribution in Spiral Springs",
        "Clock Spring vs Torsion Spring",
        "3D Spiral Spring Visualization"
      ]),
      faqs: [
        {
          q: "Where are spiral springs commonly used?",
          a: "Clocks, seatbelt retractors, cable reels, and constant-force systems."
        }
      ]
    },
    zh: {
      h1: "螺旋扭转弹簧计算器（平面涡卷弹簧）",
      sections: createFallback([
        "什么是螺旋扭转弹簧？",
        "储能与角位移分析",
        "带材厚度与宽度的影响",
        "应力分布特征",
        "发条弹簧 vs 扭转弹簧",
        "3D 螺旋弹簧可视化"
      ]),
      faqs: [
        {
          q: "螺旋弹簧常用于哪些领域？",
          a: "常见于机械钟表（发条）、汽车安全带卷收器、电缆卷筒以及恒力调节机构中。"
        }
      ]
    }
  },
  suspensionSpring: {
    en: {
      h1: "Vehicle Suspension Spring Calculator",
      sections: createFallback(["Suspension Geometry", "Ride Height & Stiffness"]),
      faqs: []
    },
    zh: {
      h1: "汽车悬挂弹簧计算器",
      sections: createFallback(["悬挂几何", "行驶高度与刚度"]),
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
          {content.sections.map((section, i) => (
            <section key={i} className="prose prose-sm prose-slate">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">{section.title}</h2>
              <p className="text-slate-500 whitespace-pre-line leading-relaxed">
                {section.content}
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
