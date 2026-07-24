import api from "../services/api";

export async function previewDocument(id, toast) {
  const win = typeof window !== "undefined" ? window.open("", "_blank", "noopener") : null;
  try {
    const blob = await api.get(`/api/documentations/${id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(blob);
    if (win) win.location = url;
    else window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    if (win) win.close();
    console.error("[documentPreview] failed:", err);
    toast?.error?.(err?.error?.message || err?.message || "Could not open the document. Please try again.");
  }
}
