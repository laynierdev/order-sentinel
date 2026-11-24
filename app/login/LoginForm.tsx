"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Demo login: any credentials are accepted.
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center justify-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-brand-800">
          <ShieldCheck className="size-5 text-brand-200" aria-hidden />
        </div>
        <span className="font-heading text-2xl font-semibold text-brand-900">Order Sentinel</span>
      </div>
      <Card>
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Suspicious Order Monitoring for controlled substances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="compliance@demo-distributor.test" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" defaultValue="demo-password" autoComplete="off" />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">Demo access — any credentials work.</p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
