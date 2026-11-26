/** Replace a secret in text, and in every string of a JSON-like value. */
function ordered(secrets: readonly string[]): string[] {
  return secrets.filter(Boolean).sort((a, b) => b.length - a.length);
}

export function maskText(text: string, secrets: readonly string[]): string {
  for (const secret of ordered(secrets)) text = text.split(secret).join("[REDACTED]");
  return text;
}

/**
 * Mask before serialization. Redacting a finished JSON string misses secrets
 * whose quotes, backslashes or newlines JSON.stringify has escaped.
 */
export function maskSecretsDeep(value: unknown, secrets: readonly string[]): unknown {
  const active = ordered(secrets);
  if (!active.length) return value;
  const walk = (item: unknown): unknown => {
    if (typeof item === "string") return maskText(item, active);
    if (Array.isArray(item)) return item.map(walk);
    if (item && typeof item === "object") {
      // Only rebuild plain JSON objects; preserving Date/Map/etc. avoids
      // turning them into empty objects when secrets are active.
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null) return item;
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [maskText(key, active), walk(entry)]),
      );
    }
    return item;
  };
  return walk(value);
}
