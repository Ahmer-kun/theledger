"use client";

import { useRef, useState, useTransition } from "react";
import {
  uploadFile,
  extractFromStored,
  saveExtractions,
} from "@/lib/actions/ingest";
import { CATEGORIES, type DraftRow } from "@/types";
import { ACCEPT, MAX_FILE_SIZE, inferFileKind } from "@/lib/file-kind";

type Phase = "idle" | "uploading" | "extracting" | "review" | "saving" | "saved" | "error";

interface ReviewDraft {
  storagePath: string;
  sourceType: "receipt" | "statement_line";
  filename: string;
  rows: DraftRow[];
  confidence: "high" | "low";
  notes?: string;
  skipped?: { line: number; reason: string }[];
}

const KIND_LABEL: Record<string, string> = {
  image: "Receipt photo",
  csv: "CSV statement",
  pdf: "PDF statement",
};

const inputClasses =
  "mt-0.5 w-full rounded-md border border-rule bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-muted";

export default function UploadPanel() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ count: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const kind = file ? inferFileKind(file.type, file.name) : null;

  function acceptFile(f: File): string | null {
    if (f.size > MAX_FILE_SIZE) {
      return "That file is larger than 8 MB. Upload a smaller one.";
    }
    if (!inferFileKind(f.type, f.name)) {
      return "Unsupported file type. Use a JPEG, PNG, or WebP image, or a CSV or PDF.";
    }
    return null;
  }

  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const problem = acceptFile(f);
    if (problem) {
      setErrorMessage(problem);
      setPhase("error");
      return;
    }
    setFile(f);
    setErrorMessage(null);
    setPhase("idle");
  }

  function handleSubmit() {
    if (!file) return;
    startTransition(async () => {
      setPhase("uploading");
      const upForm = new FormData();
      upForm.append("file", file);
      const up = await uploadFile(upForm);
      if (up.phase === "error") {
        setErrorMessage(up.message);
        setPhase("error");
        return;
      }

      setPhase("extracting");
      const exForm = new FormData();
      exForm.append("storagePath", up.storagePath);
      exForm.append("kind", up.kind);
      const ex = await extractFromStored(exForm);
      if (ex.phase === "error") {
        setErrorMessage(ex.message);
        setPhase("error");
        return;
      }

      setDraft({
        storagePath: ex.storagePath,
        sourceType: ex.sourceType,
        filename: ex.filename,
        rows: ex.rows,
        confidence: ex.confidence,
        notes: ex.notes,
        skipped: ex.skipped,
      });
      setPhase("review");
    });
  }

  function handleSave() {
    if (!draft) return;
    startTransition(async () => {
      setPhase("saving");
      const saveForm = new FormData();
      saveForm.append("payload", JSON.stringify(draft.rows));
      saveForm.append("storagePath", draft.storagePath);
      saveForm.append("sourceType", draft.sourceType);
      const result = await saveExtractions(saveForm);
      if (result.phase === "error") {
        setErrorMessage(result.message);
        setPhase("error");
        return;
      }
      setSaved({ count: result.count });
      setPhase("saved");
    });
  }

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        rows: d.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      };
    });
  }

  function removeRow(index: number) {
    if (!draft) return;
    const rows = draft.rows.filter((_, i) => i !== index);
    if (rows.length === 0) {
      reset();
    } else {
      setDraft({ ...draft, rows });
    }
  }

  function reset() {
    setPhase("idle");
    setFile(null);
    setDraft(null);
    setErrorMessage(null);
    setSaved(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (phase === "error") {
    return (
      <div className="rounded-lg border border-danger/40 bg-surface p-6" role="alert">
        <p className="text-sm font-medium text-danger">{errorMessage}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Start over
        </button>
      </div>
    );
  }

  if (phase === "saved") {
    return (
      <div className="rounded-lg border border-rule bg-surface p-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <h2 className="font-serif text-2xl text-ink">Saved.</h2>
        </div>
        <p className="mt-3 text-sm text-muted">
          {saved && saved.count === 1
            ? "Your transaction is saved and ready to search."
            : `${saved?.count ?? 0} transactions are saved and ready to search.`}
        </p>
        <p className="mt-1 text-sm text-muted">
          Categories are editable — nothing is locked in.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
        >
          Add another file
        </button>
      </div>
    );
  }

  if (phase === "uploading" || phase === "extracting") {
    return (
      <div className="rounded-lg border border-rule bg-surface p-6" role="status">
        <p className="text-sm font-medium text-ink">
          {phase === "uploading" ? "Uploading…" : "Reading your file…"}
        </p>
        <p className="mt-1 truncate text-sm text-muted">{file?.name}</p>
        <p className="mt-3 text-sm text-muted">
          {phase === "uploading"
            ? "Sending your file to your private storage."
            : kind === "csv"
              ? "Parsing the statement rows — no AI involved."
              : "Extracting fields with your vision model. This takes a few seconds."}
        </p>
      </div>
    );
  }

  if (phase === "review" || phase === "saving") {
    if (!draft) return null;
    const isReceipt = draft.sourceType === "receipt";
    return (
      <div className="rounded-lg border border-rule bg-surface p-6">
        <h2 className="font-serif text-2xl text-ink">
          {isReceipt ? "Check what we read" : "Check what we parsed"}
        </h2>
        {draft.confidence === "low" && draft.notes ? (
          <p className="mt-2 text-sm text-accent-ink">{draft.notes}</p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {isReceipt
              ? "Everything is editable — category included."
              : `${draft.rows.length} transaction${draft.rows.length === 1 ? "" : "s"} found. Review the categories.`}
          </p>
        )}
        <p className="mt-1 truncate text-xs text-muted">{draft.filename}</p>

        {draft.skipped && draft.skipped.length > 0 ? (
          <div className="mt-4 rounded-md border border-rule bg-paper p-3 text-sm text-muted">
            Skipped {draft.skipped.length} row{draft.skipped.length === 1 ? "" : "s"} that couldn&apos;t be
            read: {draft.skipped.map((s) => s.reason).join(" ")}
          </div>
        ) : null}

        <div className="mt-5 max-h-96 divide-y divide-rule overflow-y-auto">
          {draft.rows.map((row, i) => (
            <div key={i} className="py-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="min-w-0 flex-1">
                  <span className="text-xs text-muted">Merchant</span>
                  <input
                    type="text"
                    value={row.merchant}
                    onChange={(e) => updateRow(i, { merchant: e.target.value })}
                    className={inputClasses}
                  />
                </label>
                <label className="sm:w-36">
                  <span className="text-xs text-muted">Date</span>
                  <input
                    type="date"
                    value={row.transaction_date}
                    onChange={(e) => updateRow(i, { transaction_date: e.target.value })}
                    className={inputClasses}
                  />
                </label>
                <label className="sm:w-28">
                  <span className="text-xs text-muted">Amount</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.amount === 0 ? "" : String(row.amount)}
                    onChange={(e) =>
                      updateRow(i, { amount: Number(e.target.value) || 0 })
                    }
                    className={`${inputClasses} tabular-nums text-right`}
                  />
                </label>
              </div>
              <label className="mt-2 block">
                <span className="text-xs text-muted">Category</span>
                <select
                  value={row.category ?? ""}
                  onChange={(e) =>
                    updateRow(i, {
                      category: (e.target.value as DraftRow["category"]) || null,
                    })
                  }
                  className={inputClasses}
                >
                  <option value="">None</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              {row.line_items && row.line_items.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-rule pt-2 text-sm text-muted">
                  {row.line_items.map((li, j) => (
                    <li key={j} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{li.label}</span>
                      <span className="tabular-nums">${li.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="mt-2 text-xs text-muted hover:text-ink"
              >
                Remove this row
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-60"
          >
            {isPending
              ? "Saving…"
              : isReceipt
                ? "Save"
                : `Save ${draft.rows.length} transaction${draft.rows.length === 1 ? "" : "s"}`}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-60"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`block cursor-pointer rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/[0.04]" : "border-rule hover:border-muted"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className="block font-medium text-ink">
          Drop a file here, or click to choose
        </span>
        <span className="mt-1.5 block text-sm text-muted">
          Receipt photo (JPEG, PNG, WebP) or a bank statement (CSV, PDF). Max 8 MB.
        </span>
      </label>

      {file && kind ? (
        <div className="mt-4 rounded-lg border border-rule bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{file.name}</p>
              <p className="text-sm text-muted">
                {KIND_LABEL[kind]} ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-sm text-muted hover:text-ink"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-60"
          >
            Upload &amp; extract
          </button>
        </div>
      ) : null}
    </div>
  );
}