import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import UploadPanel from "@/components/upload-panel";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <section className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-3xl text-ink">
        Add a statement or receipt
      </h1>
      <p className="mt-2 max-w-md text-base leading-relaxed text-muted">
        Upload a receipt photo or a bank statement in CSV or PDF. Ledger reads
        it and turns it into a searchable record you can ask about.
      </p>
      <div className="mt-8">
        <UploadPanel />
      </div>
    </section>
  );
}
