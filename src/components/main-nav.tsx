"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LanguageLabel = { en: string; zh: string };

type NavItem = {
  href?: string;
  label: LanguageLabel;
  roles?: string[]; // "user" | "leader" | "admin"
  items?: NavItem[];
};

const navItems: NavItem[] = [
  { href: "/", label: { en: "Home", zh: "首页" } },
  {
    label: { en: "Tools", zh: "工具箱" },
    items: [
      { href: "/tools/calculator", label: { en: "Spring Calculator", zh: "弹簧计算" } },
      { href: "/tools/arc-spring", label: { en: "Arc Spring", zh: "弧形弹簧" } },
      {
        href: "/tools/variable-pitch-compression",
        label: { en: "Variable Pitch", zh: "变节距压缩" },
      },
      { href: "/engineering", label: { en: "Shock Spring Design", zh: "减震弹簧参数化设计" } },
      { href: "/tools/analysis", label: { en: "Engineering Analysis", zh: "工程分析" } },
      { href: "/tools/cad-export", label: { en: "CAD Export", zh: "CAD 导出" } },
    ]
  },
  { href: "/production", label: { en: "Production", zh: "生产监控" } },
  { href: "/quality", label: { en: "Quality Management", zh: "质量管理" } },
  { href: "/ppap", label: { en: "PPAP", zh: "PPAP" } },
  { href: "/rfq", label: { en: "RFQ", zh: "询价" } },
  {
    label: { en: "Training", zh: "培训" },
    items: [
      { 
        href: "/training/cnc", 
        label: { en: "CNC Training", zh: "CNC 培训" },
        roles: ["user", "leader", "admin"]
      },
      { 
        href: "/training/progress", 
        label: { en: "Progress", zh: "进度总览" },
        roles: ["leader", "admin"]
      },
      { 
        href: "/training/admin/audit", 
        label: { en: "Audit Log", zh: "审计日志" },
        roles: ["admin"]
      },
    ]
  },
  { href: "/about", label: { en: "About", zh: "关于" } },
];

export function MainNav() {
  const pathname = usePathname();
  const { language, toggleLanguage } = useLanguage();

  // Demo: simulate "admin" role to show all items
  const currentUserRole = "admin"; 

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const t = (text: LanguageLabel) => (language === "zh" ? text.zh : text.en);

  const filterItem = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(currentUserRole);
  };

  const renderNavItem = (item: NavItem) => {
    // Top-level dropdown
    if (item.items) {
      const visibleChildren = item.items.filter(filterItem);
      if (visibleChildren.length === 0) return null;

      const isChildActive = visibleChildren.some(child => child.href && isActive(child.href));

      return (
        <DropdownMenu key={t(item.label)}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-1 h-14 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
                isChildActive ? "text-primary bg-muted/50" : "text-muted-foreground"
              )}
            >
              {t(item.label)}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {visibleChildren.map((child) => (
              <DropdownMenuItem key={child.href} asChild>
                <Link 
                  href={child.href!}
                  className={cn(
                    "cursor-pointer",
                    isActive(child.href!) && "bg-muted text-primary"
                  )}
                >
                  {t(child.label)}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Standard link
    if (!filterItem(item)) return null;

    return (
      <Link
        key={item.href}
        href={item.href!}
        className={cn(
          "flex items-center h-14 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
          isActive(item.href!) ? "text-foreground" : "text-muted-foreground/60"
        )}
      >
        {t(item.label)}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="container flex h-14 items-center gap-4">
        <div className="flex items-center gap-6 overflow-hidden min-w-0">
          {/* Logo - Fixed */}
          <Link href="/" className="flex-shrink-0 mr-6 flex items-center">
            <img src="/logo.png" alt="ISRI" className="h-10 w-auto" />
          </Link>

          {/* Nav Items - Scrollable */}
          <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar mask-gradient-right pr-4">
            {navItems.map(renderNavItem)}
          </nav>
        </div>
        
        {/* Language Toggle - Fixed right */}
        <div className="flex items-center gap-2 flex-shrink-0 border-l pl-2 ml-auto sm:ml-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="w-9 px-0"
          >
            {language === "en" ? "CN" : "EN"}
          </Button>
        </div>
      </div>
    </header>
  );
}
