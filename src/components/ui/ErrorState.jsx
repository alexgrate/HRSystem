import { AlertTriangle, RefreshCw } from "lucide-react";


export function ErrorState({
  title = "Couldn’t load this",
  message = "Something went wrong while loading. Check your connection and try again.",
  onRetry,
  retrying = false,
  compact = false,
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card text-center ${compact ? "p-8" : "p-12"}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-ink-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-sunken focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" />
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
