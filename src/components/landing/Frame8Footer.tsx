"use client";

export function Frame8Footer() {
  return (
    <footer className="w-full bg-background border-t py-12">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-20 text-center space-y-2">
            <div className="text-lg font-semibold tracking-tight">Spring Engineering Operating System</div>
            <div className="text-sm text-muted-foreground">Built for real OEM decisions. Not just calculations.</div>
            <div className="text-xs text-muted-foreground/50 pt-8 font-mono">
                © {new Date().getFullYear()} ISRI-SHUANGDI. All rights reserved.
            </div>
        </div>
    </footer>
  );
}
