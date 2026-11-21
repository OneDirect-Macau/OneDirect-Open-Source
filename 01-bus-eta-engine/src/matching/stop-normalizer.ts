export function normalizeStopCode(value: string): string {
  const compact = value
    .trim()
    .toUpperCase()
    .replace(/\s+/gu, "");
  const beforeSlash = compact.split("/")[0]!;
  const beforeHyphen = beforeSlash.split("-")[0]!;

  // D101-2 and D101/2 are lane suffixes; D-204 uses the hyphen inside the code.
  if (/^[A-Z]+\d{2,}$/u.test(beforeHyphen)) return beforeHyphen;
  return beforeSlash.replace(/-/gu, "");
}

export function normalizeStopName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll("／", "/")
    .replace(/[\s_-]+/gu, " ")
    .replace(/\s*\/\s*/gu, "/");
}
