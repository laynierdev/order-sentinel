export const DEMO_BANNER_HEIGHT = "1.75rem";

export function DemoBanner() {
  return (
    <div
      role="note"
      className="fixed inset-x-0 top-0 z-50 flex h-7 items-center justify-center bg-amber-100 text-xs font-medium text-amber-900 border-b border-amber-200"
    >
      Demo environment — all data is fictitious
    </div>
  );
}
