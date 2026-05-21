const CALL_UP_PATTERN = /^NYSC-[A-Z]{2,4}-\d{4}-\d{6}$/;

export function normalizeCallUpNumber(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\//g, "-");
}

export function isValidCallUpFormat(normalized: string): boolean {
  return CALL_UP_PATTERN.test(normalized);
}

export function normalizeNin(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 11);
}

export function isValidNin(nin: string): boolean {
  return /^\d{11}$/.test(nin);
}
