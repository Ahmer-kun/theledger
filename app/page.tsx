export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-24 sm:px-6 sm:pt-32">
      <h1 className="max-w-xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        Every transaction, findable.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Upload receipt photos and bank statements. Ledger turns them into a
        searchable record of your spending and answers plain-English questions
        about it, citing the transactions it used.
      </p>
    </section>
  );
}