import { USERNAME_MAX_LENGTH } from "./constants";

/**
 * Normalize a full name into username-safe tokens.
 * - lowercase
 * - strip anything that is not a-z0-9 (spaces, punctuation, etc.)
 * - produce word tokens (before stripping, split on whitespace)
 */
function toWordTokens(fullName: string): string[] {
  return fullName
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter((word) => word.length > 0);
}

/**
 * Generate a base username from full name.
 * Rule: lowercase, no spaces. If result > 20 chars, drop trailing words
 * until the result is <= 20 chars. If even the first word alone is too long,
 * hard-truncate it to 20 chars.
 */
export function generateBaseUsername(fullName: string): string {
  const tokens = toWordTokens(fullName);
  if (tokens.length === 0) {
    throw new Error("Full name must contain at least one alphanumeric character");
  }

  const words = [...tokens];
  while (words.length > 1) {
    const candidate = words.join("");
    if (candidate.length <= USERNAME_MAX_LENGTH) return candidate;
    words.pop();
  }

  // single word left
  return words[0].slice(0, USERNAME_MAX_LENGTH);
}

/**
 * Generate a unique username by appending a numeric suffix when base collides.
 * e.g. "dea" -> "dea2", "dea3", ...
 * @param isTaken predicate that checks if a candidate username already exists.
 */
export async function generateUniqueUsername(
  fullName: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = generateBaseUsername(fullName);
  if (!(await isTaken(base))) return base;

  // Reserve room for suffix by trimming the base first.
  for (let n = 2; n < 10_000; n++) {
    const suffix = String(n);
    const trimmed = base.slice(0, USERNAME_MAX_LENGTH - suffix.length);
    const candidate = `${trimmed}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error("Could not generate a unique username after 10000 attempts");
}
