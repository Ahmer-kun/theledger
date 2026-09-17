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

export function inferFileKind(mimeType: string, filename: string): FileKind | null {
  const byMime = ALLOWED_MIME[mimeType];
  if (byMime) return byMime as FileKind;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const byExt = EXTENSIONS[ext];
  if (byExt) return byExt as FileKind;
  return null;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export const ACCEPT = ".jpg,.jpeg,.png,.webp,.csv,.pdf,image/jpeg,image/png,image/webp,text/csv,application/pdf";