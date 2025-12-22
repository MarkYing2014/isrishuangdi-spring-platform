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
          content: "Globally recognized color coding for load classes:\n• Green: Light Load\n• Blue: Medium Load\n• Red: Heavy Load\n• Yellow: Extra Heavy Load\nNote: Always verify the standard. ISO 10243 is the most common in Europe/Global, but Japanese JIS B 5012 uses different colors for similar loads (e.g., JIS Red is not ISO Red)."
        },
        {
          title: "Life Expectancy vs Deflection",
          content: "Die springs are rated for millions of cycles ONLY if operated within strict deflection limits.\n• Long Life (1,000,000+ cycles): Use < 25% deflection.\n• Average Life: Use ~30% deflection.\n• Max Deflection: Pushing near 40-50% deflection drops life drastically to < 100,000 cycles. Never compress to solid!"
        },
        {
          title: "High-Speed Applications",
          content: "Die springs are often used in high-speed punch presses. Mass and friction become issues. High-quality die springs use trapezoidal wire sections that become rectangular AFTER coiling to minimize internal friction and heat generation."
        }
      ],
      faqs: [
        {
          q: "Are ISO and JIS die springs interchangeable?",
          a: "NO. While dimensions may look similar, the color codes mean completely different load ratings. Always check the catalog standard."
        },
        {
          q: "Why use rectangular wire?",
          a: "It maximizes the cross-sectional area in the available space, providing maximum energy storage density."
        },
        {
          q: "Can I compress a die spring to solid height?",
          a: "No. This is catastrophic for die springs. Safe maximum deflection is typically marked in catalogs (usually 40-50% of free length)."
        }
      ]
    },
    zh: {
      h1: "模具弹簧计算器与 ISO 10243 标准分析",
      sections: [
        {
          title: "矩形截面的优势",
          content: "模具弹簧（Die Spring）采用扁平的矩形截面线材。这种几何结构使得在相同空间内可以容纳更多的金属材料（高填充密度）。因此，模具弹簧的承载能力比同体积圆丝弹簧高出 30% 到 50%，非常的适合模具等空间受限的大力载场合。"
        },
        {
          title: "ISO 10243 颜色代码标准",
          content: "国际通用的载荷等级色标：\n• 绿色 (Green)：轻载荷\n• 蓝色 (Blue)：中载荷\n• 红色 (Red)：重载荷\n• 黄色 (Yellow)：超重载荷\n警告：务必确认标准！ISO 10243 与日标 JIS B 5012 的颜色含义不同（例如 JIS 的红色可能对应不同的载荷等级），不可混用。"
        },
        {
          title: "疲劳寿命与压缩量",
          content: "模具弹簧只有在严格限制压缩量的前提下才能达到百万次寿命。\n• 长寿命 (100万次+)：控制压缩量 < 25% 自由长。\n• 一般寿命：压缩量 ~30%。\n• 极限使用：若压缩量接近 40-50%，寿命将急剧下降至 <10万次。严禁压死（Solid）！"
        },
        {
          title: "梯形转矩形工艺",
          content: "高端模具弹簧在卷绕前并非标准矩形，而是“梯形”截面。卷绕后，内侧受压变形，截面才变为完美的矩形。这种工艺能确保工作时线圈间接触面平整，减少摩擦生热。"
        }
      ],
      faqs: [
        {
          q: "ISO 模具弹簧和 JIS 模具弹簧能互换吗？",
          a: "不能。虽然尺寸可能接近，但颜色代表的载荷等级完全不同。混用会导致模具受力不平衡或弹簧断裂。"
        },
        {
          q: "为什么是矩形丝？",
          a: "为了获取最大的单位体积能量密度。在孔径受限的情况下提供最大的力。"
        },
        {
          q: "模具弹簧能被压到底吗？",
          a: "绝对不行。模具弹簧是针对高周疲劳设计的，压死瞬间的应力会直接导致早期断裂。"
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
      h1: "Vehicle Suspension Spring Calculator",
      sections: [
        {
          title: "Automotive Grade Requirements",
          content: "Suspension springs are safety-critical. They typically require 'Shot Peening' to induce compressive residual stress, drastically improving fatigue life against road bumps. Materials are typically high-tensile Chrome-Silicon alloys."
        },
        {
          title: "Ride Height & Settling",
          content: "Springs will 'settle' (relax) slightly after initial use. Manufacturers perform a 'Presetting' (Scragging) operation—compressing the spring to solid height during manufacture—to remove this permanent set before the spring is installed on a car."
        }
      ],
      faqs: [
        {
          q: "What is progressive rate in suspension?",
          a: "A spring that gets stiffer as it compresses, preventing bottoming out on harsh bumps while keeping a soft ride for small bumps."
        }
      ]
    },
    zh: {
      h1: "汽车悬挂弹簧计算器",
      sections: [
        {
          title: "汽车级制造标准",
          content: "悬挂弹簧是关乎生命安全的部件。制造时必须进行 **喷丸处理 (Shot Peening)**，在表层引入压应力，从而大幅提高抗疲劳能力以应对路面颠簸。材料通常采用高强度的铬硅合金钢。"
        },
        {
          title: "预置处理 (Presetting/Scragging)",
          content: "新弹簧如果不处理，在使用初期会发生“沉降”。为了防止这种情况，工厂在制造时会将弹簧强行压缩至压并高度（超过屈服点），消除永久变形。这一工序称为“强压处理”或“立定处理”。"
        }
      ],
      faqs: [
        {
          q: "什么是渐进式悬挂 (Progressive Rate)？",
          a: "指弹簧刚度随压缩量增加而变硬。这能保证小颠簸时舒适（软），大坑洼时不触底（硬）。"
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
