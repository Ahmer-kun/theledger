import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AskPanel from "@/components/ask-panel";

export default async function AskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-3xl text-ink">Ask</h1>
      <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
        Answers are built only from the transactions you uploaded, and each one
        lists the transactions it used. If your data can&apos;t answer the
        question, Ledger says so instead of guessing.
      </p>
      <div className="mt-8">
        <AskPanel />
      </div>
    </section>
  );
}
