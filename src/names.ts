export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function titleCaseName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function canonicalName(value: string, existingNames: string[]) {
  const normalized = normalizeName(value);
  return existingNames.find((name) => normalizeName(name) === normalized) || titleCaseName(value);
}

export function uniqueCanonicalNames(values: string[]) {
  const map = new Map<string, string>();
  values.forEach((value) => {
    const clean = titleCaseName(value || "");
    if (!clean) return;
    const key = normalizeName(clean);
    if (!map.has(key)) map.set(key, clean);
  });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

export function suggestNames(input: string, names: string[], limit = 6) {
  const q = normalizeName(input);
  if (!q) return names.slice(0, limit);
  return names
    .filter((name) => normalizeName(name).includes(q))
    .slice(0, limit);
}
