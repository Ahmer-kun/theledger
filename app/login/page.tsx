import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Log in — Ledger",
  description: "Log in to Ledger.",
};

export default function LoginPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl text-ink">Log in</h1>
      <div className="mt-8 rounded-lg border border-rule bg-surface p-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-accent hover:text-accent-ink">
          Create one
        </Link>
      </p>
    </section>
  );
}