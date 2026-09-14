// Minimal CSV helpers - just enough to round-trip simple one-line-per-row data (player names and
// prices). Not a full CSV parser: quoted fields with embedded newlines aren't supported, since
// none of the data this touches (player names, numeric prices) can contain a literal newline.

export function escapeCsvField(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Splits one CSV line into fields, honoring double-quoted fields (with "" as an escaped quote).
export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// Splits full CSV text into non-empty lines, dropping the header row.
export function parseCsvRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .slice(1)
    .map(parseCsvLine);
}

export function downloadCsv(filename, header, rows) {
  const lines = [header.map(escapeCsvField).join(','), ...rows.map(row => row.map(escapeCsvField).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
