// Single source of truth for deriving an employee's display name.
// The backend surfaces the name under `employee_biodata` on some endpoints
// and `biodata` on others; always handle both plus the email fallback.
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
