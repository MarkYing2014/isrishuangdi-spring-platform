"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { LanguageText, useLanguage } from "@/components/language-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: { en: "Home", zh: "首页" } },
  { href: "/tools/calculator", label: { en: "Spring Calculator", zh: "弹簧计算" } },
  { href: "/tools/analysis", label: { en: "Engineering Analysis", zh: "工程分析" } },
  { href: "/tools/cad-export", label: { en: "CAD Export", zh: "CAD 导出" } },
  { href: "/catalog", label: { en: "Catalog", zh: "产品目录" } },
  { href: "/rfq", label: { en: "RFQ", zh: "询价" } },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, toggleLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            ISRI-SHUANGDI
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            <LanguageText en="Spring Engineering Cloud Platform" zh="弹簧工程云平台" />
          </span>
        </div>

        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 transition-colors hover:text-primary",
                isActive(item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {language === "en" ? item.label.en : item.label.zh}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={toggleLanguage} className="text-xs">
            {language === "en" ? "中文" : "EN"}
          </Button>
          <Button asChild className="hidden md:inline-flex">
            <Link href="/rfq">
              <LanguageText en="Start RFQ" zh="发起询价" />
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <MenuIcon className="size-4" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs">
              <div className="flex flex-col gap-6 p-4">
                <div>
                  <p className="font-semibold">ISRI-SHUANGDI</p>
                  <p className="text-sm text-muted-foreground">
                    <LanguageText
                      en="Spring Engineering Cloud Platform"
                      zh="弹簧工程云平台"
                    />
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={toggleLanguage}>
                  {language === "en" ? "中文" : "EN"}
                </Button>
                <div className="flex flex-col gap-2">
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
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {language === "en" ? item.label.en : item.label.zh}
                    </Link>
                  ))}
                </div>
                <Button asChild>
                  <Link href="/rfq">
                    <LanguageText en="Start RFQ" zh="发起询价" />
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
