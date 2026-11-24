import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-1.75rem)] items-center justify-center bg-slate-100 px-4">
      <LoginForm />
    </main>
  );
}
