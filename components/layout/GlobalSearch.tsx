"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Topbar search: jumps straight to an order or customer ID, otherwise searches the orders list. */
export function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (/^ORD-\d{6}$/i.test(q)) router.push(`/orders/${q.toUpperCase()}`);
    else if (/^CUS-\d{4}$/i.test(q)) router.push(`/customers/${q.toUpperCase()}`);
    else router.push(`/orders?q=${encodeURIComponent(q)}`);
    setValue("");
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search orders, customers… (Enter)"
        className="pl-8"
        aria-label="Search orders and customers"
      />
    </form>
  );
}
