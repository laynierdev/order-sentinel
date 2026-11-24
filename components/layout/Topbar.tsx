import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { DEMO_TODAY, formatDate } from "@/lib/format";
import { GlobalSearch } from "./GlobalSearch";
import { MobileNav } from "./Sidebar";

export function Topbar() {
  return (
    <header className="sticky top-7 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 sm:px-6">
      <MobileNav />
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-4 text-sm">
        <span className="hidden whitespace-nowrap text-muted-foreground xl:inline">
          Business date: {formatDate(`${DEMO_TODAY}T12:00:00Z`)}
        </span>
        <Bell className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">CO</div>
          <div className="hidden leading-tight whitespace-nowrap lg:block">
            <p className="font-medium">Compliance Officer</p>
            <p className="text-xs text-muted-foreground">Demo Distributor, Inc.</p>
          </div>
        </div>
        <Link href="/login" className="text-muted-foreground hover:text-foreground" aria-label="Sign out" title="Sign out">
          <LogOut className="size-4" />
        </Link>
      </div>
    </header>
  );
}
