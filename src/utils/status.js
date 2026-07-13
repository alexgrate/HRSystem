// Status → badge chip classes, shared by every request/approval table.
// startsWith, not includes — "pending_approval" must read as pending, not
// approved. Green only for genuinely approved, red for terminal negatives.
export const statusBadgeCls = (status) => {
  const s = String(status || "pending").toLowerCase();
  if (s.startsWith("approv")) return "bg-emerald-50 text-emerald-700";
  if (s.startsWith("reject") || s.startsWith("decl") || s.startsWith("cancel")) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
};
