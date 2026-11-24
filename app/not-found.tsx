import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-1.75rem)] flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <SearchX className="size-6 text-slate-500" aria-hidden />
      </div>
      <h1 className="font-heading text-2xl font-semibold text-brand-900">Record not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The order, customer or page you are looking for does not exist in this demo dataset.
      </p>
      <Link href="/dashboard" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </main>
  );
}
