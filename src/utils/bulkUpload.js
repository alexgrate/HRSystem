const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

export function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getValueByAliases(record, aliases = []) {
  if (!record || typeof record !== "object") return undefined;
  const keyMap = new Map(Object.keys(record).map((key) => [normalizeHeader(key), key]));
  for (const alias of aliases) {
    const actual = keyMap.get(normalizeHeader(alias));
    if (!actual) continue;
    const value = record[actual];
    if (value !== undefined && value !== null && `${value}`.trim() !== "") return value;
  }
  return undefined;
}

export function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return TRUE_VALUES.has(String(value).trim().toLowerCase());
}

export function toNumber(value) {
  if (value === undefined || value === null || value === "") return "";
  let cleaned = value;
  if (typeof value === "string") {
    // Tolerate spreadsheet formatting: thousands separators, spaces, and a
    // leading currency symbol (₦450,000 / $1,200.50 / "1 200"). Genuinely
    // non-numeric input still returns "" so the caller can flag it.
    cleaned = value.replace(/[,\s]/g, "").replace(/^[^\d.-]+/, "");
    if (cleaned === "") return "";
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : "";
}

export function parseDocList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    // JSON imports may carry plain strings — the API only accepts
    // { name, is_mandatory } objects, so normalize both shapes.
    return value
      .map((item) =>
        typeof item === "string"
          ? { name: item.trim(), is_mandatory: true }
          : item && typeof item === "object" && item.name
            ? { name: String(item.name).trim(), description: item.description ?? null, is_mandatory: item.is_mandatory !== false }
            : null
      )
      .filter((d) => d && d.name);
  }
  return String(value)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => ({ name, is_mandatory: true }));
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((header) => String(header || "").trim());
  const dataRows = rows.slice(1).filter((r) => r.some((v) => String(v || "").trim() !== ""));

  return dataRows.map((dataRow) => {
    const record = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = (dataRow[index] || "").trim();
    });
    return record;
  });
}

export function parseBulkFile(file) {
  const ext = file?.name?.split(".").pop()?.toLowerCase();
  if (!file) throw new Error("Choose a file to continue.");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        if (ext === "json") {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            throw new Error("JSON upload must be an array of records.");
          }
          resolve(parsed.filter((item) => item && typeof item === "object"));
          return;
        }
        if (ext === "csv") {
          resolve(parseCsv(raw));
          return;
        }
        reject(new Error("Only .csv and .json files are supported."));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Invalid upload file."));
      }
    };
    reader.readAsText(file);
  });
}

export function toCsv(headers, rows) {
  const escapeCsv = (value) => {
    let str = value === undefined || value === null ? "" : String(value);
    // Neutralize spreadsheet formula injection: a cell starting with = + - @
    // (or tab/CR) is evaluated as a formula by Excel/Sheets. Prefix a single
    // quote so it's read as text.
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    if (!/[",\n\r]/.test(str)) return str;
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines = [headers.map(escapeCsv).join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsv(row?.[header] ?? "")).join(","));
  });
  return lines.join("\n");
}
