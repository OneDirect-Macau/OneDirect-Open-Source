export function normalizeSearchQuery(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replaceAll("／", "/")
    .replace(/[\s_-]+/gu, "");
}
