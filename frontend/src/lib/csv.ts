export function toCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) =>
    headers
      .map((header) => escapeCell(row[header]))
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

function escapeCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

