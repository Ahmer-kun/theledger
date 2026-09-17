import UploadPanel from "@/components/upload-panel";

export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
      <h1 className="font-serif text-4xl text-ink">Add a statement or receipt</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
        Upload a receipt photo or a bank statement in CSV or PDF. Ledger reads
        it and turns it into a searchable record.
      </p>
      <div className="mt-8">
        <UploadPanel />
      </div>
    </section>
  );
}