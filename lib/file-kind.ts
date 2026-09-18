export const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "text/csv": "csv",
  "application/pdf": "pdf",
};

const EXTENSIONS: Record<string, string> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  csv: "csv",
  pdf: "pdf",
};

export type FileKind = "image" | "csv" | "pdf";

/** Contiguous binary signatures — JPEG, PNG, PDF. */
const MAGIC: Array<[FileKind, number[]]> = [
  ["image", [0xff, 0xd8, 0xff]],
  ["image", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["pdf", [0x25, 0x50, 0x44, 0x46]],
];

/** WebP: "RIFF" <4-byte size> "WEBP". */
function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  return (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  );
}

/**
 * Identify a file's kind from its content, not its extension or declared
 * MIME type. Returns null for anything that is neither a recognized
 * image/PDF signature nor printable text. Text (no binary signature) is
 * treated as CSV — other text formats are rejected at the declared-type check.
 */
export function sniffFileKind(bytes: Uint8Array): FileKind | null {
  for (const [kind, magic] of MAGIC) {
    let matches = bytes.length >= magic.length;
    for (let i = 0; matches && i < magic.length; i++) {
      matches = bytes[i] === magic[i];
    }
    if (matches) return kind;
  }
  if (isWebp(bytes)) return "image";

  // Anything without a recognized signature must be human-readable text: no
  // NUL bytes and no stray control characters. This rejects executables,
  // archives, and other binaries masquerading as CSV.
  const head = bytes.subarray(0, 4096);
  for (const byte of head) {
    if (byte === 0x00) return null;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) return null;
  }
  return "csv";
}

/** Concrete MIME type from content, for image bytes. */
export function mimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (isWebp(bytes)) return "image/webp";
  return null;
}

export function inferFileKind(mimeType: string, filename: string): FileKind | null {
  const byMime = ALLOWED_MIME[mimeType];
  if (byMime) return byMime as FileKind;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const byExt = EXTENSIONS[ext];
  if (byExt) return byExt as FileKind;
  return null;
}

export type ReconciliationError = "unrecognized" | "mismatch";

/**
 * Decide the trustable kind for an upload. Content sniffing wins over the
 * browser-declared MIME type or extension:
 *   - unrecognized -> the bytes are not a supported image/PDF/CSV at all.
 *   - mismatch     -> the bytes are a supported type but the name/MIME claims
 *                     something else (classic MIME-tampering or rename).
 *   - otherwise    -> the sniffed kind is used, even when declared is null
 *                     (e.g. a browser sent application/octet-stream).
 */
export type ReconciliationResult =
  | { ok: true; kind: FileKind }
  | { ok: false; error: ReconciliationError };

/**
 * Decide the trustable kind for an upload. Content sniffing wins over the
 * browser-declared MIME type or extension:
 *   - unrecognized -> the bytes are not a supported image/PDF/CSV at all.
 *   - mismatch     -> the bytes are a supported type but the name/MIME claims
 *                     something else (classic MIME-tampering or rename).
 *   - otherwise    -> ok:true, the sniffed kind is used even when declared is
 *                     null (e.g. a browser sent application/octet-stream).
 */
export function reconcileFileKind(
  declared: FileKind | null,
  sniffed: FileKind | null,
): ReconciliationResult {
  if (!sniffed) return { ok: false, error: "unrecognized" };
  if (declared && declared !== sniffed) return { ok: false, error: "mismatch" };
  return { ok: true, kind: sniffed };
}

/**
 * The concrete MIME type an upload *claims* to be, when the claim is specific
 * enough to matter: a known image MIME type or a known image file extension.
 * Returns null when the claim is generic (application/octet-stream, no useful
 * extension), which means content should be trusted alone.
 */
export function claimedImageMime(mimeType: string, filename: string): string | null {
  const mime = mimeType.toLowerCase();
  if (
    mime === "image/jpeg" || mime === "image/jpg" ||
    mime === "image/png" || mime === "image/webp"
  ) {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export const ACCEPT = ".jpg,.jpeg,.png,.webp,.csv,.pdf,image/jpeg,image/png,image/webp,text/csv,application/pdf";