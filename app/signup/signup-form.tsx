"use client";

import { useActionState } from "react";
import {
  signup,
  signInWithGoogle,
  type AuthFormState,
} from "@/lib/actions/auth";

const inputClasses =
  "mt-1.5 w-full rounded-md border border-rule bg-white px-3 py-2 text-sm text-ink placeholder:text-muted";

export default function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signup,
    undefined
  );

  return (
    <>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClasses}
          />
          <p className="mt-1.5 text-xs text-muted">
            At least 8 characters, with a letter and a number.
          </p>
        </div>
        {state?.message ? (
          <p className="text-sm text-danger" role="alert">
            {state.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-rule" />
        <span className="text-xs text-muted">or</span>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Continue with Google
        </button>
      </form>
    </>
  );
}