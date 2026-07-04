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
