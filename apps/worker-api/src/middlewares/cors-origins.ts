/** `null` means permissive mode (any origin). */
export function parseCorsOrigins(value: string | undefined): string[] | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : null;
}
