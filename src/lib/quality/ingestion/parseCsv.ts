export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
};

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  const s = normalizeNewlines(text);

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          field += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      pushField();
      continue;
    }

    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  pushField();
  pushRow();

  const last = rows[rows.length - 1];
  if (last && last.length === 1 && last[0] === "") {
    rows.pop();
  }

  return rows;
}

export function parseCsv(args: { text: string; delimiter?: string }): ParsedCsv {
  const delimiter = args.delimiter ?? ",";
  const errors: string[] = [];

  const grid = parseCsvRows(args.text, delimiter);
  if (grid.length === 0) {
    return { headers: [], rows: [], errors: ["Empty CSV"] };
  }

  const rawHeaders = grid[0] ?? [];
  const headers = rawHeaders.map((h, idx) => {
    const trimmed = (h ?? "").trim();
    return trimmed || `col_${idx + 1}`;
  });

  const seen = new Map<string, number>();
  const uniqHeaders = headers.map((h) => {
    const c = seen.get(h) ?? 0;
    seen.set(h, c + 1);
    if (c === 0) return h;
    return `${h}_${c + 1}`;
  });

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const line = grid[r] ?? [];
    const obj: Record<string, string> = {};
    for (let c = 0; c < uniqHeaders.length; c++) {
      obj[uniqHeaders[c] ?? `col_${c + 1}`] = (line[c] ?? "").trim();
    }

    const allEmpty = Object.values(obj).every((v) => v === "");
    if (allEmpty) continue;

    rows.push(obj);
  }

  if (rows.length === 0) {
    errors.push("No data rows");
  }

  return { headers: uniqHeaders, rows, errors };
}
