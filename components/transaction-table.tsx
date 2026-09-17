"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTransaction,
  updateTransaction,
} from "@/lib/actions/transactions";
import { CATEGORIES, type Category, type Receipt } from "@/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface Props {
  rows: Receipt[];
  editable?: boolean;
  deletable?: boolean;
  emptyMessage?: string;
}

interface Draft {
  merchant: string;
  transaction_date: string;
  amount: string;
  category: Category | "";
}

const field =
  "w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted";

export default function TransactionTable({
  rows,
  editable = true,
  deletable = false,
  emptyMessage = "No transactions yet.",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="py-6 text-sm text-muted">{emptyMessage}</p>;
  }

  function beginEdit(row: Receipt) {
    setError(null);
    setConfirmId(null);
    setEditingId(row.id);
    setDraft({
      merchant: row.merchant,
      transaction_date: row.transaction_date,
      amount: String(row.amount),
      category: row.category ?? "",
    });
  }

  function save(id: string) {
    if (!draft) return;
    const formData = new FormData();
    formData.set("id", id);
    formData.set("merchant", draft.merchant);
    formData.set("transaction_date", draft.transaction_date);
    formData.set("amount", draft.amount);
    formData.set("category", draft.category);
    startTransition(async () => {
      const result = await updateTransaction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditingId(null);
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      const result = await deleteTransaction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirmId(null);
      router.refresh();
    });
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ul>
        {rows.map((row) => {
          const editing = editingId === row.id && draft !== null;
          return (
            <li key={row.id} className="border-b border-rule py-3">
              {editing && draft ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_10rem_8rem]">
                    <label className="block">
                      <span className="text-xs text-muted">Merchant</span>
                      <input
                        className={field}
                        value={draft.merchant}
                        onChange={(e) =>
                          setDraft({ ...draft, merchant: e.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted">Date</span>
                      <input
                        type="date"
                        className={field}
                        value={draft.transaction_date}
                        onChange={(e) =>
                          setDraft({ ...draft, transaction_date: e.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted">Amount</span>
                      <input
                        inputMode="decimal"
                        className={`${field} tabular-nums text-right`}
                        value={draft.amount}
                        onChange={(e) =>
                          setDraft({ ...draft, amount: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="block sm:max-w-xs">
                    <span className="text-xs text-muted">Category</span>
                    <select
                      className={field}
                      value={draft.category}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          category: e.target.value as Draft["category"],
                        })
                      }
                    >
                      <option value="">None</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => save(row.id)}
                      disabled={pending}
                      className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60"
                    >
                      {pending ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                        setError(null);
                      }}
                      disabled={pending}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="min-w-[8rem] flex-1 truncate text-sm font-medium text-ink">
                    {row.merchant}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {formatDate(row.transaction_date)}
                  </span>
                  <span className="hidden w-36 shrink-0 truncate text-sm text-muted sm:block">
                    {row.category ?? "—"}
                  </span>
                  <span className="ml-auto w-24 shrink-0 text-right text-sm tabular-nums text-ink sm:ml-0">
                    {formatCurrency(row.amount)}
                  </span>
                  {editable || deletable ? (
                    <span className="flex shrink-0 items-center gap-3">
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => beginEdit(row)}
                          className="text-sm text-muted transition-colors hover:text-ink"
                        >
                          Edit
                        </button>
                      ) : null}
                      {deletable ? (
                        confirmId === row.id ? (
                          <span className="flex items-center gap-2 text-sm">
                            <button
                              type="button"
                              onClick={() => remove(row.id)}
                              disabled={pending}
                              className="text-danger disabled:opacity-60"
                            >
                              {pending ? "Deleting…" : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              className="text-muted hover:text-ink"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmId(row.id)}
                            className="text-sm text-muted transition-colors hover:text-ink"
                          >
                            Delete
                          </button>
                        )
                      ) : null}
                    </span>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
