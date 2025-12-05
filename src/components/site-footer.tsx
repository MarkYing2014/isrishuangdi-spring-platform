export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-100/80 text-sm text-slate-600">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6">
        <div>
          <p className="font-semibold text-slate-900">
            ISRI-SHUANGDI Spring Technology Co., Ltd.
          </p>
          <p className="text-slate-600">
            High-precision automotive & industrial spring solutions.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          © {year} ISRI-SHUANGDI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
