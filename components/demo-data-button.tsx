"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadDemoData } from "@/lib/actions/demo";

export default function DemoDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    setMessage(null);
    startTransition(async () => {
      const result = await loadDemoData();
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={load}
        disabled={pending}
        className="rounded-md border border-rule bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {pending ? "Loading demo data…" : "Load demo data"}
      </button>
      {message ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
