"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageText, useLanguage } from "@/components/language-context";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: { en: "Home", zh: "首页" } },
  { href: "/tools/calculator", label: { en: "Spring Calculator", zh: "弹簧计算" } },
  { href: "/tools/analysis", label: { en: "Engineering Analysis", zh: "工程分析" } },
  { href: "/tools/simulator", label: { en: "Spring Simulator", zh: "弹簧仿真" } },
  { href: "/tools/force-tester", label: { en: "Force Tester", zh: "力-位移测试" } },
  { href: "/tools/cad-export", label: { en: "CAD Export", zh: "CAD 导出" } },
  { href: "/rfq", label: { en: "RFQ", zh: "询价" } },
  { href: "/catalog", label: { en: "Catalog", zh: "产品目录" } },
];

export function MainNav() {
  const pathname = usePathname();
  const { language, toggleLanguage } = useLanguage();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          ISRI-SHUANGDI <span className="hidden sm:inline">Spring Engineering</span>
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

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <MenuIcon className="size-4" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetHeader>
              <SheetTitle>ISRI-SHUANGDI Spring Engineering</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <SheetClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-slate-900/5 text-slate-900"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {language === "en" ? item.label.en : item.label.zh}
                  </Link>
                </SheetClose>
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
