export function getEmployeeName(user, fallback = "—") {
  if (!user) return fallback;
  const bio = user.employee_biodata || user.biodata || {};
  const full = [bio.firstname, bio.lastname].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.email) return user.email.split("@")[0];
  return fallback;
}

export function getInitials(name) {
  return (
    String(name || "")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

// One resolver for "whose row is this?" across the leave/approvals/audit
// tables: embedded person object → *_name field → staff-roster lookup by any
// known id → email → shortened id → fallback.
export function resolvePersonName(row, staff = [], fallback = "Employee") {
  const embedded = row.employee || row.user || row.requester || row.actor || row.performed_by_employee;
  if (embedded && typeof embedded === "object") {
    const n = getEmployeeName(embedded, "");
    if (n) return n;
  }
  const direct = row.employee_name || row.actor_name || row.user_full_name || row.snapshot?.employee_name;
  if (direct) return direct;
  const id =
    row.employee_id || row.actor_id || row.performed_by_employee_id ||
    row.performed_by || row.user_id || row.uploaded_by_employee_id || null;
  const s = id ? staff.find((u) => u.id === id || u.auth_id === id) : null;
  if (s) return getEmployeeName(s);
  const email = row.employee_email || row.actor_email || row.email;
  if (email) return email;
  return id ? `${String(id).slice(0, 8)}…` : fallback;
}
