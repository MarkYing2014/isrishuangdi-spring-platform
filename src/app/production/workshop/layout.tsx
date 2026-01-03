/**
 * Workshop Dashboard Layout
 * Overrides default layout to allow full-width dark theme
 */
export default function WorkshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="!bg-[#0a0a0f] !max-w-none w-full -mx-4 -my-10 px-0 py-0">
      {children}
    </div>
  );
}
