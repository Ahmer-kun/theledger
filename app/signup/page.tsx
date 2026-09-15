import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up — Ledger",
  description: "Create a Ledger account.",
};

export default function SignupPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl text-ink">Create your account</h1>
      <div className="mt-8 rounded-lg border border-rule bg-surface p-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:text-accent-ink">
          Log in
        </Link>
      </p>
    </section>
  );
}