import { apiBaseUrl, ApiError, type ApiErrorBody } from "@/lib/api/client";

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    alert("Nothing to export.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(header);
  if (m?.[1]) return decodeURIComponent(m[1].replace(/"/g, ""));
  return fallback;
}

/** Download a CSV (or other blob) from an admin GET export path under /api/v1. */
export async function downloadAdminExport(path: string, fallbackFilename: string) {
  const url = `${apiBaseUrl()}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, body as ApiErrorBody | null, res.statusText || "Export failed");
  }
  const blob = await res.blob();
  const name = filenameFromDisposition(res.headers.get("content-disposition"), fallbackFilename);
  triggerBlobDownload(blob, name);
}
