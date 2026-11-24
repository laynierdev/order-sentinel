"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Menu,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Monitoring",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/orders", label: "Orders", icon: ListOrdered },
      { href: "/review", label: "Review Queue", icon: ClipboardCheck },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/import", label: "Import", icon: Upload },
    ],
  },
  {
    section: "Administration",
    items: [{ href: "/settings/rules", label: "Rules", icon: SlidersHorizontal }],
  },
];

function Brand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-brand-800 px-5">
      <ShieldCheck className="size-5 text-brand-200" aria-hidden />
      <span className="font-heading text-lg font-semibold text-white">Order Sentinel</span>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main">
      {NAV.map((group) => (
        <div key={group.section}>
          <p className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-brand-200/70 uppercase">{group.section}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active ? "bg-brand-700 text-white" : "hover:bg-brand-800 hover:text-white",
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-brand-200" : "text-brand-200/70")} aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Footer() {
  return <div className="border-t border-brand-800 px-5 py-3 text-[11px] text-brand-200/70">v0.1 · Demo build</div>;
}

/** Fixed sidebar for large screens. */
export function Sidebar() {
  return (
    <aside className="fixed top-7 bottom-0 left-0 z-40 hidden w-60 flex-col bg-brand-900 text-brand-100 lg:flex">
      <Brand />
      <SidebarNav />
      <Footer />
    </aside>
  );
}

/** Hamburger + slide-in navigation for screens narrower than `lg`. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 gap-0 border-brand-800 bg-brand-900 p-0 text-brand-100 sm:max-w-64">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand />
          <SidebarNav onNavigate={() => setOpen(false)} />
          <Footer />
        </SheetContent>
      </Sheet>
    </>
  );
}
