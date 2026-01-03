"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageText, useLanguage } from "@/components/language-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: { en: "Home", zh: "首页" } },
  { href: "/tools/calculator", label: { en: "Spring Calculator", zh: "弹簧计算" } },
  { href: "/tools/arc-spring", label: { en: "Arc Spring", zh: "弧形弹簧" } },
  {
    href: "/tools/variable-pitch-compression",
    label: { en: "Variable Pitch", zh: "变节距压缩" },
  },
  { href: "/tools/analysis", label: { en: "Engineering Analysis", zh: "工程分析" } },
  { href: "/production", label: { en: "Production", zh: "生产监控" } },
  { href: "/quality", label: { en: "Quality Management", zh: "质量管理" } },
  { href: "/ppap", label: { en: "PPAP", zh: "PPAP" } },
  { href: "/tools/cad-export", label: { en: "CAD Export", zh: "CAD 导出" } },
  { href: "/about", label: { en: "About", zh: "关于" } },
  { href: "/engineering", label: { en: "Shock Spring Design", zh: "减震弹簧参数化设计" } },
  { href: "/rfq", label: { en: "RFQ", zh: "询价" } },
  { href: "/catalog", label: { en: "Catalog", zh: "产品目录" } },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, toggleLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center text-base font-semibold tracking-tight">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <span className="sr-only">ISRI-SHUANGDI Spring Engineering</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 transition-colors",
                isActive(item.href)
                  ? "bg-slate-900/5 text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {language === "en" ? item.label.en : item.label.zh}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" size="sm" onClick={toggleLanguage} className="text-xs">
            {language === "en" ? "中文" : "EN"}
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <MenuIcon className="size-4" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetHeader>
              <SheetTitle>
                <span className="flex items-center">
                  <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                  <span className="sr-only">ISRI-SHUANGDI Spring Engineering</span>
                </span>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    router.push(item.href);
                  }}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-slate-900/5 text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {language === "en" ? item.label.en : item.label.zh}
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={toggleLanguage} className="w-full">
                {language === "en" ? "切换到中文" : "Switch to English"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
