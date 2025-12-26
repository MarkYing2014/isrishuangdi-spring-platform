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
      h1: "Compression Spring Calculator & Engineering Design",
      sections: [
        {
          title: "What Is a Compression Spring?",
          content: "A compression spring is an open-coil helical spring that offers resistance to a compressive force applied axially. They are the most common metal spring configuration. As the spring is compressed, the wire itself is subjected to torsional stress (shear) despite the linear motion of the spring."
        },
        {
          title: "Spring Rate & Stiffness Formula",
          content: "The spring rate (k) represents the force required to compress the spring by one unit of distance. The physics formula is: k = Gd⁴ / 8D³Nₐ. \n• G: Shear Modulus (Material Prop)\n• d: Wire Diameter\n• D: Mean Diameter\n• Nₐ: Active Coils. \nNote strictly: Stiffness increases with the 4th power of wire diameter, making small wire changes effectively double or triple the force."
        },
        {
          title: "Buckling & Slenderness Ratio",
          content: "Long, slender springs are unstable. The 'Slenderness Ratio' is defined as Free Length (L₀) divided by Mean Diameter (D). If L₀/D > 4, the spring will buckle (bow sideways) under load unless supported by a rod or a tube. Engineering best practice is to keep L₀/D < 3.5 for self-stability, or use guide mandates."
        },
        {
          title: "Solid Height & Coil Bind",
          content: "Solid height (L_solid) is the length of the spring when all coils are effectively touching. It acts as a mechanical stop. Compressing a spring to solid height causes 'Coil Bind', leading to infinite stress spikes and immediate failure. Safe design limits max working deflection to roughly 85-90% of the travel to solid."
        },
        {
          title: "End Types: Stability & Cost",
          content: "• Open Ends: Cheapest, but unstable; spring will tip over.\n• Closed Ends: Last coils touch; better stability.\n• Closed & Ground Ends: Last coils are ground flat 270-330°. Provides the most vertical squareness and seating stability, preventing eccentric loading (side loads) on the mechanism."
        },
        {
          title: "Stress Analysis: Wahl Factor",
          content: "Simple stress calculations underestimate the shear stress on the inner coil surface. We apply the Wahl Curvature Correction Factor (K_w) to account for this. K_w depends on the Spring Index (C = D/d). Lower indices (tight coils) result in drastically higher local stress peaks."
        }
      ],
      faqs: [
        {
          q: "How do you calculate compression spring rate?",
          a: "Rate k = G*d^4 / (8*D^3*Na). Stiffness is driven heavily by wire diameter."
        },
        {
          q: "What causes a compression spring to buckle?",
          a: "A slenderness ratio (Length/Diameter) greater than 4 usually causes buckling unless the spring is supported by a rod or bore."
        },
        {
          q: "What is the difference between closed and ground ends?",
          a: "Ground ends (square ends) stand vertically straight (90°) on a flat surface, ensuring the load is applied axially without tilting forces."
        }
      ]
    },
    zh: {
      h1: "压缩弹簧计算器与工程设计工具",
      sections: [
        {
          title: "什么是压缩弹簧？",
          content: "压缩弹簧（Compression Spring）是一种承受轴向压力的开放式螺旋弹簧。它是最常见的弹簧形式。虽然弹簧产生直线运动，但从微观力学角度来看，线材截面实际上承受的是“扭转剪切应力” (Torsional Stress)，而非压缩应力。"
        },
        {
          title: "刚度计算公式 (Spring Rate)",
          content: "刚度 (k) 定义为每压缩单位距离所需的力。物理公式为：k = Gd⁴ / 8D³Nₐ。\n• G: 剪切模量 (材料属性)\n• d: 线径\n• D: 中径\n• Nₐ: 有效圈数\n请注意：刚度与线径的 **4次方** 成正比。这意味着线径微小的增加（如 10%）会导致力度大幅提升（约 46%）。"
        },
        {
          title: "屈曲风险与细长比 (Buckling & Slenderness)",
          content: "细长的弹簧在受压时容易发生侧弯（Buckling）。工程上定义“细长比”为自由长 (L₀) 除以中径 (D)。当 L₀/D > 4 时，除非有导杆或导孔支撑，否则弹簧极易失稳侧弯。设计建议保持细长比 < 3.5 以确保自稳性。"
        },
        {
          title: "压并高度 (Solid Height) 与安全行程",
          content: "压并高度是指弹簧所有线圈紧密接触时的长度。此时弹簧失去弹性，刚度趋于无穷大。严禁在设计中将工作载荷设定在压并高度！这会导致灾难性的应力峰值和断裂。通常建议最大工作行程不超过总间隙的 85%。"
        },
        {
          title: "端部结构：磨平 vs 不磨平",
          content: "• 开口端 (Open Ends)：成本最低，但无法直立，受力不均。\n• 并紧端 (Closed Ends)：由于螺旋角存在，端面并非绝对平面。\n• 并紧磨平 (Closed & Ground)：将两端磨平 270°~330°，提供最佳的垂直度，防止弹簧在工作时产生侧向分力 (Side Loading)，是精密机械的首选。"
        },
        {
          title: "应力修正：Wahl 修正系数",
          content: "基础公式会低估线圈内侧的剪切应力。工程计算必须引入 Wahl 修正系数 (K_w)。该系数由旋绕比 (Index C) 决定。C 值越小（线圈越紧凑），内侧应力集中越严重，疲劳寿命越短。"
        }
      ],
      faqs: [
        {
          q: "如何计算压缩弹簧的刚度？",
          a: "刚度 k = Gd^4 / (8D^3*Na)。其中线径 d 的影响最大（四次方关系）。"
        },
        {
          q: "压缩弹簧为什么会侧弯（屈曲）？",
          a: "当自由长与直径的比值（细长比）大于 4 时，弹簧就像细长的柱子一样不稳定。此时必须使用导杆或孔来约束。"
        },
        {
          q: "磨平端（Ground Ends）有什么好处？",
          a: "磨平端能确保弹簧垂直站立，使接触面受力均匀，避免偏心载荷损坏机械结构。"
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
      h1: "Torsion Spring Calculator & Bending Stress Analysis",
      sections: [
        {
          title: "It's Actually 'Bending', Not Torsion",
          content: "Despite the name, a helical 'Torsion Spring' subjects its wire to Bending Stress, not Torsional Stress. When you twist the legs, the wire is effectively being 'coiled tighter' (or looser), causing the wire material to flex in bending. This means we use Young's Modulus (E) for calculation, NOT Shear Modulus (G)."
        },
        {
          title: "Torque Formula & Spring Constant",
          content: "Torque M = E * d⁴ * θ / (10.8 * D * Nₐ). \nNote the use of E (Elastic Modulus). The 10.8 constant is empirical for round wire. The torque is linear with angle θ up to the elastic limit."
        },
        {
          title: "Diameter Shrinkage (Crucial!)",
          content: "As a torsion spring is wound up (tightened), its coil diameter decreases and its body length increases. \nFormula: D_new = (N * D) / (N + θ_revolutions). \nDesign Rule: You MUST leave sufficient clearance between the mandrel (shaft) and the spring's ID. If the spring bites onto the mandrel, it will lock up and fail instantly."
        },
        {
          title: "Direction of Winding",
          content: "Torsion springs must always be loaded in the direction that 'winds them up' (decreases diameter). Loading them to 'open' leads to erratic residual stress behavior and premature failure. Always specify Left Hand (LH) or Right Hand (RH) wound to match the force direction."
        },
        {
          title: "Leg Configurations",
          content: "Legs transmit the torque. Common types: Tangential Legs (straight off the coil), Axial Legs (bent parallel to axis), or Radial Legs (bent towards center). The bending radius where the leg leaves the body is a high-stress point."
        }
      ],
      faqs: [
        {
          q: "Why do torsion springs use Young's Modulus (E) instead of G?",
          a: "Because the wire is physically bending as the coil tightens, even though the spring assembly provides torque."
        },
        {
          q: "What happens if the mandrel is too big?",
          a: "The spring ID will shrink during operation, grip the mandrel, and cause the spring to lock or break (bind)."
        },
        {
          q: "Can I load a torsion spring backwards (unwinding it)?",
          a: "Not recommended. It fights against the residual stresses from manufacturing, significantly lowering the maximum load capacity."
        }
      ]
    },
    zh: {
      h1: "扭转弹簧计算器与弯曲应力分析",
      sections: [
        {
          title: "名不副实：其实是“弯曲应力”",
          content: "尽管名字叫“扭转弹簧”（Torsion Spring），但其线材实际承受的是 **弯曲应力 (Bending Stress)**，而非扭转剪切应力。当力臂旋转时，线圈被“卷得更紧”，线材发生弯曲变形。因此，计算时必须使用 **弹性模量 (E)**，而不是剪切模量 (G)。这是一个常见的工程误区。"
        },
        {
          title: "扭矩 (Torque) 计算公式",
          content: "扭矩 T = E * d⁴ * θ / (10.8 * D * Nₐ)。\n注意公式中使用的是 E。常数 10.8 是针对圆丝的经验修正值。在弹性限度内，扭矩与转角 θ 成正比。"
        },
        {
          title: "内径收缩效应 (极重要！)",
          content: "扭转弹簧在工作（旋紧）时，其圈数增加，导致 **内径 (ID) 缩小**，体长 (Body Length) 增加。\n收缩公式：D_new = (N * D) / (N + 圈数增加量)。\n设计天条：必须在芯轴 (Mandrel) 和弹簧内径之间预留足够的“抱紧间隙”。如果弹簧抱死芯轴，会导致瞬间失效或磨损。"
        },
        {
          title: "旋向选择：左旋 vs 右旋",
          content: "扭转弹簧的设计必须使其在工作时处于“旋紧”方向。反向加载（旋松方向）会对抗制造时的残余应力，导致承载能力大幅下降。必须根据安装力矩方向明确指定 左旋 (Left Hand) 或 右旋 (Right Hand)。"
        },
        {
          title: "力臂配置 (Leg Configurations)",
          content: "常见的力臂形式包括：切向直臂 (Tangential)、轴向折弯臂 (Axial)、径向内折 (Radial)。力臂根部的折弯处是应力最集中的地方，应尽量保持较大的折弯半径。"
        }
      ],
      faqs: [
        {
          q: "计算扭转弹簧为什么要用弹性模量 E？",
          a: "因为线材在微观上发生的是弯曲变形，只有宏观上表现为扭转力矩。"
        },
        {
          q: "芯轴 (Mandrel) 尺寸怎么选？",
          a: "芯轴直径通常建议为弹簧最大变形时内径的 90%，务必计算“缩径”后的尺寸。"
        },
        {
          q: "扭转弹簧可以反向使用（旋松）吗？",
          a: "不建议。反向使用会抵消冷卷工艺带来的有益残余应力，导致弹簧过早屈服。"
        }
      ]
    }
  },
  dieSpring: {
    en: {
      h1: "Die Spring Calculator & ISO 10243 Standards",
      sections: [
        {
          title: "Rectangular Wire Advantage",
          content: "Die springs utilize a flattened, rectangular wire cross-section (unlike the round wire of standard springs). This geometry puts more metal into the same volume (higher packing density), allowing die springs to carry 30-50% more load than equivalent round-wire springs in the same space."
        },
        {
          title: "ISO 10243 Color Codes (Standard)",
          content: "Globally recognized color coding for load classes:\n• Green: Light Load\n• Blue: Medium Load\n• Red: Heavy Load\n• Yellow: Extra Heavy Load\nNote: Always verify the standard. ISO 10243 is the most common in Europe/Global, but Japanese JIS B 5012 uses different colors for similar loads (e.g., JIS Red is not ISO Red). Mixing these is dangerous."
        },
        {
          title: "Material Selection & Temperature Limits",
          content: "• Chrome Vanadium (50CrV4): Good for general use, max operating temp approx 200°C (390°F).\n• Chrome Silicon (55CrSi): Superior heat resistance and fatigue life, capable of operating up to 246°C (475°F). Most premium ISO die springs are now made of Chrome Silicon to prevent 'setting' (loss of height) under heat."
        },
        {
          title: "Life Expectancy vs Deflection",
          content: "Die springs are rated for millions of cycles ONLY if operated within strict deflection limits.\n• Long Life (1,000,000+ cycles): Use < 25% deflection.\n• Average Life: Use ~30% deflection.\n• Max Deflection: Pushing near 40% deflection drops life drastically to < 100,000 cycles. Never compress to solid height!"
        },
        {
          title: "High-Speed Stamping Considerations",
          content: "In high-speed presses (>500 SPM), 'Spring Surge' (resonance) becomes a killer. Friction generates massive heat. High-end die springs use a 'Trapezoidal' cross-section wire that deforms into a perfect rectangle only when coiled, ensuring optimal contact and heat dissipation."
        }
      ],
      faqs: [
        {
          q: "Are ISO and JIS die springs interchangeable?",
          a: "NO. While dimensions may look similar, the color codes mean completely different load ratings. Always check the catalog standard (ISO 10243 vs JIS B 5012)."
        },
        {
          q: "Why use rectangular wire?",
          a: "It maximizes the cross-sectional area in the available space, providing maximum energy storage density."
        },
        {
          q: "What is the max operating temperature for die springs?",
          a: "Typically 200°C for Chrome Vanadium and up to 246°C for Chrome Silicon. Above this, the spring will permanently shorten (relax)."
        }
      ]
    },
    zh: {
      h1: "模具弹簧计算器与 ISO 10243 标准分析",
      sections: [
        {
          title: "矩形截面的优势",
          content: "模具弹簧（Die Spring）采用扁平的矩形截面线材。这种几何结构使得在相同空间内可以容纳更多的金属材料（高填充密度）。因此，模具弹簧的承载能力比同体积圆丝弹簧高出 30% 到 50%，非常适合模具等空间受限的大力载场合。"
        },
        {
          title: "ISO 10243 颜色代码标准",
          content: "国际通用的载荷等级色标：\n• 绿色 (Green)：轻载荷\n• 蓝色 (Blue)：中载荷\n• 红色 (Red)：重载荷\n• 黄色 (Yellow)：超重载荷\n警告：务必确认标准！ISO 10243 与日标 JIS B 5012 的颜色含义不同（例如 JIS 的红色可能对应不同的载荷等级），不可混用。"
        },
        {
          title: "材料选择与耐温极限",
          content: "• 铬钒钢 (50CrV4)：通用材料，最高工作温度约 200°C。\n• 铬硅钢 (55CrSi)：具有更优异的抗疲劳和耐热性能，最高工作温度可达 246°C (475°F)。为了防止在高温下发生“热衰减”（自由长缩短），高端模具弹簧现多采用铬硅钢制造。"
        },
        {
          title: "疲劳寿命与压缩量关系",
          content: "模具弹簧只有在严格限制压缩量的前提下才能达到百万次寿命。\n• 长寿命 (100万次+)：控制压缩量 < 25% 自由长。\n• 一般寿命：压缩量 ~30%。\n• 极限使用：若压缩量接近 40%，寿命将急剧下降至 <10万次。严禁压死（Solid）！"
        },
        {
          title: "高速冲压中的共振问题",
          content: "在高速冲床 (>500 SPM) 中，弹簧容易产生“驻波” (Surge)。为了减少内部摩擦生热，高端模具弹簧采用“梯形”截面线材卷绕，卷绕后内侧受压变形，截面才变为完美的矩形，从而由线接触变为面接触，散热更好。"
        }
      ],
      faqs: [
        {
          q: "ISO 模具弹簧和 JIS 模具弹簧能互换吗？",
          a: "不能。虽然尺寸可能接近，但颜色代表的载荷等级完全不同。混用会导致模具受力不平衡或弹簧早期断裂。"
        },
        {
          q: "模具弹簧的最高工作温度是多少？",
          a: "铬钒钢通常为 200°C，铬硅钢可达 246°C。超过此温度弹簧会发生永久塑性变形（变短）。"
        },
        {
          q: "模具弹簧能被压到底吗？",
          a: "绝对不行。模具弹簧是针对高周疲劳设计的，压死瞬间的应力会远超屈服极限。"
        }
      ]
    }
  },
  wave: {
    en: {
      h1: "Wave Spring Calculator & Space Saving Design",
      sections: [
        {
          title: "The 50% Space Advantage",
          content: "Wave springs are the ultimate problem solver for axial space constraints. They typically occupy only 50% of the compressed height of an equivalent helical coil spring while delivering the same force. Ideally suited for miniature devices, connectors, and seal pre-loading."
        },
        {
          title: "Mechanism of Action",
          content: "Unlike coil springs (torsional stress), wave springs operate purely in bending (beam theory). As the waves flatten, the reaction force is generated. Since the wire is flat and the waves nest, the solid height is minimal—just the stack of wire thicknesses."
        },
        {
          title: "Multi-Turn Features",
          content: "Gap or Overlap types allow for Multi-Turn designs (Crest-to-Crest). This stacking increases total deflection without increasing the spring rate, similar to series-stacked Belleville washers but in a single integrated piece."
        },
        {
          title: "Bore/Shaft Expansion Check",
          content: "Similar to retaining rings, wave springs expand in diameter when compressed. Design must ensure the OD does not bind against the Bore wall at maximum compression."
        }
      ],
      faqs: [
        {
          q: "How much space does a wave spring save?",
          a: "Approximately 50% of the axial operating height compared to a standard coil spring."
        },
        {
          q: "Are wave springs made of stamped washers?",
          a: "Usually no. High-performance wave springs are 'coiled' (edge-wound) from flat wire, preserving the metal grain structure for better fatigue strength than stamped variants."
        }
      ]
    },
    zh: {
      h1: "波形弹簧计算器与空间优化设计",
      sections: [
        {
          title: "50% 的空间节省优势",
          content: "波形弹簧 (Wave Spring) 是解决轴向空间不足的终极方案。与普通螺旋弹簧相比，在提供相同载荷的前提下，波形弹簧通常仅占用 50% 的工作高度。特别适用于精密仪器、连接器和机械密封预压。"
        },
        {
          title: "力学原理：梁的弯曲",
          content: "不同于螺旋弹簧的扭转应力，波形弹簧工作时主要发生 **弯曲变形**（类似简支梁）。随着波峰被压平，产生回弹力。由于采用扁丝且波纹可层叠，其压并高度极低（几乎等于线材厚度总和）。"
        },
        {
          title: "对顶波簧 (Crest-to-Crest)",
          content: "通过多层对顶堆叠（Multi-Turn），波簧可以在不增加刚度的情况下大幅增加行程。这类似于碟形弹簧的串联组合，但波簧是单体成型的，无需复杂的导向组件，安装更便捷。"
        },
        {
          title: "直径膨胀效应",
          content: "波簧在压平时，外径 (OD) 会略微变大。设计孔安装 (Bore) 时，必须预留间隙，防止压至最低点时波簧卡死在孔壁上。"
        }
      ],
      faqs: [
        {
          q: "波形弹簧可以节省多少空间？",
          a: "通常可节省约 50% 的轴向高度空间。"
        },
        {
          q: "波簧是冲压出来的吗？",
          a: "高质量波簧通常采用扁钢丝‘绕制’（Edge-Winding）而成。绕制工艺保留了金属晶粒流线，疲劳强度优于冲压件。"
        }
      ]
    }
  },
  conical: {
    en: {
      h1: "Conical Spring Calculator & Telescoping Design",
      sections: [
        {
          title: "Telescoping Ability (Near-Zero Solid Height)",
          content: "The defining feature of a conical spring is its ability to telescope. If designed correctly (coil pitch > wire diameter), the coils nest inside each other completely perfectly. This allows the Solid Height to be as low as a single wire diameter (1x d), solving extreme clearance problems."
        },
        {
          title: "Variable (Progressive) Rate",
          content: "As a conical spring compresses, the larger outer coils are softer and compress first. Once they bottom out (touch), they become inactive. This reduces the number of active coils, causing the spring rate to stiffen progressively. The Force-Deflection curve is non-linear (curved)."
        },
        {
          title: "Buckling Stability",
          content: "The tapered shape provides inherent lateral stability. Conical springs are far less prone to buckling than cylindrical springs, often eliminating the need for a guide rod."
        }
      ],
      faqs: [
        {
          q: "What is the solid height of a telescoping conical spring?",
          a: "Ideally, it is just one wire diameter (or thickness), as all coils nest flat within each other."
        },
        {
          q: "Why is the spring rate non-linear?",
          a: "Because the active coils gradually touch down and become inactive, stiffening the remaining spring."
        }
      ]
    },
    zh: {
      h1: "锥形弹簧计算器与套叠设计",
      sections: [
        {
          title: "完全套叠 (Telescoping) 能力",
          content: "锥形弹簧的核心优势是其套叠能力。如果设计得当（节距合适），各圈线圈可以完全嵌入下一圈内部。这意味着其 **压并高度 (Solid Height)** 可以低至仅为一个线径 (1x d)，完美解决极限压缩空间问题。"
        },
        {
          title: "渐进式刚度 (Progressive Rate)",
          content: "锥形弹簧受压时，大直径线圈较软，先发生变形并接触底部。一旦大圈接触“死掉”，有效圈数减少，剩余部分的刚度瞬间变大。因此，其 载荷-位移曲线 是非线性的（逐渐变硬），具有良好的缓冲特性。"
        },
        {
          title: "抗侧弯自稳性",
          content: "锥体几何形状天然具有极佳的侧向稳定性。与圆柱弹簧相比，锥形弹簧极难发生侧弯（Buckling），通常不需要导杆即可稳定工作。"
        }
      ],
      faqs: [
        {
          q: "锥形弹簧的压并高度是多少？",
          a: "对于完全套叠设计，压并高度理论上仅等于一根钢丝的直径。"
        },
        {
          q: "为什么刚度是变化的？",
          a: "因为随着压缩，大线圈先着地失去弹性，剩余工作的线圈变少，整体刚度随之上升。"
        }
      ]
    }
  },
  spiralTorsion: {
    en: {
      h1: "Spiral Torsion Spring Calculator (Clock Springs)",
      sections: [
        {
          title: "Planar Torque Generation",
          content: "Spiral torsion springs (or Clock Springs) are wound from flat strip material in a planar spiral. They produce torque usually for less than 360° rotation (standard) or multiple turns (power springs). Common in seat belts, retractors, and balance wheels."
        },
        {
          title: "Torque Formula",
          content: "Torque M = (E * b * t³ * θ) / (6 * L). \n• b: strip width\n• t: strip thickness (most critical, cubic effect)\n• L: Active length.\nThe torque is generally linear for the first few turns until coil-to-coil friction interferes."
        },
        {
          title: "Power Springs vs Hairsprings",
          content: "• Hairsprings: Spaced coils, zero friction, linear torque. Used in instruments.\n• Power Springs: Tightly wound, coils touch. High friction (hysteresis). Used for retraction or energy storage (toys, seatbelts)."
        }
      ],
      faqs: [
        {
          q: "How does strip thickness affect torque?",
          a: "Torque is proportional to the **cube** of thickness (t³). Doubling strip thickness increases torque by 8 times."
        },
        {
          q: "What causes hysteresis in spiral springs?",
          a: "Friction between the coils as they slide against each other during winding/unwinding."
        }
      ]
    },
    zh: {
      h1: "螺旋扭转弹簧计算器（平面涡卷弹簧）",
      sections: [
        {
          title: "平面扭矩发生器",
          content: "螺旋扭转弹簧（又称发条弹簧、涡卷弹簧）由扁平带材在平面内卷绕而成。它们用于产生旋转扭矩，常见于安全带卷收器、电缆卷筒、钟表游丝等。"
        },
        {
          title: "扭矩计算公式",
          content: "扭矩 M = (E * b * t³ * θ) / (6 * L)。\n• b: 带宽\n• t: 带厚 (最关键，三次冥影响)\n• L: 有效展开长度\n通常在初始几圈旋转内，扭矩输出是线性的。"
        },
        {
          title: "动力发条 vs 游丝",
          content: "• 游丝 (Hairsprings)：圈与圈不接触，无摩擦，扭矩极度线性，用于精密仪表。\n• 动力发条 (Power Springs)：圈与圈紧密接触，存在层间摩擦（滞后效应），用于储能或回收机构（如卷尺）。"
        }
      ],
      faqs: [
        {
          q: "带材厚度对扭矩影响有多大？",
          a: "扭矩与厚度的 **立方** 成正比。厚度增加一倍，扭矩增加 8 倍。"
        },
        {
          q: "什么是发条的滞后 (Hysteresis)？",
          a: "由于层间摩擦，上发条需要的力比释放时发出的力要大，中间的差值即为摩擦损耗的能量。"
        }
      ]
    }
  },
  suspensionSpring: {
    en: {
      h1: "Vehicle Shock Absorber Spring & Suspension Design",
      sections: [
        {
          title: "Cold Coiling vs Hot Coiling",
          content: "Manufacturing method depends on wire diameter.\n• Cold Coiling: Used for d < 20mm. High precision, excellent surface finish. Ideal for passenger cars and light trucks.\n• Hot Coiling: Used for d > 20mm (up to 65mm). The bar is heated to ~900°C to be malleable. Used for heavy trucks, trains, and industrial isolators."
        },
        {
          title: "Ride Frequency (Natural Frequency)",
          content: "The single most important comfort metric. \n• Comfort (Sedans): 1.0 - 1.2 Hz (Matches human walking cadence).\n• Performance (Sports): 1.5 - 2.0 Hz.\n• Racing (Downforce): > 3.0 Hz.\nFrequency (Hz) ≈ 0.5 * √(Rate / Mass). To stiffen a car without ruining comfort, you must reduce unsprung mass along with increasing rate."
        },
        {
          title: "Progressive Rate Designs",
          content: "Most modern stock springs are 'Progressive'. This is achieved by Tapered Wire (variable diameter) or Variable Pitch (changing gap). Soft initial coils absorb small road cracks (highway comfort), while stiffer final coils prevent bottoming out during hard cornering or potholes."
        },
        {
          title: "Corrosion Protection: 500h+ Salt Spray",
          content: "Suspension springs face the harshest environment: road salt, gravel impact, and water. Automotive standards (e.g., ASTM B117) require passing 500 to 1000 hours of salt spray testing. This is achieved via a dual-layer coating: Zinc-Phosphate pretreatment followed by High-Performance Epoxy Powder Coating."
        }
      ],
      faqs: [
        {
          q: "What is the difference between linear and progressive springs?",
          a: "Linear springs have a constant stiffness (k). Progressive springs get stiffer as they compress, offering a dual-nature ride: soft for comfort, stiff for control."
        },
        {
          q: "Why are suspension springs shot peened?",
          a: "Shot peening bombards the surface with steel beads to induce compressive stress. This prevents micro-cracks from opening, extending fatigue life by 5-10x."
        },
        {
          q: "How often should suspension springs be replaced?",
          a: "They normally last the life of the vehicle, but should be replaced if they sag (ride height loss) or if the coating is compromised by rust."
        }
      ]
    },
    zh: {
      h1: "汽车减震弹簧计算器与悬挂工程设计",
      sections: [
        {
          title: "冷卷 (Cold Coiling) vs 热卷 (Hot Coiling)",
          content: "制造工艺取决于线径：\n• 冷卷工艺：适用于线径 d < 20mm。精度极高，表面质量好，是轿车和轻卡悬挂的主流工艺。\n• 热卷工艺：适用于线径 d > 20mm（最大可达 65mm）。钢棒需加热至 900°C 以上才能卷绕。主要用于重卡、火车和大型工业减震器。"
        },
        {
          title: "行驶频率 (Ride Frequency) 与舒适度",
          content: "这是衡量悬挂舒适度的核心指标（自然频率）。\n• 舒适型 (轿车)：1.0 - 1.2 Hz (接近人类步行频率，大脑最适应)。\n• 运动型 (跑车)：1.5 - 2.0 Hz。\n• 赛车型 (下压力)：> 3.0 Hz。\n频率 Hz ≈ 0.5 * √(刚度 / 簧上质量)。要想车身更稳而不颠，必须精确匹配刚度与质量比。"
        },
        {
          title: "渐进式刚度 (Progressive Rate) 设计",
          content: "现代原厂弹簧多为“渐进式”。通过 **变节距 (Variable Pitch)** 或 **变截面 (Tapered Wire)** 实现。疏松的线圈先工作，吸收细微震动（高速巡航）；密集的线圈后工作，在剧烈过弯或大坑洼时提供强大支撑，防止触底。"
        },
        {
          title: "防腐蚀标准：500小时+ 盐雾测试",
          content: "底盘环境极其恶劣（融雪剂、碎石）。汽车级标准（ASTM B117）通常要求通过 500-1000 小时的中性盐雾测试。标准工艺为：锌磷化前处理 + 高性能环氧粉末涂层 (Epoxy Powder Coating)，漆膜厚度需 > 80μm。"
        }
      ],
      faqs: [
        {
          q: "线性弹簧和渐进式弹簧有什么区别？",
          a: "线性弹簧刚度恒定。渐进式弹簧越压越硬，能兼顾“软”的初段舒适性和“硬”的末段支撑性。"
        },
        {
          q: "为什么减震弹簧必须喷丸 (Shot Peening)？",
          a: "喷丸能在金属表层产生压应力，抵消拉伸应力，防止微裂纹扩展。经过喷丸的弹簧疲劳寿命通常是未经处理的 5-10 倍。"
        },
        {
          q: "减震弹簧大概多久更换？",
          a: "通常与车同寿。但如果发现车身高度降低（弹簧塌陷）或涂层剥落生锈，应立即更换以免断裂刺破轮胎。"
        }
      ]
    }
  },
  disk: {
    en: {
      h1: "Belleville Washer & Disk Spring Calculator",
      sections: [
        {
          title: "What is a Disk Spring (Belleville Washer)?",
          content: "A disk spring is a conical-shaped washer typically used to apply high loads in confined spaces. Unlike coil springs, they provide a much higher force-to-space ratio. They are governed by the Almen-Laszlo equations, which account for the non-linear behavior of the conical geometry."
        },
        {
          title: "Series vs. Parallel Stacking",
          content: "• Parallel Stacking (nested): Increases force proportionally to the number of disks, while deflection remains equal to a single disk.\n• Series Stacking (opposed): Increases deflection proportionally to the number of disks, while the force remains equal to a single disk.\n• Mixed Stacking: Allows for tailored force-deflection curves by combining both methods."
        },
        {
          title: "Stress Distribution in Conical Disks",
          content: "Stress is not uniform across the disk. The highest tensile stresses typically occur at the inner diameter (ID) edge, while the highest compressive stresses are at the outer diameter (OD) edge. Fatigue life is governed by the stress range at these critical points."
        },
        {
          title: "Friction & Hysteresis",
          content: "In stacked applications, friction between disks causes a 'Hysteresis' effect where the unloading force is significantly lower than the loading force. This is useful for damping vibration but must be accounted for in precision assemblies."
        }
      ],
      faqs: [
        {
          q: "When should I use parallel stacking?",
          a: "Use parallel stacking when you need extremely high forces in very little axial space."
        },
        {
          q: "How can I increase the total deflection of a disk spring setup?",
          a: "Stack multiple disks in 'Series' (facing opposite directions) to multiply the deflection of a single disk."
        },
        {
          q: "What material is best for high-temperature disk springs?",
          a: "50CrV4 is standard, but Inconel or stainless steels are used for high-temperature or corrosive environments to prevent relaxation."
        }
      ]
    },
    zh: {
      h1: "碟形弹簧 (Belleville Washer) 计算器与组合设计",
      sections: [
        {
          title: "什么是碟形弹簧？",
          content: "碟形弹簧（又称贝尔维尔垫圈）是一种中空的锥形垫圈。其特点是能在极小的轴向空间内产生极大的载荷。碟簧的工作原理基于 Almen-Laszlo 理论，其载荷-位移曲线通常是非线性的。"
        },
        {
          title: "串联与并联：自由组合力与行程",
          content: "• 并联 (Parallel Stacking)：同向嵌套。载荷随碟簧数量成倍增加，但行程保持单片水平。\n• 串联 (Series Stacking)：背对背堆叠。行程随碟簧数量成倍增加，但载荷保持单片水平。\n• 混合组合：通过灵活组合串并联，可以实现复杂的渐进式力学特性曲线。"
        },
        {
          title: "应力分布与疲劳寿命",
          content: "碟簧内部的应力分布极不均匀。通常在内径 (ID) 边缘产生最高张应力，而在外径 (OD) 边缘产生最高压应力。疲劳寿命主要取决于这些关键点位在工作循环中的应力幅值。"
        },
        {
          title: "摩擦力与滞后效应 (Hysteresis)",
          content: "在组合使用时，碟簧间的相互摩擦会导致“滞后”现象：即卸载时的力值低于加载时的力值。这种特性对于阻尼减震非常有利，但在精密力值控制应用中需要额外注意。"
        }
      ],
      faqs: [
        {
          q: "什么时候该选择并联组合方式？",
          a: "当你需要在极小的安装高度内获得超大输出压力时，应选择并联嵌套。"
        },
        {
          q: "如何增加碟簧系统的总行程？",
          a: "将多片碟簧以“串联”（背对背）方式堆叠，总行程等于单片行程乘以碟簧数量。"
        },
        {
          q: "环境温度对碟形弹簧有影响吗？",
          a: "有。高温会导致弹簧材料蠕变或松弛。常规 50CrV4 适用于 100°C 以下，更高温环境需选用不锈钢或高温合金材料。"
        }
      ]
    }
  },
  garter: {
    en: {
      h1: "Garter Spring Calculator & Radial Force Engineering",
      sections: [
        {
          title: "What is a Garter Spring?",
          content: "A garter spring is a helical tension spring whose ends are joined to form a closed circle. They are primarily used to provide a constant radial force in oil seals, electrical connectors, and motor brushes. The principal effect is creating 'Hoop Tension' to apply uniform inward pressure."
        },
        {
          title: "Hoop Tension to Radial Force Conversion",
          content: "The spring provides an axial tension (F_hoop). In a circular assembly, this creates a total radial pressure. \nFormula: Total Radial Force (F_r) = 2π * F_hoop. \nThis uniform distribution is critical for maintaining a leak-proof seal on rotating shafts."
        },
        {
          title: "Common Joint Types",
          content: "• Hook and Loop: One end is a traditional hook, the other is an eye loop. Simplest but creates a slight gap.\n• Screw Joint (Nib and Taper): One end is reduced in diameter (Nib) and screwed into the regular coils of the other end. Provides the most continuous and uniform radial pressure.\n• Interlocked Coils: Direct entanglement of coils for low-precision applications."
        },
        {
          title: "Criticality of Initial Tension",
          content: "Garter springs must have high initial tension to ensure the coils stay closed and provide pressure even at small diameters. Without sufficient initial tension, the spring might feel 'loose' or fail to respond to minor shaft run-out (eccentricity)."
        }
      ],
      faqs: [
        {
          q: "How do I calculate the radial force of a garter spring?",
          a: "First calculate the tension force based on the extension of the ring, then use the hoop tension formula (Fr = 2π * Ft). The tighter the ring is stretched over the shaft, the higher the pressure."
        },
        {
          q: "What is the best joint for high-speed oil seals?",
          a: "The 'Screw Joint' (Nib type) is preferred as it minimizes the mechanical discontinuity at the junction, preventing uneven wear on the seal lip."
        },
        {
          q: "Can garter springs be used for extension?",
          a: "While they are essentially tension springs, their primary design goal is radial compression. Using them purely for axial extension is rare compared to standard extension springs."
        }
      ]
    },
    zh: {
      h1: "环形拉簧 (Garter Spring) 计算器与径向力设计",
      sections: [
        {
          title: "什么是环形拉簧？",
          content: "环形拉簧是一种两端连接成闭合圆环的螺旋拉伸弹簧。它们主要用于在油封 (Oil Seals)、电连接器和电机碳刷中提供持续的径向紧固力。其核心物理效应是通过“周向张力” (Hoop Tension) 产生均匀的向内压力。"
        },
        {
          title: "周向张力与径向力的转化",
          content: "弹簧本身产生的是切向拉力 (F_hoop)。在圆形组件中，这转化为总的径向紧固力。\n公式：总径向力 (F_r) = 2π * F_hoop。\n这种均匀分布的压力对于保持旋转轴的零泄漏密封至关重要。"
        },
        {
          title: "常见的接头设计类型",
          content: "• 钩环连接 (Hook & Loop)：一端为钩，一端为环。结构简单但接头处存在微小缝隙。\n• 螺纹连接 (Screw Joint/Nib)：一端缩径后直接旋入另一端的线圈。这种方式提供的径向压力最均匀，是高精密油封的标准方案。\n• 互锁连接：通过线圈直接扣合，适用于低精度场合。"
        },
        {
          title: "初张力 (Initial Tension) 的重要性",
          content: "环形拉簧必须具备较高的初张力，以确保线圈在工作状态下保持紧密。如果没有足够初张力，弹簧在应对轴的微小跳动（偏心）时会反应迟钝，导致密封失效。"
        }
      ],
      faqs: [
        {
          q: "如何计算环形弹簧产生的向内压力？",
          a: "首先根据弹簧拉伸后的长度计算出周向张力 Ft，然后利用公式 Fr = 2π * Ft 转换为径向力。直径被拉伸得越多，压力越大。"
        },
        {
          q: "高速旋转油封推荐使用哪种接头？",
          a: "推荐使用“螺纹式缩径接头” (Nib type)。它能最大程度保证接头处的平滑过渡，避免油封唇口受力不均导致异常磨损。"
        },
        {
          q: "环形拉簧可以当做普通拉簧使用吗？",
          a: "虽然其本质是拉簧，但其设计重点在于径向压缩。如果仅作为轴向拉伸使用，通常直接选用标准的拉伸弹簧。"
        }
      ]
    }
  },
  arc: {
    en: {
      h1: "Arc Spring (Curved Helical Spring) Calculator",
      sections: [
        {
          title: "What is an Arc Spring?",
          content: "An arc spring is a helical compression spring whose axis is curved into an arc. They are primarily used in high-torque vibration damping systems, such as Dual-Mass Flywheels (DMF) in automotive drivetrains. They allow for large rotation angles while maintaining high torque capacity."
        },
        {
          title: "The Role of Centrifugal Force",
          content: "In rotating applications, centrifugal force pushes the arc spring against its housing. This creates significant friction which provides a secondary damping effect beyond the spring's own material hysteresis. This is critical for dampening engine speed oscillations."
        },
        {
          title: "Geometric Complexity",
          content: "Designing an arc spring requires balancing the spring diameter, coil pitch, and the radius of the arc. If the arc radius is too tight relative to the spring diameter, the inner coils may touch (pre-mature solid) while the outer coils are still open."
        }
      ],
      faqs: [
        {
          q: "Where are arc springs mostly used?",
          a: "They are nearly universal in modern dual-mass flywheels and torque converters to isolate engine vibrations from the gearbox."
        },
        {
          q: "How does friction affect arc spring performance?",
          a: "Friction against the guide rail or housing adds damping but also causes wear. Hardened housings or lubricating grease are often required."
        }
      ]
    },
    zh: {
      h1: "弧形弹簧 (Arc Spring) 计算与双质量飞轮设计",
      sections: [
        {
          title: "什么是弧形弹簧？",
          content: "弧形弹簧（又称弯曲螺旋弹簧）是一种中心轴线预弯成弧形的压缩弹簧。它们主要用于高扭矩减震系统，如汽车传动系统中的双质量飞轮 (DMF)。它们允许极大的扭转角度，同时提供平稳的扭矩传递。"
        },
        {
          title: "离心力与辅助阻尼",
          content: "在旋转工况下，离心力会将弧形弹簧压向外部壳体。这种接触产生的摩擦力构成了系统的辅助阻尼，有助于吸收引擎的转速波动，保护变速箱。"
        },
        {
          title: "设计的几何约束",
          content: "设计弧形弹簧需要平衡中径、节距与圆弧半径。如果圆弧半径相对于弹簧直径过小，内侧线圈会提前接触（压死），而外侧仍有间隙，导致受力极不均匀。"
        }
      ],
      faqs: [
        {
          q: "弧形弹簧主要应用在哪里？",
          a: "广泛应用于现代汽车的双质量飞轮、离合器减震器和扭矩转换器中，用于隔离发动机振动。"
        },
        {
          q: "摩擦力对弧形弹簧有什么影响？",
          a: "摩擦力提供了必要的能量耗散（阻尼），但也会导致磨损。通常需要使用专用的衬层或润滑脂，并对壳体进行硬化处理。"
        }
      ]
    }
  },
  variablePitchCompression: {
    en: {
      h1: "Variable Pitch Compression Spring Calculator",
      sections: [
        {
          title: "What is Variable Pitch?",
          content: "A variable pitch spring has a changing distance between its coils throughout its length. This design creates a progressive spring rate: as the spring compresses, the coils with the smaller pitch touch first and become inactive, gradually increasing the stiffness of the remaining spring."
        },
        {
          title: "Suppression of Resonance (Spring Surge)",
          content: "Because a variable pitch spring doesn't have a single fixed natural frequency, it is far less likely to resonate (surge) at high frequencies. This makes them ideal for high-speed engine valves and performance suspension where constant-rate springs might vibrate uncontrollably."
        },
        {
          title: "Force-Deflection Characterization",
          content: "The load curve for a variable pitch spring is non-linear—it curves upwards. Engineering such a spring requires segmenting the spring into different zones and calculating when each zone becomes solid."
        }
      ],
      faqs: [
        {
          q: "Why use variable pitch instead of standard compression springs?",
          a: "To achieve a soft initial feel for comfort while maintaining high load capacity at the end of the stroke, and to prevent high-speed resonance."
        },
        {
          q: "Is it harder to manufacture variable pitch springs?",
          a: "Yes. CNC coiling machines must vary the pitch precisely during the coiling process, requiring advanced control and specialized QC verification."
        }
      ]
    },
    zh: {
      h1: "变节距压缩弹簧 (Variable Pitch) 计算与特性",
      sections: [
        {
          title: "什么是变节距设计？",
          content: "变节距弹簧的线圈间距在长度方向上是变化的。这种设计能产生“渐进式刚度”：随着压缩进行，节距较小的线圈先接触并失去弹性（变为无效圈），从而使剩余部分的刚度逐渐变大。"
        },
        {
          title: "抑制共振与驻波 (Resonance)",
          content: "由于变节距弹簧没有单一的固有频率，它极难在高频冲击下产生共振（Surge）。这使其成为高速发动机气门弹簧和高性能悬挂弹簧的理想选择，能有效避免弹簧在高频工作下的剧烈震动。"
        },
        {
          title: "载荷-位移曲线特性",
          content: "变节距弹簧的载荷曲线是非线性的（向上弯曲）。工程计算需要将弹簧划分为多个区域，并精确计算每个区域在何时达到“压并”状态，从而得出完整的力学特性。"
        }
      ],
      faqs: [
        {
          q: "为什么要用变节距而不是普通压簧？",
          a: "为了在初段行程提供柔顺的触感，而在末段行程提供强大的支撑力，同时防止高频工况下的共振破坏。"
        },
        {
          q: "变节距弹簧的制造难度大吗？",
          a: "较大。需要高精度的 CNC 卷簧机在加工过程中动态调整节距，且生产后的力度检测需要多个行程点的全量校验。"
        }
      ]
    }
  },
  torsionalSpringSystem: {
    en: {
      h1: "Clutch Spring Pack (Torsional Spring System) Engineering Design & Analysis",
      sections: [
        {
          title: "Engineering Purpose of Compression Springs",
          content: "In clutch damper and Dual Mass Flywheel (DMF) systems, the compression springs within the spring pack do NOT function as axial load-bearing elements. Their core purpose is to provide controlled torsional compliance and vibration isolation between the engine and transmission. Although standard helical compression springs are used, from an engineering design, analysis, and validation perspective, this system is fundamentally a torsional spring system."
        },
        {
          title: "The Multi-Stage Spring Pack Concept",
          content: "Spring packs are complex assemblies found in automotive powertrains and industrial couplings. They use multiple helical springs arranged circumferentially to provide a staged torque-angle response, critical for isolating engine vibrations."
        },
        {
          title: "Equivalent Unwrapped Model",
          content: "For high-precision engineering, these spring pack systems are mapped to an 'unwrapped' linear equivalent. Torque T is derived from individual spring stiffness kᵢ and their radial position Rᵢ: T = Σ (kᵢ · Rᵢ² · θ). This abstraction allows for rigorous stress and load sharing analysis."
        },
        {
          title: "Staged Engagement Logic",
          content: "Efficiency in dampers is achieved by staggering the start angles (θ_start) of different spring groups. This creates a multi-rate characteristic: soft for idling and low-load conditions, and progressively stiffer for high-torque acceleration, protecting the drivetrain from shock."
        },
        {
          title: "Mechanical Stops & Rigid Contact",
          content: "To protect the springs from over-stress (coil bind), mechanical stops limit maximum travel. Our calculator models this rigid contact with a 10⁶ stiffness multiplier once the system limit θ_stop is reached, simulating the metal-to-metal contact of the hub."
        },
        {
          title: "Frictional Hysteresis",
          content: "Real dampers exhibit hysteresis due to friction between springs and their housing. This is modeled using Coulomb friction T_f, creating a load/unload loop that dissipates energy and prevents engine speed oscillations from reaching the transmission."
        }
      ],
      faqs: [
        {
          q: "Q1. What is the primary function of the compression spring pack in the clutch damper?",
          a: "The primary function of the compression spring pack is to generate controlled torsional resistance between the input and output components of the clutch or DMF system. This resistance filters engine torsional vibrations, smooths torque transmission, and protects the drivetrain under transient load conditions."
        },
        {
          q: "Q2. How is torque generated and calculated using compression springs?",
          a: "Torque is generated when relative angular displacement causes the circumferentially mounted compression springs to compress. The system converts angular displacement into linear spring compression, and spring force acting at a defined radius produces torque. For engineering evaluation, the spring pack is treated as an equivalent torsional spring system, where total torque is the sum of contributions from all active spring groups as a function of angular displacement."
        },
        {
          q: "Q3. Why are compression springs used instead of torsion bars?",
          a: "Compression springs are preferred over torsion bars due to: Superior packaging flexibility within clutch hubs; Capability to implement multi-stage stiffness characteristics; Better NVH tuning at low angular amplitudes; Proven manufacturing robustness and cost efficiency; Natural mechanical stop through spring solid height. These advantages make compression springs the industry standard for modern clutch damper systems."
        },
        {
          q: "Q4. What is the purpose of multi-stage (Stage 1 / 2 / 3) spring design?",
          a: "The multi-stage spring design allows the torsional system to adapt to different operating conditions by progressively engaging spring groups with increasing stiffness. Stage 1 handles Idle/NVH Filtering, Stage 2 handles Normal Driving Load, and Stage 3 handles Peak Torque/Protection."
        },
        {
          q: "Q5. How does each stage correspond to NVH and torque conditions?",
          a: "Stage 1: Idle / NVH Filtering — filters engine firing pulses and suppresses noise at idle. Stage 2: Normal Driving Load — balances comfort and response for normal driving. Stage 3: Peak Torque / Protection — handles high torque and shock loads to protect the drivetrain."
        },
        {
          q: "Q6. How is overload or end-of-travel handled in the system?",
          a: "Overload protection is achieved through mechanical stops defined by spring solid height and system geometry. Once the maximum angular travel is reached, the system transitions to a rigid stop condition, preventing further torque transmission and protecting surrounding components."
        },
        {
          q: "Q7. How does the design support OEM-specific tuning requirements?",
          a: "The system allows independent tuning of: Number of springs per stage; Spring stiffness and preload; Installation radius per stage; Engagement angles between stages. This enables precise matching to OEM-specific NVH targets and torque capacity requirements."
        },
        {
          q: "Q8. Is this design aligned with current OEM and Tier-1 practices?",
          a: "Yes. The staged compression spring pack architecture is widely used in current clutch damper and DMF systems across passenger and commercial vehicle applications and is fully aligned with established OEM engineering practices (ISRI, ZF, Schaeffler, Valeo). The proposed torsional spring pack architecture provides a robust, tunable, and OEM-proven solution for balancing NVH performance and torque capacity across all operating conditions."
        }
      ]
    },
    zh: {
      h1: "离合器弹簧包 (Spring Pack) 工程设计与分析",
      sections: [
        {
          title: "压缩弹簧的工程作用说明",
          content: "在离合器减振器及双质量飞轮（DMF）系统中，弹簧包内的压缩弹簧并非作为轴向承载元件使用。其核心作用是：在发动机与变速器之间提供可控的扭转柔度与振动隔离能力。尽管系统中使用的是标准螺旋压簧，但从工程设计、分析与验证角度，该系统本质上是一个扭转弹簧系统。"
        },
        {
          title: "多级弹簧包系统概念",
          content: "弹簧包系统广泛应用于汽车传动系统（如离合器从动盘、双质量飞轮）和工业联轴器。通过在圆周方向布置多组螺旋弹簧，实现分段的扭矩-转座响应，有效隔离发动机振动。"
        },
        {
          title: "等效展开模型",
          content: "为了精确进行工程计算，这些弹簧包中的径向布置弹簧被映射为“等效展开”线性模型。系统总扭矩 T 由各组弹簧的刚度 kᵢ 及其安装半径 Rᵢ 共同决定：T = Σ (kᵢ · Rᵢ² · θ)。这种抽象模型使得应力分析和负载分配更加严谨。"
        },
        {
          title: "分级工作逻辑",
          content: "弹簧包的高效率源于对各组弹簧“起始转角” (θ_start) 的分段设计。这产生了多级刚度特性：怠速或低载荷下较软，高扭矩加速时变硬，防止传动系统受到冲击。"
        },
        {
          title: "机械止挡与刚性接触",
          content: "为防止弹簧发生压并 (Coil Bind) 损坏，系统设有旋转止挡。本工具在达到系统极限角 θ_stop 后，使用 10⁶ 倍刚度系数模拟金属刚性碰撞，保护弹簧组不被过度压缩。"
        },
        {
          title: "摩擦滞后效应",
          content: "由于弹簧与座圈之间的摩擦，实际系统存在滞后现象。我们通过库仑摩擦模型 T_f 模拟加载/卸载循环中的能量消散，防止转速波动传递到变速箱。"
        }
      ],
      faqs: [
        {
          q: "问题 1：离合器减振器中的压缩弹簧包主要作用是什么？",
          a: "压缩弹簧包的主要作用是在离合器或双质量飞轮系统的输入端与输出端之间产生受控的扭转阻力，用于过滤发动机扭转振动、平顺扭矩传递，并在瞬态载荷下保护传动系统。"
        },
        {
          q: "问题 2：压缩弹簧是如何产生并计算扭矩的？",
          a: "当输入端与输出端产生相对转角时，沿圆周布置的压缩弹簧被压缩，从而产生力矩。系统将转角位移转化为弹簧轴向压缩，弹簧力在安装半径处产生扭矩。在工程评估中，弹簧包被等效为一个扭转弹簧系统，系统总扭矩为所有已介入弹簧组在给定转角下的扭矩贡献之和。"
        },
        {
          q: "问题 3：为什么选用压缩弹簧而不是扭杆？",
          a: "相比扭杆，压缩弹簧具有以下优势：更高的布置灵活性，适合集成于离合器轮毂；可实现多级刚度特性；小转角区间 NVH 调校能力更强；制造工艺成熟，成本与可靠性优势明显；弹簧压实高度天然形成机械止挡。因此，压缩弹簧成为现代离合器减振系统的行业标准方案。"
        },
        {
          q: "问题 4：多级（Stage 1 / 2 / 3）弹簧设计的目的是什么？",
          a: "多级弹簧设计通过逐步介入不同刚度的弹簧组，使系统能够适应不同工况下的扭矩与 NVH 要求。每个阶段均针对特定工况进行优化。"
        },
        {
          q: "问题 5：各个 Stage 与 NVH / 扭矩工况如何对应？",
          a: "Stage 1：怠速与小负载下过滤发动机点火脉动，抑制异响。Stage 2：正常驾驶扭矩传递，兼顾舒适性与响应。Stage 3：高扭矩与冲击载荷工况，保护传动系统。"
        },
        {
          q: "问题 6：系统如何应对过载或行程末端？",
          a: "系统通过弹簧压实高度及结构几何形成的机械止挡实现过载保护。当达到最大允许转角后，系统进入刚性止挡状态，防止进一步传扭并保护相关部件。"
        },
        {
          q: "问题 7：该设计如何支持主机厂的定制化调校需求？",
          a: "该系统支持以下参数的独立调校：各 Stage 的弹簧数量；弹簧刚度与预载；各 Stage 的安装半径；不同 Stage 的介入转角。从而精确匹配主机厂的 NVH 目标与扭矩需求。"
        },
        {
          q: "问题 8：该设计是否符合当前 OEM / Tier-1 的工程实践？",
          a: "是的。分级压缩弹簧包架构已广泛应用于乘用车及商用车的离合器减振器和双质量飞轮系统，完全符合 ISRI、ZF、Schaeffler、Valeo 等主机厂及一级供应商的成熟工程实践。所提出的扭转弹簧包架构在全工况范围内实现了 NVH 性能与扭矩能力的平衡，具备可靠性、可调性及成熟的 OEM 应用基础。"
        }
      ]
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
