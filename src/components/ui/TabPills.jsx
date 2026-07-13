import { motion } from "framer-motion";

// The animated pill tab strip used across the app. `tabs` is
// [{ key, label, Icon? }] — label renders as-is, so pass a node for badges.
// `layoutId` must be unique per page or the pill animates across strips.
export function TabPills({ tabs, active, onChange, layoutId, className = "" }) {
  return (
    <div className={`flex gap-1 overflow-x-auto rounded-xl border border-line/80 bg-card p-1 shadow-sm w-fit max-w-full ${className}`}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        const Icon = t.Icon;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              isActive ? "text-white" : "text-ink-muted"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand to-brand-2"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {Icon && <Icon className="relative h-3.5 w-3.5" />}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
