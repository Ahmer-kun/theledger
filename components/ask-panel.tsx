"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatCurrency, formatDate } from "@/lib/format";

interface Source {
  merchant: string;
  transaction_date: string;
  amount: number;
  category: string | null;
  content_text: string;
  similarity: number;
}

interface Exchange {
  id: number;
  question: string;
  status: "pending" | "done" | "error";
  answer?: string;
  sources?: Source[];
  error?: string;
}

const EXAMPLES = [
  "How much did I spend on groceries last month?",
  "What subscriptions am I paying for?",
  "What was my biggest purchase?",
];

function inline(text: string, keyPrefix: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-b${i}`} className="font-medium">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function AnswerText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((item, i) => (
          <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bullets.push(trimmed.slice(2));
      return;
    }
    flush();
    if (trimmed === "") {
      blocks.push(<div key={`sp-${i}`} className="h-2" aria-hidden="true" />);
      return;
    }
    blocks.push(<p key={`p-${i}`}>{inline(trimmed, `p-${i}`)}</p>);
  });
  flush();

  return <div className="text-sm leading-relaxed text-ink">{blocks}</div>;
}

function Sources({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-4 border-l-2 border-accent/40 bg-accent/[0.04] px-3 py-2.5">
      <p className="text-xs font-medium text-accent-ink">
        Sources: the transactions behind this answer
      </p>
      <ul className="mt-1.5 divide-y divide-rule/70">
        {sources.map((source) => (
          <li
            key={`${source.merchant}-${source.transaction_date}-${source.amount}`}
            className="flex flex-wrap items-baseline gap-x-3 py-1 text-sm"
          >
            <span className="min-w-[7rem] flex-1 truncate text-ink">
              {source.merchant}
            </span>
            <span className="text-muted">
              {formatDate(source.transaction_date)}
            </span>
            <span className="tabular-nums text-ink">
              {formatCurrency(source.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AskPanel() {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [exchanges]);

  async function ask(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    const id = nextId.current++;
    setQuestion("");
    setBusy(true);
    setExchanges((list) => [
      ...list,
      { id, question: text, status: "pending" },
    ]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setExchanges((list) =>
          list.map((ex) =>
            ex.id === id
              ? {
                  ...ex,
                  status: "error",
                  error:
                    body?.error ??
                    "Couldn't reach the assistant. Try again in a moment.",
                }
              : ex,
          ),
        );
        return;
      }

      setExchanges((list) =>
        list.map((ex) =>
          ex.id === id
            ? {
                ...ex,
                status: "done",
                answer: body.answer,
                sources: body.sources ?? [],
              }
            : ex,
        ),
      );
    } catch {
      setExchanges((list) =>
        list.map((ex) =>
          ex.id === id
            ? {
                ...ex,
                status: "error",
                error: "Couldn't reach the assistant. Check your connection and try again.",
              }
            : ex,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      {exchanges.length === 0 ? (
        <div className="rounded-lg border border-rule bg-surface p-5">
          <p className="text-sm leading-relaxed text-ink">
            Ask about your own spending in plain English. Answers are built only
            from the transactions you&apos;ve uploaded, and every answer lists
            the transactions it used.
          </p>
          <p className="mt-4 text-xs font-medium text-muted">
            Try one of these
          </p>
          <ul className="mt-2 space-y-2">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => ask(example)}
                  className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-left text-sm text-ink transition-colors hover:border-accent/50 hover:bg-accent/5"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div aria-live="polite" className="divide-y divide-rule">
        {exchanges.map((exchange) => (
          <section key={exchange.id} className="py-5">
            <p className="text-xs font-medium text-muted">You asked</p>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {exchange.question}
            </p>

            <div className="mt-3">
              {exchange.status === "pending" ? (
                <p className="text-sm text-muted">
                  Reading your transactions…
                </p>
              ) : exchange.status === "error" ? (
                <p role="alert" className="text-sm text-danger">
                  {exchange.error}
                </p>
              ) : (
                <>
                  <AnswerText text={exchange.answer ?? ""} />
                  <Sources sources={exchange.sources ?? []} />
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="sticky bottom-0 mt-4 flex gap-2 border-t border-rule bg-paper/95 py-3 backdrop-blur"
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask a question about your spending
        </label>
        <input
          id="ask-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your spending…"
          maxLength={500}
          className="min-w-0 flex-1 rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length === 0}
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60"
        >
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
