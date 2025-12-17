"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type HoverGlassCardProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon: React.ReactNode;
  href?: string;
  excludeGlow?: boolean;
  footer?: React.ReactNode;
  className?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setReduced(!!mql.matches);
    update();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }

    const legacyMql = mql as unknown as {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    legacyMql.addListener?.(update);
    return () => legacyMql.removeListener?.(update);
  }, []);

  return reduced;
}

export function HoverGlassCard({
  title,
  description,
  icon,
  href,
  excludeGlow,
  footer,
  className,
}: HoverGlassCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (prefersReducedMotion) return;
      const el = e.currentTarget;
      el.style.setProperty("--pointer-x", "0");
      el.style.setProperty("--pointer-y", "0");
    },
    [prefersReducedMotion]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (prefersReducedMotion) return;

      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) return;

      const x01 = (e.clientX - rect.left) / rect.width;
      const y01 = (e.clientY - rect.top) / rect.height;

      const x = Math.max(-1, Math.min(1, x01 * 2 - 1));
      const y = Math.max(-1, Math.min(1, y01 * 2 - 1));

      el.style.setProperty("--pointer-x", String(x));
      el.style.setProperty("--pointer-y", String(y));
    },
    [prefersReducedMotion]
  );

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--pointer-x", "-10");
    el.style.setProperty("--pointer-y", "-10");
  }, []);

  const card = (
    <article
      className={cn(
        "hover-glass-card isolate relative overflow-hidden rounded-xl border bg-background/55 text-card-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:-translate-y-0.5 active:scale-[0.995]",
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      data-exclude={excludeGlow ? "true" : "false"}
      style={
        {
          "--pointer-x": "-10",
          "--pointer-y": "-10",
        } as React.CSSProperties
      }
    >
      <div className={cn("hover-glass-card__content relative z-10 px-6 py-6")}> 
        <div className={cn("hover-glass-card__header flex items-start justify-between gap-4")}> 
          <div className={cn("flex items-center gap-3 min-w-0")}> 
            <div
              className={cn(
                "hover-glass-card__iconWrap flex size-10 items-center justify-center rounded-xl border bg-background shadow-sm"
              )}
              aria-hidden={true}
            >
              <span className="text-muted-foreground transition-colors group-hover:text-primary">{icon}</span>
            </div>
            <div className={cn("hover-glass-card__title text-base font-semibold min-w-0")}>{title}</div>
          </div>

          <ArrowRight className="mt-1 size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        {description ? (
          <div className={cn("hover-glass-card__description pt-0")}> 
            <p className="text-lg font-semibold text-foreground">{description}</p>
          </div>
        ) : null}

        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </article>
  );

  if (!href) return card;

  return (
    <Link href={href} className="hover-glass-card__link group block">
      {card}
    </Link>
  );
}

export default HoverGlassCard;
